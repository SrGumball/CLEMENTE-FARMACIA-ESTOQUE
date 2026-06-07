use rusqlite::{params, Connection};
use serde_json::Value;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;

pub struct DbState(pub Mutex<Connection>);

pub fn init(app: AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("pharmacy.db");
    
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // Run migrations
    let migration_sql = include_str!("../migrations.sql");
    conn.execute_batch(migration_sql).map_err(|e| e.to_string())?;

    // Check for missing columns in existing tables (manual migration for existing installs)
    let tables_to_check = vec![
        ("Medicamento", "codigo", "TEXT"),
        ("Medicamento", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("Lote", "medicamento_nome", "TEXT"),
        ("Lote", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("Entrada", "medicamento_nome", "TEXT"),
        ("Entrada", "fornecedor_nome", "TEXT"),
        ("Entrada", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("Saida", "medicamento_nome", "TEXT"),
        ("Saida", "ala_nome", "TEXT"),
        ("Saida", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
    ];

    for (table, column, col_type) in tables_to_check {
        let check_query = format!("SELECT 1 FROM pragma_table_info('{}') WHERE name = '{}'", table, column);
        let has_column = conn.prepare(&check_query)
            .map_err(|e| format!("Error checking column {} in {}: {}", column, table, e))?
            .exists([])
            .map_err(|e| format!("Error checking existence of {} in {}: {}", column, table, e))?;

        if !has_column {
            let alter_query = format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, col_type);
            conn.execute(&alter_query, [])
                .map_err(|e| format!("Error adding column {} to {}: {}", column, table, e))?;
            println!("Added missing column {} to table {}", column, table);
        }
    }
    
    Ok(conn)
}

#[tauri::command]
pub async fn list_entities(
    state: tauri::State<'_, DbState>,
    name: String,
    order_by: Option<String>,
) -> Result<Vec<Value>, String> {
    let conn = state.0.lock().unwrap();
    
    // Sanitize order_by (simple check)
    let order_clause = match order_by {
        Some(o) if o.starts_with('-') => format!("ORDER BY {} DESC", &o[1..]),
        Some(o) => format!("ORDER BY {}", o),
        None => "".to_string(),
    };
    
    // For local SQLite, we map "created_date" to "created_at"
    let order_clause = order_clause.replace("created_date", "created_at");

    let query = format!("SELECT * FROM {} {}", name, order_clause);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let column_names: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|n| n.to_string())
        .collect();

    let rows = stmt.query_map([], |row| {
        let mut map = serde_json::Map::new();
        for (i, name) in column_names.iter().enumerate() {
            let val: Value = match row.get_ref(i).unwrap() {
                rusqlite::types::ValueRef::Null => Value::Null,
                rusqlite::types::ValueRef::Integer(i) => Value::from(i),
                rusqlite::types::ValueRef::Real(r) => Value::from(r),
                rusqlite::types::ValueRef::Text(t) => Value::from(String::from_utf8_lossy(t)),
                rusqlite::types::ValueRef::Blob(b) => Value::from(format!("{:?}", b)),
            };
            map.insert(name.clone(), val);
        }
        Ok(Value::Object(map))
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(results)
}

#[tauri::command]
pub async fn create_entity(
    state: tauri::State<'_, DbState>,
    name: String,
    mut data: Value,
) -> Result<Value, String> {
    println!("Creating entity {} with data: {:?}", name, data);
    let mut conn = state.0.lock().unwrap();
    
    // Check if ID is provided, otherwise generate one
    let final_id = if let Some(id_val) = data.get("id") {
        if let Some(s) = id_val.as_str() {
            if !s.is_empty() {
                s.to_string()
            } else {
                Uuid::new_v4().to_string()
            }
        } else {
            Uuid::new_v4().to_string()
        }
    } else {
        Uuid::new_v4().to_string()
    };

    if let Value::Object(ref mut map) = data {
        map.insert("id".to_string(), Value::String(final_id));
    } else {
        return Err("Invalid data format".to_string());
    }

    let obj = data.as_object().unwrap();
    let keys: Vec<&String> = obj.keys().collect();
    let columns = keys.iter().map(|k| k.as_str()).collect::<Vec<&str>>().join(", ");
    let placeholders = keys.iter().map(|_| "?").collect::<Vec<&str>>().join(", ");
    
    let query = format!("INSERT INTO {} ({}) VALUES ({})", name, columns, placeholders);
    
    let tx = conn.transaction().map_err(|e| {
        println!("Transaction error: {}", e);
        e.to_string()
    })?;
    {
        let mut stmt = tx.prepare(&query).map_err(|e| {
            println!("Prepare error: {} | Query: {}", e, query);
            e.to_string()
        })?;
        let values: Vec<rusqlite::types::Value> = keys.iter().map(|k| {
            match &obj[*k] {
                Value::Null => rusqlite::types::Value::Null,
                Value::Bool(b) => rusqlite::types::Value::Integer(if *b { 1 } else { 0 }),
                Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        rusqlite::types::Value::Integer(i)
                    } else {
                        rusqlite::types::Value::Real(n.as_f64().unwrap())
                    }
                }
                Value::String(s) => rusqlite::types::Value::Text(s.clone()),
                _ => rusqlite::types::Value::Text(obj[*k].to_string()),
            }
        }).collect();
        
        stmt.execute(rusqlite::params_from_iter(values)).map_err(|e| {
            println!("Execute error: {} | Data: {:?}", e, obj);
            e.to_string()
        })?;
    }

    // Business Logic: Stock updates
    if name == "Entrada" {
        // Find or Create Lote and Update Medicamento Stock is handled in the frontend logic currently, 
        // but we should eventually move it here for atomicity.
        // For now, we follow the frontend pattern where it calls multiple updates.
    }

    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(data)
}

#[tauri::command]
pub async fn update_entity(
    state: tauri::State<'_, DbState>,
    name: String,
    id: String,
    data: Value,
) -> Result<Value, String> {
    let conn = state.0.lock().unwrap();
    
    let obj = data.as_object().ok_or("Invalid data format")?;
    let keys: Vec<&String> = obj.keys().collect();
    let set_clause = keys.iter().map(|k| format!("{} = ?", k)).collect::<Vec<String>>().join(", ");
    
    let query = format!("UPDATE {} SET {} WHERE id = ?", name, set_clause);
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let mut values: Vec<rusqlite::types::Value> = keys.iter().map(|k| {
        match &obj[*k] {
            Value::Null => rusqlite::types::Value::Null,
            Value::Bool(b) => rusqlite::types::Value::Integer(if *b { 1 } else { 0 }),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    rusqlite::types::Value::Integer(i)
                } else {
                    rusqlite::types::Value::Real(n.as_f64().unwrap())
                }
            }
            Value::String(s) => rusqlite::types::Value::Text(s.clone()),
            _ => rusqlite::types::Value::Text(obj[*k].to_string()),
        }
    }).collect();
    
    values.push(rusqlite::types::Value::Text(id));
    
    stmt.execute(rusqlite::params_from_iter(values)).map_err(|e| e.to_string())?;
    
    Ok(data)
}

#[tauri::command]
pub async fn delete_entity(
    state: tauri::State<'_, DbState>,
    name: String,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    let query = format!("DELETE FROM {} WHERE id = ?", name);
    conn.execute(&query, params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn clear_all_data(
    state: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // We must delete from child tables first to avoid foreign key constraint violations
    let tables = vec![
        "InventarioItem",
        "Inventario",
        "Emprestimo",
        "Saida",
        "Entrada",
        "Lote",
        "Medicamento",
        "Ala",
        "Fornecedor",
        "Categoria"
    ];
    
    for table in tables {
        let query = format!("DELETE FROM {}", table);
        tx.execute(&query, []).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_lote_cascade(
    state: tauri::State<'_, DbState>,
    lote_id: String,
) -> Result<(), String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Cascade delete related records
    // InventarioItem
    tx.execute("DELETE FROM InventarioItem WHERE lote_id = ?", params![lote_id])
        .map_err(|e| e.to_string())?;
    // Emprestimo
    tx.execute("DELETE FROM Emprestimo WHERE lote_id = ?", params![lote_id])
        .map_err(|e| e.to_string())?;
    // Saida
    tx.execute("DELETE FROM Saida WHERE lote_id = ?", params![lote_id])
        .map_err(|e| e.to_string())?;
    // Entrada
    tx.execute("DELETE FROM Entrada WHERE lote_id = ?", params![lote_id])
        .map_err(|e| e.to_string())?;

    // Delete Lote
    tx.execute("DELETE FROM Lote WHERE id = ?", params![lote_id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_medicamento_cascade(
    state: tauri::State<'_, DbState>,
    medicamento_id: String,
) -> Result<(), String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Get all lotes to delete their dependencies
    let lote_ids: Vec<String> = {
        let mut stmt = tx.prepare("SELECT id FROM Lote WHERE medicamento_id = ?").map_err(|e| e.to_string())?;
        let ids: Vec<String> = stmt.query_map(params![medicamento_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();
        ids
    };

    for lote_id in lote_ids {
        tx.execute("DELETE FROM InventarioItem WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Emprestimo WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Saida WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Entrada WHERE lote_id = ?", params![lote_id]).map_err(|e| e.to_string())?;
    }

    // Also delete any dangling records linked directly to the medication without a lote
    tx.execute("DELETE FROM InventarioItem WHERE medicamento_id = ?", params![medicamento_id]).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM Emprestimo WHERE medicamento_id = ?", params![medicamento_id]).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM Saida WHERE medicamento_id = ?", params![medicamento_id]).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM Entrada WHERE medicamento_id = ?", params![medicamento_id]).map_err(|e| e.to_string())?;

    // Delete all Lotes
    tx.execute("DELETE FROM Lote WHERE medicamento_id = ?", params![medicamento_id]).map_err(|e| e.to_string())?;

    // Delete Medicamento
    tx.execute("DELETE FROM Medicamento WHERE id = ?", params![medicamento_id]).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn bulk_cleanup(
    state: tauri::State<'_, DbState>,
    months_old: i64,
) -> Result<usize, String> {
    let mut conn = state.0.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // We want to delete:
    // 1. Lotes older than X months AND (quantidade_atual <= 0 OR status = 'vencido')
    // 2. Medicamentos older than X months AND estoque_atual <= 0 AND has no active lotes

    // Safely parse date minus X months
    let cutoff_date = chrono::Local::now() - chrono::Duration::days(months_old * 30);
    let cutoff_str = cutoff_date.format("%Y-%m-%d %H:%M:%S").to_string();

    let mut deleted_count = 0;

    // --- STEP 1: Delete eligible Lotes ---
    let lote_ids: Vec<String> = {
        let mut stmt = tx.prepare("
            SELECT id FROM Lote 
            WHERE created_at < ? AND (quantidade_atual <= 0 OR status = 'vencido' OR data_validade < date('now'))
        ").map_err(|e| e.to_string())?;
        
        let ids: Vec<String> = stmt.query_map(params![cutoff_str], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();
        ids
    };

    for lote_id in lote_ids {
        tx.execute("DELETE FROM InventarioItem WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Emprestimo WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Saida WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Entrada WHERE lote_id = ?", params![lote_id.clone()]).map_err(|e| e.to_string())?;
        
        let deleted = tx.execute("DELETE FROM Lote WHERE id = ?", params![lote_id]).map_err(|e| e.to_string())?;
        deleted_count += deleted;
    }

    // --- STEP 2: Delete eligible Medicamentos ---
    // A medication is eligible if: older than cutoff, 0 stock, AND no remaining lotes
    let med_ids: Vec<String> = {
        let mut stmt = tx.prepare("
            SELECT m.id FROM Medicamento m 
            LEFT JOIN Lote l ON m.id = l.medicamento_id
            WHERE m.created_at < ? AND m.estoque_atual <= 0 
            GROUP BY m.id
            HAVING COUNT(l.id) = 0
        ").map_err(|e| e.to_string())?;

        let ids: Vec<String> = stmt.query_map(params![cutoff_str], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();
        ids
    };

    for med_id in med_ids {
        tx.execute("DELETE FROM InventarioItem WHERE medicamento_id = ?", params![med_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Emprestimo WHERE medicamento_id = ?", params![med_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Saida WHERE medicamento_id = ?", params![med_id.clone()]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM Entrada WHERE medicamento_id = ?", params![med_id.clone()]).map_err(|e| e.to_string())?;
        
        let deleted = tx.execute("DELETE FROM Medicamento WHERE id = ?", params![med_id]).map_err(|e| e.to_string())?;
        deleted_count += deleted;
    }

    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(deleted_count)
}

#[tauri::command]
pub async fn backup_database(
    app: AppHandle,
    state: tauri::State<'_, DbState>,
    dest_path: String,
) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("pharmacy.db");
    
    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    let months = vec![
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    
    let now = chrono::Local::now();
    let day = now.format("%d").to_string();
    let month_idx = now.format("%m").to_string().parse::<usize>().unwrap() - 1;
    let month_name = months[month_idx];
    let year = now.format("%Y").to_string();
    
    let file_name = format!("backup {} {} {}.db", day, month_name, year);
    let dest_file = std::path::Path::new(&dest_path).join(file_name);
    
    std::fs::copy(&db_path, &dest_file).map_err(|e| e.to_string())?;
    
    // Update last_backup_date in Config table
    let conn = state.0.lock().unwrap();
    let now = chrono::Local::now().format("%Y-%m-%d").to_string();
    conn.execute(
        "INSERT OR REPLACE INTO Config (key, value) VALUES ('last_backup_date', ?)",
        params![now],
    ).map_err(|e| e.to_string())?;

    Ok(dest_file.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_backup(
    app: AppHandle,
    state: tauri::State<'_, DbState>,
    backup_path: String,
) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("pharmacy.db");
    
    let backup_file = std::path::Path::new(&backup_path);
    if !backup_file.exists() {
        return Err("Backup file not found".to_string());
    }

    // Lock the state to ensure no other operations are happening
    let mut conn_guard = state.0.lock().unwrap();
    
    // Copy backup over current database
    std::fs::copy(&backup_path, &db_path).map_err(|e| e.to_string())?;
    
    // Reopen connection to the restored database
    let new_conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Run migrations on the restored database (creates tables if missing)
    let migration_sql = include_str!("../migrations.sql");
    new_conn.execute_batch(migration_sql).map_err(|e| e.to_string())?;

    // Add any missing columns (for backups created with older versions)
    let tables_to_check = vec![
        ("Medicamento", "codigo", "TEXT"),
        ("Medicamento", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("Lote", "medicamento_nome", "TEXT"),
        ("Lote", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("Entrada", "medicamento_nome", "TEXT"),
        ("Entrada", "fornecedor_nome", "TEXT"),
        ("Entrada", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ("Saida", "medicamento_nome", "TEXT"),
        ("Saida", "ala_nome", "TEXT"),
        ("Saida", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
    ];

    for (table, column, col_type) in tables_to_check {
        let check_query = format!("SELECT 1 FROM pragma_table_info('{}') WHERE name = '{}'", table, column);
        let has_column = new_conn.prepare(&check_query)
            .map_err(|e| format!("Error checking column {} in {}: {}", column, table, e))?
            .exists([])
            .map_err(|e| format!("Error checking existence of {} in {}: {}", column, table, e))?;

        if !has_column {
            let alter_query = format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, col_type);
            new_conn.execute(&alter_query, [])
                .map_err(|e| format!("Error adding column {} to {}: {}", column, table, e))?;
            println!("Added missing column {} to table {}", column, table);
        }
    }

    // Swap the connection
    *conn_guard = new_conn;

    Ok(())
}

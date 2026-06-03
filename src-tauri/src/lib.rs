mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let handle = app.handle().clone();
      let conn = db::init(handle)?;
      app.manage(db::DbState(std::sync::Mutex::new(conn)));
      
      if let Some(window) = app.get_webview_window("main") {
          let _ = window.maximize();
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      db::list_entities,
      db::create_entity,
      db::update_entity,
      db::delete_entity,
      db::clear_all_data,
      db::delete_lote_cascade,
      db::delete_medicamento_cascade,
      db::bulk_cleanup,
      db::backup_database,
      db::import_backup
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

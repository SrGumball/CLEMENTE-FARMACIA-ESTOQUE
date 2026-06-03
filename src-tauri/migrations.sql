-- Create tables for the pharmacy system

CREATE TABLE IF NOT EXISTS Categoria (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Fornecedor (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    contato TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Ala (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    responsavel TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Medicamento (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT,
    principio_ativo TEXT,
    categoria TEXT,
    categoria_id TEXT,
    apresentacao TEXT,
    dosagem TEXT,
    unidade_medida TEXT,
    estoque_minimo INTEGER DEFAULT 0,
    estoque_atual INTEGER DEFAULT 0,
    markup REAL DEFAULT 0,
    valor_venda REAL DEFAULT 0,
    codigo_barras TEXT,
    localizacao TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Lote (
    id TEXT PRIMARY KEY,
    medicamento_id TEXT NOT NULL,
    medicamento_nome TEXT,
    numero_lote TEXT NOT NULL,
    data_validade DATE NOT NULL,
    quantidade_inicial INTEGER NOT NULL,
    quantidade_atual INTEGER NOT NULL,
    valor_unitario REAL,
    fornecedor_id TEXT,
    status TEXT DEFAULT 'disponivel', -- disponivel, esgotado, vencido
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicamento_id) REFERENCES Medicamento(id),
    FOREIGN KEY (fornecedor_id) REFERENCES Fornecedor(id)
);

CREATE TABLE IF NOT EXISTS Entrada (
    id TEXT PRIMARY KEY,
    medicamento_id TEXT NOT NULL,
    medicamento_nome TEXT,
    lote_id TEXT NOT NULL,
    numero_lote TEXT,
    data_validade DATE,
    data_entrada DATE NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario REAL,
    valor_total REAL,
    nota_fiscal TEXT,
    fornecedor_id TEXT,
    fornecedor_nome TEXT,
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicamento_id) REFERENCES Medicamento(id),
    FOREIGN KEY (lote_id) REFERENCES Lote(id),
    FOREIGN KEY (fornecedor_id) REFERENCES Fornecedor(id)
);

CREATE TABLE IF NOT EXISTS Saida (
    id TEXT PRIMARY KEY,
    medicamento_id TEXT NOT NULL,
    medicamento_nome TEXT,
    lote_id TEXT NOT NULL,
    numero_lote TEXT,
    data_saida DATE NOT NULL,
    quantidade INTEGER NOT NULL,
    destino TEXT, -- ala_id or custom string
    ala_id TEXT,
    ala_nome TEXT,
    motivo TEXT,
    responsavel TEXT,
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicamento_id) REFERENCES Medicamento(id),
    FOREIGN KEY (lote_id) REFERENCES Lote(id),
    FOREIGN KEY (ala_id) REFERENCES Ala(id)
);

CREATE TABLE IF NOT EXISTS Emprestimo (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL, -- 'emprestar' ou 'receber'
    medicamento_id TEXT NOT NULL,
    medicamento_nome TEXT,
    lote_id TEXT,
    numero_lote TEXT,
    quantidade INTEGER NOT NULL,
    ala_destino_id TEXT,
    ala_destino_nome TEXT,
    responsavel TEXT,
    data_emprestimo DATE NOT NULL,
    status TEXT DEFAULT 'pendente', -- pendente, devolvido, concluido
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicamento_id) REFERENCES Medicamento(id),
    FOREIGN KEY (lote_id) REFERENCES Lote(id),
    FOREIGN KEY (ala_destino_id) REFERENCES Ala(id)
);

CREATE TABLE IF NOT EXISTS Config (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO Config (key, value) VALUES ('last_backup_date', NULL);

CREATE TABLE IF NOT EXISTS Inventario (
    id TEXT PRIMARY KEY,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME,
    responsavel TEXT,
    status TEXT DEFAULT 'em_andamento', -- em_andamento, concluido, cancelado
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS InventarioItem (
    id TEXT PRIMARY KEY,
    inventario_id TEXT NOT NULL,
    medicamento_id TEXT NOT NULL,
    medicamento_nome TEXT,
    lote_id TEXT NOT NULL,
    numero_lote TEXT,
    quantidade_sistema INTEGER NOT NULL,
    quantidade_fisica INTEGER,
    divergencia INTEGER,
    ajustado BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventario_id) REFERENCES Inventario(id),
    FOREIGN KEY (medicamento_id) REFERENCES Medicamento(id),
    FOREIGN KEY (lote_id) REFERENCES Lote(id)
);

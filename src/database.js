const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err.message);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite com sucesso.');
    }
});

db.serialize(() => {
    // Tabela atualizada com a coluna status (Pendente por padrão)
    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario TEXT NOT NULL,
            loja TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            descricao TEXT NOT NULL,
            status TEXT DEFAULT 'Pendente',
            data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

module.exports = db;

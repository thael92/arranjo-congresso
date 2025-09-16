const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'congress_data.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tabelas
const initDB = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Tabela para dados gerais (compatibilidade com sistema antigo)
            db.run(`CREATE TABLE IF NOT EXISTS data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabela de participantes
            db.run(`CREATE TABLE IF NOT EXISTS attendees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                friday BOOLEAN DEFAULT 0,
                saturday BOOLEAN DEFAULT 0,
                sunday BOOLEAN DEFAULT 0,
                payment REAL DEFAULT 0,
                van BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabela de congregações
            db.run(`CREATE TABLE IF NOT EXISTS congregations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabela de sessões
            db.run(`CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                congregation_id INTEGER NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (congregation_id) REFERENCES congregations (id)
            )`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
};

// Wrapper para promisificar as queries
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ rows });
                }
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        rows: [], 
                        rowCount: this.changes,
                        insertId: this.lastID 
                    });
                }
            });
        }
    });
};

// Inicializar o banco
initDB().catch(console.error);

module.exports = { query, db };
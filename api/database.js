const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'congress_data.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tabelas
const initDB = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Tabela de eventos (congressos/assembleias)
            db.run(`CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                congregation_id INTEGER NOT NULL,
                year INTEGER NOT NULL,
                event_type VARCHAR(20) NOT NULL CHECK(event_type IN ('congress', 'assembly')),
                event_name VARCHAR(100) NOT NULL,
                dates TEXT NOT NULL,
                vehicle_type VARCHAR(20) NOT NULL CHECK(vehicle_type IN ('van', 'bus')),
                seat_count INTEGER DEFAULT 16,
                attendees_data TEXT NOT NULL,
                prices TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (congregation_id) REFERENCES congregations (id)
            )`);

            // Tabela de passageiros
            db.run(`CREATE TABLE IF NOT EXISTS passengers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                amount_paid DECIMAL(10,2) DEFAULT 0,
                total_owed DECIMAL(10,2) NOT NULL,
                days_attending TEXT NOT NULL,
                payment_status VARCHAR(20) DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid')),
                seat_assigned INTEGER,
                phone VARCHAR(20),
                email VARCHAR(100),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
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
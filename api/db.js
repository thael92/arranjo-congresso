const sqlite3 = require('sqlite3').verbose();

// Abre o banco de dados em um arquivo local
const db = new sqlite3.Database('./congress_data.db', (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT
        )`);
    }
});

module.exports = db;
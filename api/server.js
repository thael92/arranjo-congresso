const express = require('express');
const cors = require('cors');
const db = require('./db.js');

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint para obter todos os dados
app.get('/api/db', (req, res) => {
    db.all("SELECT content FROM data", [], (err, rows) => {
        if (err) {
            res.status(500).send('Erro ao ler dados do banco de dados.');
            return;
        }
        const data = rows.map(row => JSON.parse(row.content));
        res.json(data);
    });
});

// Endpoint para salvar todos os dados
app.post('/api/db', (req, res) => {
    const data = req.body;

    db.serialize(() => {
        db.run("DELETE FROM data", (err) => {
            if (err) {
                res.status(500).send('Erro ao limpar dados no banco de dados.');
                return;
            }
        });

        const stmt = db.prepare("INSERT INTO data (content) VALUES (?)");
        const dataAsString = JSON.stringify(data);
        stmt.run(dataAsString, (err) => {
            if (err) {
                res.status(500).send('Erro ao salvar dados no banco de dados.');
                return;
            }
            res.status(200).send('Dados salvos com sucesso no SQLite.');
        });
        stmt.finalize();
    });
});

// Exporta o app Express para ser usado como uma função serverless
module.exports = app;

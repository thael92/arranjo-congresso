const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db.js');

const app = express();

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos da pasta raiz do projeto
app.use(express.static(path.join(__dirname, '..')));

// Endpoint para obter todos os dados
app.get('/api/db', (req, res) => {
    db.get("SELECT content FROM data ORDER BY id DESC LIMIT 1", [], (err, row) => {
        if (err) {
            res.status(500).send('Erro ao ler dados do banco de dados.');
            return;
        }
        if (row) {
            res.json(JSON.parse(row.content));
        } else {
            // Retorna um objeto padrão se não houver dados
            res.json({
                attendees: { friday: [], saturday: [], sunday: [] },
                prices: { friday: '50.00', saturday: '50.00', sunday: '50.00' }
            });
        }
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
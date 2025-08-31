const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db.js');

const app = express();

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos da pasta raiz do projeto
app.use(express.static(path.join(__dirname, '..')));

// Endpoint para obter todos os dados
app.get('/api/db', async (req, res) => {
    try {
        const result = await pool.query("SELECT content FROM data ORDER BY id DESC LIMIT 1");
        if (result.rows.length > 0) {
            res.json(JSON.parse(result.rows[0].content));
        } else {
            res.json({
                attendees: { friday: [], saturday: [], sunday: [] },
                prices: { friday: '50.00', saturday: '50.00', sunday: '50.00' }
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao ler dados do banco de dados.');
    }
});

// Endpoint para salvar todos os dados
app.post('/api/db', async (req, res) => {
    const data = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM data');
        const dataAsString = JSON.stringify(data);
        await client.query('INSERT INTO data (content) VALUES ($1)', [dataAsString]);
        await client.query('COMMIT');
        res.status(200).send('Dados salvos com sucesso no PostgreSQL.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Erro ao salvar dados no banco de dados.');
    } finally {
        client.release();
    }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

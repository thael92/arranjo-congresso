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

// Rota para obter todos os participantes
app.get('/attendees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM attendees ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para adicionar novo participante
app.post('/attendees', async (req, res) => {
    const { name, friday, saturday, sunday, payment, van } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO attendees (name, friday, saturday, sunday, payment, van) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, friday, saturday, sunday, payment, van]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar participante
app.put('/attendees/:id', async (req, res) => {
    const { id } = req.params;
    const { name, friday, saturday, sunday, payment, van } = req.body;
    try {
        const result = await pool.query(
            'UPDATE attendees SET name = $1, friday = $2, saturday = $3, sunday = $4, payment = $5, van = $6 WHERE id = $7 RETURNING *',
            [name, friday, saturday, sunday, payment, van, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para deletar participante
app.delete('/attendees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM attendees WHERE id = $1', [id]);
        res.json({ message: 'Participante removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_PATH = path.join(__dirname, '..', 'db.json');

app.use(cors());
app.use(express.json());

// GET dados
app.get('/api/db', (req, res) => {
  fs.readFile(DB_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Erro ao ler os dados.');
    res.json(JSON.parse(data));
  });
});

// POST dados
app.post('/api/db', (req, res) => {
  const dataToWrite = JSON.stringify(req.body, null, 2);
  fs.writeFile(DB_PATH, dataToWrite, 'utf8', (err) => {
    if (err) return res.status(500).send('Erro ao salvar os dados.');
    res.status(200).send('Dados salvos com sucesso.');
  });
});

// Exporta como função para Vercel
module.exports = app;

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Endpoint para obter todos os dados
app.get('/db', (req, res) => {
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading database file.');
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint para salvar todos os dados
app.post('/db', (req, res) => {
    const dataToWrite = JSON.stringify(req.body, null, 2);
    fs.writeFile(DB_PATH, dataToWrite, 'utf8', (err) => {
        if (err) {
            return res.status(500).send('Error writing to database file.');
        }
        res.status(200).send('Data saved successfully.');
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Database server is running on http://0.0.0.0:${PORT}`);
});

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method === 'GET') {
    try {
      const data = await kv.get('congressData');
      return response.status(200).json(data);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  } else if (request.method === 'POST') {
    try {
      const newData = request.body;
      await kv.set('congressData', newData);
      return response.status(200).json({ message: 'Data saved successfully.' });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  } else {
    return response.status(405).json({ message: 'Method not allowed.' });
  }
}
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
    if (err) return res.status(500).send('Error reading database file.');
    res.json(JSON.parse(data));
  });
});

// POST dados
app.post('/api/db', (req, res) => {
  const dataToWrite = JSON.stringify(req.body, null, 2);
  fs.writeFile(DB_PATH, dataToWrite, 'utf8', (err) => {
    if (err) return res.status(500).send('Error writing to database file.');
    res.status(200).send('Data saved successfully.');
  });
});

module.exports = app;

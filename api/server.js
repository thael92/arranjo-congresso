const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Conexão com o MongoDB Atlas
// A string de conexão deve ser armazenada em uma variável de ambiente por segurança
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://thael92:<db_password>@cluster0.cptaabj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB Atlas'))
.catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

// Definição do Schema e Modelo para os dados
// Assumindo que seus dados em db.json são um array de objetos,
// vamos criar um schema flexível para armazená-los.
// Se você tiver uma estrutura de dados mais específica, podemos ajustá-la.
const DataSchema = new mongoose.Schema({}, { strict: false }); // Schema flexível
const DataModel = mongoose.model('Data', DataSchema);

app.use(cors());
app.use(express.json());

// Endpoint para obter todos os dados
app.get('/api/db', async (req, res) => {
    try {
        const data = await DataModel.find({});
        res.json(data);
    } catch (err) {
        console.error('Erro ao ler dados do MongoDB:', err);
        res.status(500).send('Erro ao ler dados do banco de dados.');
    }
});

// Endpoint para salvar todos os dados
app.post('/api/db', async (req, res) => {
    try {
        // Limpa a coleção e insere os novos dados
        await DataModel.deleteMany({}); // Remove todos os documentos existentes
        await DataModel.insertMany(req.body); // Insere os novos dados
        res.status(200).send('Dados salvos com sucesso no MongoDB.');
    } catch (err) {
        console.error('Erro ao salvar dados no MongoDB:', err);
        res.status(500).send('Erro ao salvar dados no banco de dados.');
    }
});

// Exporta o app Express para ser usado como uma função serverless
module.exports = app;
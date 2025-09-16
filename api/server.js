const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('./database.js');

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-segura';

// Serve os arquivos estáticos da pasta raiz do projeto
app.use(express.static(path.join(__dirname, '..')));

// Endpoint para obter todos os dados
app.get('/api/db', async (req, res) => {
    try {
        const result = await query("SELECT content FROM data ORDER BY id DESC LIMIT 1");
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
    try {
        await query('DELETE FROM data');
        const dataAsString = JSON.stringify(data);
        await query('INSERT INTO data (content) VALUES (?)', [dataAsString]);
        res.status(200).send('Dados salvos com sucesso no SQLite.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao salvar dados no banco de dados.');
    }
});

// Rota para obter todos os participantes
app.get('/attendees', async (req, res) => {
    try {
        const result = await query('SELECT * FROM attendees ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para adicionar novo participante
app.post('/attendees', async (req, res) => {
    const { name, friday, saturday, sunday, payment, van } = req.body;
    try {
        const result = await query(
            'INSERT INTO attendees (name, friday, saturday, sunday, payment, van) VALUES (?, ?, ?, ?, ?, ?)',
            [name, friday, saturday, sunday, payment, van]
        );
        const newAttendee = await query('SELECT * FROM attendees WHERE id = ?', [result.insertId]);
        res.json(newAttendee.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar participante
app.put('/attendees/:id', async (req, res) => {
    const { id } = req.params;
    const { name, friday, saturday, sunday, payment, van } = req.body;
    try {
        await query(
            'UPDATE attendees SET name = ?, friday = ?, saturday = ?, sunday = ?, payment = ?, van = ? WHERE id = ?',
            [name, friday, saturday, sunday, payment, van, id]
        );
        const updatedAttendee = await query('SELECT * FROM attendees WHERE id = ?', [id]);
        res.json(updatedAttendee.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para deletar participante
app.delete('/attendees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM attendees WHERE id = ?', [id]);
        res.json({ message: 'Participante removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const session = await query('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")', [token]);
        
        if (session.rows.length === 0) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }

        req.congregation = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Rota de cadastro de congregação
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    try {
        // Verificar se o email já existe
        const existingCongregation = await query('SELECT id FROM congregations WHERE email = ?', [email]);
        if (existingCongregation.rows.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(password, 10);

        // Inserir nova congregação
        const result = await query(
            'INSERT INTO congregations (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );

        res.status(201).json({ 
            message: 'Congregação cadastrada com sucesso',
            congregationId: result.insertId 
        });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        // Buscar congregação
        const congregation = await query('SELECT * FROM congregations WHERE email = ?', [email]);
        if (congregation.rows.length === 0) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        const congregationData = congregation.rows[0];

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, congregationData.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                congregationId: congregationData.id, 
                email: congregationData.email,
                name: congregationData.name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Salvar sessão no banco
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await query(
            'INSERT INTO sessions (congregation_id, token, expires_at) VALUES (?, ?, ?)',
            [congregationData.id, token, expiresAt.toISOString()]
        );

        res.json({
            message: 'Login realizado com sucesso',
            token,
            congregation: {
                id: congregationData.id,
                name: congregationData.name,
                email: congregationData.email
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de logout
app.post('/api/logout', authenticateToken, async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];

    try {
        await query('DELETE FROM sessions WHERE token = ?', [token]);
        res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para verificar autenticação
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ congregation: req.congregation });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

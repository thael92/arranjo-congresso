require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { query } = require('./database.js');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://stackpath.bootstrapcdn.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://stackpath.bootstrapcdn.com"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Muitas tentativas. Tente novamente em alguns minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('ERRO: JWT_SECRET não está definido no arquivo .env');
    process.exit(1);
}

// Serve os arquivos estáticos da pasta raiz do projeto
app.use(express.static(path.join(__dirname, '..')));

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

// Validation middleware function
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }
    next();
};

// Validation rules
const registerValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Nome deve conter apenas letras e espaços'),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido')
        .isLength({ max: 100 })
        .withMessage('Email deve ter no máximo 100 caracteres'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Senha deve ter entre 8 e 128 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter ao menos uma letra minúscula, uma maiúscula e um número')
];

const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido'),
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória')
];

// Rota de cadastro de congregação
app.post('/api/register', authLimiter, registerValidation, handleValidationErrors, async (req, res) => {
    const { name, email, password } = req.body;

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
app.post('/api/login', authLimiter, loginValidation, handleValidationErrors, async (req, res) => {
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

// Atualizar dados da congregação
app.put('/api/me', authenticateToken, [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido'),
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
], handleValidationErrors, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const congregationId = req.congregation.congregationId;

        // Verificar se email já existe (excluindo o próprio registro)
        const existingCongregation = await query(
            'SELECT id FROM congregations WHERE email = ? AND id != ?',
            [email, congregationId]
        );

        if (existingCongregation.rows.length > 0) {
            return res.status(400).json({ error: 'Este email já está em uso por outra congregação' });
        }

        let updateQuery = 'UPDATE congregations SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        let updateValues = [name, email, congregationId];

        // Se senha foi fornecida, incluir na atualização
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery = 'UPDATE congregations SET name = ?, email = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            updateValues = [name, email, hashedPassword, congregationId];
        }

        await query(updateQuery, updateValues);

        res.json({
            id: congregationId,
            name,
            email,
            message: 'Dados atualizados com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar congregação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas para eventos
// Listar anos com eventos para a congregação
app.get('/api/events/years', authenticateToken, async (req, res) => {
    try {
        const years = await query(
            'SELECT DISTINCT year FROM events WHERE congregation_id = ? ORDER BY year DESC',
            [req.congregation.congregationId]
        );
        res.json(years.rows.map(row => row.year));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar eventos de um ano específico
app.get('/api/events/:year', authenticateToken, async (req, res) => {
    try {
        const events = await query(
            'SELECT * FROM events WHERE congregation_id = ? AND year = ? ORDER BY created_at DESC',
            [req.congregation.congregationId, req.params.year]
        );
        res.json(events.rows.map(event => ({
            ...event,
            dates: JSON.parse(event.dates),
            attendees_data: JSON.parse(event.attendees_data),
            prices: JSON.parse(event.prices)
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar novo evento
app.post('/api/events', authenticateToken, async (req, res) => {
    const { year, event_type, event_name, dates, vehicle_type, seat_count, attendees_data, prices } = req.body;

    try {
        const result = await query(
            'INSERT INTO events (congregation_id, year, event_type, event_name, dates, vehicle_type, seat_count, attendees_data, prices) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                req.congregation.congregationId,
                year,
                event_type,
                event_name,
                JSON.stringify(dates),
                vehicle_type,
                seat_count,
                JSON.stringify(attendees_data),
                JSON.stringify(prices)
            ]
        );
        res.json({ id: result.insertId, message: 'Evento criado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar evento existente
app.put('/api/events/:id', authenticateToken, async (req, res) => {
    const { attendees_data, prices } = req.body;

    try {
        await query(
            'UPDATE events SET attendees_data = ?, prices = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND congregation_id = ?',
            [JSON.stringify(attendees_data), JSON.stringify(prices), req.params.id, req.congregation.congregationId]
        );
        res.json({ message: 'Evento atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter evento específico
app.get('/api/events/event/:id', authenticateToken, async (req, res) => {
    try {
        const event = await query(
            'SELECT * FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.id, req.congregation.congregationId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const eventData = event.rows[0];
        res.json({
            ...eventData,
            dates: JSON.parse(eventData.dates),
            attendees_data: JSON.parse(eventData.attendees_data),
            prices: JSON.parse(eventData.prices)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar dados básicos do evento específico
app.put('/api/events/event/:id', authenticateToken, async (req, res) => {
    const { year, event_type, event_name, dates, vehicle_type, seat_count } = req.body;

    try {
        await query(
            'UPDATE events SET year = ?, event_type = ?, event_name = ?, dates = ?, vehicle_type = ?, seat_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND congregation_id = ?',
            [year, event_type, event_name, JSON.stringify(dates), vehicle_type, seat_count, req.params.id, req.congregation.congregationId]
        );
        res.json({ message: 'Evento atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar evento específico
app.delete('/api/events/event/:id', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            'DELETE FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.id, req.congregation.congregationId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        res.json({ message: 'Evento excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ROTAS PARA PASSAGEIROS
// ========================================

// Listar passageiros de um evento
app.get('/api/events/:eventId/passengers', authenticateToken, async (req, res) => {
    try {
        // Verifica se o evento pertence à congregação
        const event = await query(
            'SELECT * FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.eventId, req.congregation.congregationId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const passengers = await query(
            'SELECT * FROM passengers WHERE event_id = ? ORDER BY name',
            [req.params.eventId]
        );

        res.json(passengers.rows.map(passenger => ({
            ...passenger,
            days_attending: JSON.parse(passenger.days_attending)
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Adicionar passageiro
app.post('/api/events/:eventId/passengers', authenticateToken, [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('amount_paid')
        .isFloat({ min: 0 })
        .withMessage('Valor pago deve ser positivo'),
    body('total_owed')
        .isFloat({ min: 0 })
        .withMessage('Valor total deve ser positivo'),
    body('days_attending')
        .isArray({ min: 1 })
        .withMessage('Deve selecionar pelo menos um dia')
], handleValidationErrors, async (req, res) => {
    try {
        // Verifica se o evento pertence à congregação
        const event = await query(
            'SELECT * FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.eventId, req.congregation.congregationId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const { name, amount_paid, total_owed, days_attending, phone, email, notes } = req.body;

        // Determina status do pagamento
        let payment_status = 'pending';
        if (amount_paid >= total_owed) {
            payment_status = 'paid';
        } else if (amount_paid > 0) {
            payment_status = 'partial';
        }

        const result = await query(
            `INSERT INTO passengers
             (event_id, name, amount_paid, total_owed, days_attending, payment_status, phone, email, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.eventId,
                name,
                amount_paid,
                total_owed,
                JSON.stringify(days_attending),
                payment_status,
                phone || null,
                email || null,
                notes || null
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Passageiro adicionado com sucesso'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar passageiro
app.put('/api/events/:eventId/passengers/:passengerId', authenticateToken, [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('amount_paid')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Valor pago deve ser positivo'),
    body('total_owed')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Valor total deve ser positivo'),
    body('days_attending')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Deve selecionar pelo menos um dia')
], handleValidationErrors, async (req, res) => {
    try {
        // Verifica se o evento pertence à congregação
        const event = await query(
            'SELECT * FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.eventId, req.congregation.congregationId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        // Verifica se o passageiro existe no evento
        const passenger = await query(
            'SELECT * FROM passengers WHERE id = ? AND event_id = ?',
            [req.params.passengerId, req.params.eventId]
        );

        if (passenger.rows.length === 0) {
            return res.status(404).json({ error: 'Passageiro não encontrado' });
        }

        const { name, amount_paid, total_owed, days_attending, phone, email, notes, seat_assigned } = req.body;

        // Determina status do pagamento se valores foram atualizados
        let payment_status = passenger.rows[0].payment_status;
        if (amount_paid !== undefined && total_owed !== undefined) {
            if (amount_paid >= total_owed) {
                payment_status = 'paid';
            } else if (amount_paid > 0) {
                payment_status = 'partial';
            } else {
                payment_status = 'pending';
            }
        }

        const updateData = {};
        const updateValues = [];
        const setClause = [];

        if (name !== undefined) {
            setClause.push('name = ?');
            updateValues.push(name);
        }
        if (amount_paid !== undefined) {
            setClause.push('amount_paid = ?');
            updateValues.push(amount_paid);
        }
        if (total_owed !== undefined) {
            setClause.push('total_owed = ?');
            updateValues.push(total_owed);
        }
        if (days_attending !== undefined) {
            setClause.push('days_attending = ?');
            updateValues.push(JSON.stringify(days_attending));
        }
        if (phone !== undefined) {
            setClause.push('phone = ?');
            updateValues.push(phone);
        }
        if (email !== undefined) {
            setClause.push('email = ?');
            updateValues.push(email);
        }
        if (notes !== undefined) {
            setClause.push('notes = ?');
            updateValues.push(notes);
        }
        if (seat_assigned !== undefined) {
            setClause.push('seat_assigned = ?');
            updateValues.push(seat_assigned);
        }

        // Sempre atualiza o status do pagamento e updated_at
        setClause.push('payment_status = ?', 'updated_at = CURRENT_TIMESTAMP');
        updateValues.push(payment_status);

        // Adiciona condições WHERE
        updateValues.push(req.params.passengerId, req.params.eventId);

        await query(
            `UPDATE passengers SET ${setClause.join(', ')} WHERE id = ? AND event_id = ?`,
            updateValues
        );

        res.json({ message: 'Passageiro atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar passageiro
app.delete('/api/events/:eventId/passengers/:passengerId', authenticateToken, async (req, res) => {
    try {
        // Verifica se o evento pertence à congregação
        const event = await query(
            'SELECT * FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.eventId, req.congregation.congregationId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const result = await query(
            'DELETE FROM passengers WHERE id = ? AND event_id = ?',
            [req.params.passengerId, req.params.eventId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Passageiro não encontrado' });
        }

        res.json({ message: 'Passageiro excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter estatísticas do evento
app.get('/api/events/:eventId/stats', authenticateToken, async (req, res) => {
    try {
        // Verifica se o evento pertence à congregação
        const event = await query(
            'SELECT * FROM events WHERE id = ? AND congregation_id = ?',
            [req.params.eventId, req.congregation.congregationId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const eventData = event.rows[0];
        const passengers = await query(
            'SELECT * FROM passengers WHERE event_id = ?',
            [req.params.eventId]
        );

        // Calcula estatísticas por dia
        const stats = {};
        const eventDates = JSON.parse(eventData.dates);
        const prices = JSON.parse(eventData.prices);

        eventDates.forEach(dateInfo => {
            const day = dateInfo.day;
            const dayPassengers = passengers.rows.filter(p => {
                const attendingDays = JSON.parse(p.days_attending);
                return attendingDays.includes(day);
            });

            const totalCollected = dayPassengers.reduce((sum, p) => {
                const proportion = prices[day] / p.total_owed;
                return sum + (p.amount_paid * proportion);
            }, 0);

            const totalExpected = dayPassengers.length * parseFloat(prices[day]);
            const vehiclesNeeded = Math.ceil(dayPassengers.length / eventData.seat_count);

            stats[day] = {
                count: dayPassengers.length,
                totalCollected: totalCollected.toFixed(2),
                totalExpected: totalExpected.toFixed(2),
                totalPending: (totalExpected - totalCollected).toFixed(2),
                vehiclesNeeded,
                date: dateInfo.date,
                label: dateInfo.label
            };
        });

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
const { Pool } = require('pg')

const pool = new Pool({
    connectionString: 'postgresql://congress_data_user:tOtRMPTybBhMewnTPmN4G8xjTwFueutn@dpg-d2q2ntje5dus73bjna4g-a/congress_data'
})

// Criando a tabela se não existir
const createTable = async () => {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS attendees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                friday BOOLEAN DEFAULT false,
                saturday BOOLEAN DEFAULT false,
                sunday BOOLEAN DEFAULT false,
                payment NUMERIC(10,2) DEFAULT 0,
                van BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
    } catch (error) {
        console.error('Erro ao criar tabela:', error)
    } finally {
        client.release()
    }
}

createTable()

module.exports = {
    query: (text, params) => pool.query(text, params)
}

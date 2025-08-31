const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const createTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS data (
        id SERIAL PRIMARY KEY,
        content TEXT
      );
    `);
  } finally {
    client.release();
  }
};

// Cria a tabela ao iniciar a aplicação
createTable().catch(console.error);

module.exports = pool;

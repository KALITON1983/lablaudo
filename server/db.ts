import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000, // Increased to 15s for Neon cold starts
});

// Flag to prevent multiple initializations in the same instance
let isInitialized = false;

// Initialize tables
export async function initDb() {
  if (isInitialized) return;

  let client;
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is not defined. Skipping initialization.');
      return;
    }

    client = await pool.connect();

    // Split into individual queries to reduce transaction load in serverless
    const queries = [
      `CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        data_nascimento TEXT NOT NULL,
        codigo TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS exames (
        id SERIAL PRIMARY KEY,
        paciente_id INTEGER NOT NULL,
        tipo_exame TEXT NOT NULL,
        data_coleta TEXT NOT NULL,
        data_liberacao TEXT,
        status TEXT NOT NULL,
        arquivo_pdf TEXT,
        medico_responsavel TEXT,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
      )`,
      `CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome TEXT NOT NULL
      )`
    ];

    for (const q of queries) {
      await client.query(q);
    }
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// initDb() removed from top-level

export default pool;

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 8000,
};

// If no DATABASE_URL, create a dummy pool that throws helpful errors
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing! Please set it in Vercel Environment Variables.');
}

const pool = new Pool(poolConfig);

// Flag to prevent multiple initializations in the same instance
let isInitialized = false;

// Initialize tables
export async function initDb() {
  if (isInitialized) return;

  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is not defined. Skipping initialization.');
      return;
    }

    // Direct pool.query calls - more stable for serverless
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        data_nascimento TEXT NOT NULL,
        codigo TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exames (
        id SERIAL PRIMARY KEY,
        paciente_id INTEGER NOT NULL,
        tipo_exame TEXT NOT NULL,
        data_coleta TEXT NOT NULL,
        data_liberacao TEXT,
        status TEXT NOT NULL,
        arquivo_pdf TEXT,
        medico_responsavel TEXT,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome TEXT NOT NULL
      )
    `);

    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// initDb() removed from top-level

export default pool;

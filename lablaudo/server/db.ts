import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize tables
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        data_nascimento TEXT NOT NULL,
        codigo TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
      );

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
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

initDb();

export default pool;

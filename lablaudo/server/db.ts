import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('laboratorio.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    data_nascimento TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    tipo_exame TEXT NOT NULL,
    data_coleta TEXT NOT NULL,
    data_liberacao TEXT,
    status TEXT NOT NULL, -- 'Liberado', 'Em análise'
    arquivo_pdf TEXT,
    medico_responsavel TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nome TEXT NOT NULL
  );
`);

export default db;

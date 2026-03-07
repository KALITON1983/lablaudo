import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import db from "./server/db";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "lab-secret-key-123";

export async function createAppComponent() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  // Multer config for PDF uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
  const upload = multer({ storage });

  // Middleware to check auth
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Não autorizado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: "Token inválido" });
    }
  };

  // --- API Routes ---

  // Patient Login
  app.post("/api/auth/login", (req, res) => {
    const { codigo, senha } = req.body;
    const patient = db.prepare("SELECT * FROM pacientes WHERE codigo = ? AND senha = ?").get(codigo, senha) as any;

    if (patient) {
      const token = jwt.sign({ id: patient.id, role: "patient" }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
      res.json({ success: true, user: { id: patient.id, nome: patient.nome, role: "patient" } });
    } else {
      res.status(401).json({ success: false, message: "Código ou senha inválidos" });
    }
  });

  // Admin Login
  app.post("/api/auth/admin/login", (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ? AND password = ?").get(username, password) as any;

    if (admin) {
      const token = jwt.sign({ id: admin.id, role: "admin" }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
      res.json({ success: true, user: { id: admin.id, nome: admin.nome, role: "admin" } });
    } else {
      // Fallback for initial admin if no admins exist
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM admins").get() as any;
      if (adminCount.count === 0 && username === "admin" && password === "admin123") {
        const token = jwt.sign({ role: "admin" }, JWT_SECRET);
        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
        return res.json({ success: true, user: { role: "admin" } });
      }
      res.status(401).json({ success: false, message: "Credenciais administrativas inválidas" });
    }
  });

  // Admin Registration
  app.post("/api/auth/admin/register", (req, res) => {
    const { username, password, nome } = req.body;
    try {
      const info = db.prepare("INSERT INTO admins (username, password, nome) VALUES (?, ?, ?)").run(username, password, nome);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ success: false, message: "Usuário já existe" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  // Get current user info
  app.get("/api/auth/me", (req: any, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ user: null });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === "patient") {
        const patient = db.prepare("SELECT id, nome, cpf, data_nascimento, codigo FROM pacientes WHERE id = ?").get(decoded.id) as any;
        return res.json({ user: { ...patient, role: "patient" } });
      }
      if (decoded.role === "admin" && decoded.id) {
        const admin = db.prepare("SELECT id, nome, username FROM admins WHERE id = ?").get(decoded.id) as any;
        return res.json({ user: { ...admin, role: "admin" } });
      }
      return res.json({ user: { role: "admin" } });
    } catch (err) {
      res.json({ user: null });
    }
  });

  // Admin: Register Patient
  app.post("/api/admin/pacientes", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { nome, cpf, data_nascimento } = req.body;
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    const senha = Math.random().toString(36).substring(2, 8);
    try {
      const info = db.prepare("INSERT INTO pacientes (nome, cpf, data_nascimento, codigo, senha) VALUES (?, ?, ?, ?, ?)").run(nome, cpf, data_nascimento, codigo, senha);
      res.json({ success: true, id: info.lastInsertRowid, codigo, senha });
    } catch (err: any) {
      res.status(400).json({ success: false, message: "Erro ao cadastrar paciente" });
    }
  });

  // Admin: List Patients
  app.get("/api/admin/pacientes", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const search = req.query.search || "";
    const patients = db.prepare("SELECT * FROM pacientes WHERE nome LIKE ? OR cpf LIKE ?").all(`%${search}%`, `%${search}%`);
    res.json(patients);
  });

  // Admin: Register Exam
  app.post("/api/admin/exames", authenticate, upload.single("arquivo"), (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { paciente_id, tipo_exame, data_coleta, status, medico_responsavel } = req.body;
    const arquivo_pdf = req.file ? req.file.filename : null;
    const data_liberacao = status === "Liberado" ? new Date().toISOString().split('T')[0] : null;
    const info = db.prepare("INSERT INTO exames (paciente_id, tipo_exame, data_coleta, data_liberacao, status, arquivo_pdf, medico_responsavel) VALUES (?, ?, ?, ?, ?, ?, ?)").run(paciente_id, tipo_exame, data_coleta, data_liberacao, status, arquivo_pdf, medico_responsavel);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  // Admin: List All Exams
  app.get("/api/admin/exames", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const search = req.query.search || "";
    const exams = db.prepare(`
      SELECT e.*, p.nome as paciente_nome 
      FROM exames e 
      JOIN pacientes p ON e.paciente_id = p.id 
      WHERE p.nome LIKE ? OR e.tipo_exame LIKE ?
      ORDER BY e.data_coleta DESC
    `).all(`%${search}%`, `%${search}%`);
    res.json(exams);
  });

  // Admin: Update Exam
  app.put("/api/admin/exames/:id", authenticate, upload.single("arquivo"), (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { id } = req.params;
    const { tipo_exame, data_coleta, status, medico_responsavel } = req.body;
    const existingExam = db.prepare("SELECT * FROM exames WHERE id = ?").get(id) as any;
    if (!existingExam) return res.status(404).json({ message: "Exame não encontrado" });
    let arquivo_pdf = existingExam.arquivo_pdf;
    if (req.file) {
      if (existingExam.arquivo_pdf) {
        const oldPath = path.join(process.cwd(), "uploads", existingExam.arquivo_pdf);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      arquivo_pdf = req.file.filename;
    }
    const data_liberacao = status === "Liberado" ? (existingExam.data_liberacao || new Date().toISOString().split('T')[0]) : null;
    db.prepare(`
      UPDATE exames 
      SET tipo_exame = ?, data_coleta = ?, data_liberacao = ?, status = ?, arquivo_pdf = ?, medico_responsavel = ? 
      WHERE id = ?
    `).run(tipo_exame, data_coleta, data_liberacao, status, arquivo_pdf, medico_responsavel, id);
    res.json({ success: true });
  });

  // Admin: Delete Exam
  app.delete("/api/admin/exames/:id", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { id } = req.params;
    const exam = db.prepare("SELECT * FROM exames WHERE id = ?").get(id) as any;
    if (exam && exam.arquivo_pdf) {
      const filePath = path.join(process.cwd(), "uploads", exam.arquivo_pdf);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.prepare("DELETE FROM exames WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Patient: List My Exams
  app.get("/api/paciente/exames", authenticate, (req: any, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ message: "Acesso negado" });
    const exams = db.prepare("SELECT * FROM exames WHERE paciente_id = ? AND status = 'Liberado' ORDER BY data_coleta DESC").all(req.user.id);
    res.json(exams);
  });

  // Patient: Get Exam Details
  app.get("/api/paciente/exames/:id", authenticate, (req: any, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ message: "Acesso negado" });
    const exam = db.prepare("SELECT e.*, p.nome as paciente_nome FROM exames e JOIN pacientes p ON e.paciente_id = p.id WHERE e.id = ? AND e.paciente_id = ?").get(req.params.id, req.user.id) as any;
    if (!exam) return res.status(404).json({ message: "Exame não encontrado" });
    res.json(exam);
  });

  // Serve PDF securely
  app.get("/api/exames/download/:filename", authenticate, (req: any, res) => {
    const { filename } = req.params;
    if (req.user.role === "patient") {
      const exam = db.prepare("SELECT * FROM exames WHERE arquivo_pdf = ? AND paciente_id = ?").get(filename, req.user.id);
      if (!exam) return res.status(403).json({ message: "Acesso negado ao arquivo" });
    }
    const filePath = path.join(process.cwd(), "uploads", filename);
    if (fs.existsSync(filePath)) {
      if (req.query.download === "true") {
        res.download(filePath);
      } else {
        res.sendFile(filePath);
      }
    } else {
      res.status(404).send("Arquivo não encontrado");
    }
  });

  // If in production, serve static files
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api/")) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  return app;
}

// Local dev entry point
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].includes('server.ts')) {
  createAppComponent().then(async (app) => {
    const PORT = process.env.PORT || 3000;

    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

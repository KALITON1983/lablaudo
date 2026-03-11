import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import db, { initDb } from "./server/db";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "lab-secret-key-123";

export async function createAppComponent() {
  const app = express();

  // Initialize DB tables
  try {
    await initDb();
  } catch (err) {
    console.error("Critical: Failed to initialize database", err);
  }

  app.use(express.json());
  app.use(cookieParser());

  // Ensure uploads directory exists (use /tmp in Vercel/Production)
  const isProduction = process.env.NODE_ENV === "production";
  const uploadsDir = isProduction ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads");

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    console.error("Warning: Could not create uploads directory", err);
  }

  // Multer config for PDF uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
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

  // Helper to catch async errors in Express 4
  const catchAsync = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // --- API Routes ---

  // Health check and diagnostic route
  app.get("/api/health", catchAsync(async (req, res) => {
    let dbStatus = "unknown";
    let dbError = null;
    let tablesCheck: any = {};

    try {
      if (db) {
        const start = Date.now();
        await db.query("SELECT 1");
        dbStatus = "connected";

        try {
          const tablesResult = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
          tablesCheck = tablesResult.rows.map(r => r.table_name);
        } catch (e: any) {
          tablesCheck = { error: e.message };
        }
      } else {
        dbStatus = "no_pool";
      }
    } catch (err: any) {
      dbStatus = "error";
      dbError = err.message;
    }

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        urlProvided: !!process.env.DATABASE_URL,
        error: dbError,
        tables: tablesCheck
      }
    });
  }));

  // Patient Login
  app.post("/api/auth/login", catchAsync(async (req, res) => {
    const { codigo, senha } = req.body;
    const result = await db.query("SELECT * FROM pacientes WHERE codigo = $1 AND senha = $2", [codigo, senha]);
    const patient = result.rows[0];

    if (patient) {
      const token = jwt.sign({ id: patient.id, role: "patient" }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
      res.json({ success: true, user: { id: patient.id, nome: patient.nome, role: "patient" } });
    } else {
      res.status(401).json({ success: false, message: "Código ou senha inválidos" });
    }
  }));

  // Admin Login
  app.post("/api/auth/admin/login", catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const result = await db.query("SELECT * FROM admins WHERE username = $1 AND password = $2", [username, password]);
    const admin = result.rows[0];

    if (admin) {
      const token = jwt.sign({ id: admin.id, role: "admin" }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
      res.json({ success: true, user: { id: admin.id, nome: admin.nome, role: "admin" } });
    } else {
      // Fallback for initial admin if no admins exist
      const countResult = await db.query("SELECT COUNT(*) as count FROM admins");
      const adminCount = parseInt(countResult.rows[0].count);
      if (adminCount === 0 && username === "admin" && password === "admin123") {
        const token = jwt.sign({ role: "admin" }, JWT_SECRET);
        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
        return res.json({ success: true, user: { role: "admin" } });
      }
      res.status(401).json({ success: false, message: "Credenciais administrativas inválidas" });
    }
  }));

  // Admin Registration
  app.post("/api/auth/admin/register", catchAsync(async (req, res) => {
    const { username, password, nome } = req.body;
    try {
      const result = await db.query("INSERT INTO admins (username, password, nome) VALUES ($1, $2, $3) RETURNING id", [username, password, nome]);
      res.json({ success: true, id: result.rows[0].id });
    } catch (err: any) {
      console.error("Admin registration error:", err);
      if (err.code === '23505') { // PostgreSQL unique violation
        res.status(400).json({ success: false, message: "Usuário já existe" });
      } else {
        res.status(500).json({ success: false, message: `Erro no servidor: ${err.message || 'Erro desconhecido'}` });
      }
    }
  }));

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  // Get current user info
  app.get("/api/auth/me", async (req: any, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ user: null });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === "patient") {
        const result = await db.query("SELECT id, nome, cpf, data_nascimento, codigo FROM pacientes WHERE id = $1", [decoded.id]);
        const patient = result.rows[0];
        return res.json({ user: { ...patient, role: "patient" } });
      }
      if (decoded.role === "admin" && decoded.id) {
        const result = await db.query("SELECT id, nome, username FROM admins WHERE id = $1", [decoded.id]);
        const admin = result.rows[0];
        return res.json({ user: { ...admin, role: "admin" } });
      }
      return res.json({ user: { role: "admin" } });
    } catch (err) {
      res.json({ user: null });
    }
  });

  // Admin: Register Patient
  app.post("/api/admin/pacientes", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { nome, cpf, data_nascimento } = req.body;
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    const senha = Math.random().toString(36).substring(2, 8);
    try {
      const result = await db.query(
        "INSERT INTO pacientes (nome, cpf, data_nascimento, codigo, senha) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [nome, cpf, data_nascimento, codigo, senha]
      );
      res.json({ success: true, id: result.rows[0].id, codigo, senha });
    } catch (err: any) {
      res.status(400).json({ success: false, message: "Erro ao cadastrar paciente" });
    }
  });

  // Admin: List Patients
  app.get("/api/admin/pacientes", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const search = req.query.search || "";
    const result = await db.query("SELECT * FROM pacientes WHERE nome LIKE $1 OR cpf LIKE $2", [`%${search}%`, `%${search}%`]);
    res.json(result.rows);
  });

  // Admin: Register Exam
  app.post("/api/admin/exames", authenticate, upload.single("arquivo"), async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { paciente_id, tipo_exame, data_coleta, status, medico_responsavel } = req.body;
    const arquivo_pdf = req.file ? req.file.filename : null;
    const data_liberacao = status === "Liberado" ? new Date().toISOString().split('T')[0] : null;
    const result = await db.query(
      "INSERT INTO exames (paciente_id, tipo_exame, data_coleta, data_liberacao, status, arquivo_pdf, medico_responsavel) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [paciente_id, tipo_exame, data_coleta, data_liberacao, status, arquivo_pdf, medico_responsavel]
    );
    res.json({ success: true, id: result.rows[0].id });
  });

  // Admin: List All Exams
  app.get("/api/admin/exames", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const search = req.query.search || "";
    const result = await db.query(`
      SELECT e.*, p.nome as paciente_nome 
      FROM exames e 
      JOIN pacientes p ON e.paciente_id = p.id 
      WHERE p.nome LIKE $1 OR e.tipo_exame LIKE $2
      ORDER BY e.data_coleta DESC
    `, [`%${search}%`, `%${search}%`]);
    res.json(result.rows);
  });

  // Admin: Update Exam
  app.put("/api/admin/exames/:id", authenticate, upload.single("arquivo"), async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { id } = req.params;
    const { tipo_exame, data_coleta, status, medico_responsavel } = req.body;
    const existingResult = await db.query("SELECT * FROM exames WHERE id = $1", [id]);
    const existingExam = existingResult.rows[0];
    if (!existingExam) return res.status(404).json({ message: "Exame não encontrado" });
    let arquivo_pdf = existingExam.arquivo_pdf;
    if (req.file) {
      if (existingExam.arquivo_pdf) {
        const oldPath = path.join(uploadsDir, existingExam.arquivo_pdf);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (err) {
          console.error("Warning: Could not delete old PDF", err);
        }
      }
      arquivo_pdf = req.file.filename;
    }
    const data_liberacao = status === "Liberado" ? (existingExam.data_liberacao || new Date().toISOString().split('T')[0]) : null;
    await db.query(`
      UPDATE exames 
      SET tipo_exame = $1, data_coleta = $2, data_liberacao = $3, status = $4, arquivo_pdf = $5, medico_responsavel = $6 
      WHERE id = $7
    `, [tipo_exame, data_coleta, data_liberacao, status, arquivo_pdf, medico_responsavel, id]);
    res.json({ success: true });
  });

  // Admin: Delete Exam
  app.delete("/api/admin/exames/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
    const { id } = req.params;
    const result = await db.query("SELECT * FROM exames WHERE id = $1", [id]);
    const exam = result.rows[0];
    if (exam && exam.arquivo_pdf) {
      const filePath = path.join(uploadsDir, exam.arquivo_pdf);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Warning: Could not delete PDF", err);
      }
    }
    await db.query("DELETE FROM exames WHERE id = $1", [id]);
    res.json({ success: true });
  });

  // Patient: List My Exams
  app.get("/api/paciente/exames", authenticate, async (req: any, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ message: "Acesso negado" });
    const result = await db.query("SELECT * FROM exames WHERE paciente_id = $1 AND status = 'Liberado' ORDER BY data_coleta DESC", [req.user.id]);
    res.json(result.rows);
  });

  // Patient: Get Exam Details
  app.get("/api/paciente/exames/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ message: "Acesso negado" });
    const result = await db.query("SELECT e.*, p.nome as paciente_nome FROM exames e JOIN pacientes p ON e.paciente_id = p.id WHERE e.id = $1 AND e.paciente_id = $2", [req.params.id, req.user.id]);
    const exam = result.rows[0];
    if (!exam) return res.status(404).json({ message: "Exame não encontrado" });
    res.json(exam);
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Critical API Error:", err);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  });

  // Serve PDF securely
  app.get("/api/exames/download/:filename", authenticate, async (req: any, res) => {
    const { filename } = req.params;
    if (req.user.role === "patient") {
      const result = await db.query("SELECT * FROM exames WHERE arquivo_pdf = $1 AND paciente_id = $2", [filename, req.user.id]);
      const exam = result.rows[0];
      if (!exam) return res.status(403).json({ message: "Acesso negado ao arquivo" });
    }
    const filePath = path.join(uploadsDir, filename);
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

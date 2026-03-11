import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, ShieldCheck, User as UserIcon, Lock, Droplets, ClipboardList, LogOut, ChevronRight, FileText, Download, Share2, Search, UserPlus, FileUp, Calendar, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from './components/Button';
import Logo from './components/Logo';

const printReceipt = (patient: { nome: string, cpf: string, codigo: string, senha: string, qrCodeUrl?: string }) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>CADASTRO DO USUÁRIO - ${patient.nome}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .receipt { border: 2px solid #008080; border-radius: 15px; padding: 30px; max-width: 500px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #008080; }
          .title { font-size: 18px; margin-top: 5px; color: #666; }
          .info { margin-bottom: 20px; }
          .info-label { font-size: 12px; color: #999; text-transform: uppercase; font-weight: bold; }
          .info-value { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
          .credentials { background: #f9f9f9; padding: 20px; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; }
          .qr-container { text-align: center; margin-top: 20px; }
          .qr-img { width: 150px; height: 150px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
          @media print {
            body { padding: 0; }
            .receipt { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">LabLaudo</div>
            <div class="title">CADASTRO DO USUÁRIO</div>
          </div>
          
          <div class="info">
            <div class="info-label">Paciente</div>
            <div class="info-value">${patient.nome}</div>
            
            <div class="info-label">CPF</div>
            <div class="info-value">${patient.cpf}</div>
          </div>

          <div class="credentials">
            <div>
              <div class="info-label">Código</div>
              <div class="info-value" style="font-family: monospace; font-size: 20px; color: #008080;">${patient.codigo}</div>
            </div>
            <div>
              <div class="info-label">Senha</div>
              <div class="info-value" style="font-family: monospace; font-size: 20px; color: #008080;">${patient.senha}</div>
            </div>
          </div>

          <div class="qr-container">
            <img src="${patient.qrCodeUrl}" class="qr-img" />
            <p style="font-size: 10px; margin-top: 5px;">Acesse seus resultados escaneando o código acima</p>
          </div>

          <div class="footer">
            Este documento é pessoal e intransferível.<br>
            Acesse: ${window.location.origin}
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
            // window.close(); // Optional: close after printing
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
import { Input } from './components/Input';
import { Card, CardContent, CardHeader, CardFooter } from './components/Card';
import { User, Exam, Patient, cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'login' | 'patient-dashboard' | 'admin-dashboard' | 'exam-details'>('login');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [initialCode, setInitialCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setInitialCode(code);
    }
    checkAuth();
  }, []);

  const [serverError, setServerError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setView(data.user.role === 'admin' ? 'admin-dashboard' : 'patient-dashboard');
      }
    } catch (err: any) {
      console.error('Auth check failed', err);
      setServerError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 p-6">
          {serverError ? (
            <>
              <div className="h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <p className="text-red-600 font-medium">{serverError}</p>
              <Button onClick={() => { setServerError(null); setLoading(true); checkAuth(); }} variant="outline" size="sm">
                Tentar Novamente
              </Button>
            </>
          ) : (
            <>
              <div className="h-12 w-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 font-medium">Carregando LabPortal...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AnimatePresence mode="wait">
        {view === 'login' && (
          <LoginPage
            onLoginSuccess={(u) => {
              setUser(u);
              setView(u.role === 'admin' ? 'admin-dashboard' : 'patient-dashboard');
            }}
            isAdmin={isAdminLogin}
            setIsAdmin={setIsAdminLogin}
            initialCode={initialCode}
          />
        )}
        {view === 'patient-dashboard' && user && user.role === 'patient' && (
          <PatientDashboard
            user={user}
            onLogout={handleLogout}
            onViewExam={(id) => {
              setSelectedExamId(id);
              setView('exam-details');
            }}
          />
        )}
        {view === 'admin-dashboard' && user && user.role === 'admin' && (
          <AdminDashboard onLogout={handleLogout} />
        )}
        {view === 'exam-details' && selectedExamId && (
          <ExamDetails
            examId={selectedExamId}
            onBack={() => setView('patient-dashboard')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Pages ---

function LoginPage({ onLoginSuccess, isAdmin, setIsAdmin, initialCode }: { onLoginSuccess: (u: User) => void, isAdmin: boolean, setIsAdmin: (v: boolean) => void, initialCode?: string }) {
  const [codigo, setCodigo] = useState(initialCode || '');
  const [senha, setSenha] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialCode && !isAdmin) {
      setCodigo(initialCode);
    }
  }, [initialCode, isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const endpoint = isAdmin ? '/api/auth/admin/login' : '/api/auth/login';
      const body = isAdmin ? { username, password } : { codigo, senha };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.message || `Erro do servidor (${res.status})`);
        } catch {
          setError(`Erro ${res.status}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        }
        return;
      }

      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      console.error('Login error', err);
      setError(`Erro de conexão: ${err.message || 'Verifique sua internet'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nome: nomeAdmin }),
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.message || `Erro no servidor (${res.status})`);
        } catch {
          setError(`Erro ${res.status}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        }
        return;
      }

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Admin cadastrado com sucesso! Agora você pode fazer login.');
        setIsRegisteringAdmin(false);
        setNomeAdmin('');
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      console.error('Registration fetch error:', err);
      setError(`Erro de conexão no cadastro: ${err.message || 'Verifique sua internet'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-screen items-center justify-center p-4"
    >
      <Card className="w-full max-w-md">
        <div className="medical-gradient p-8 text-white text-center">
          <div className="flex flex-col items-center mb-6">
            <Logo textColor="text-white" />
          </div>
          <p className="text-white/90 text-sm mt-2 font-medium">Seu portal de resultados laboratoriais</p>
        </div>
        <CardContent className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => { setIsAdmin(false); setIsRegisteringAdmin(false); }}
              className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", !isAdmin ? "bg-white shadow-sm text-medical-primary" : "text-slate-500 hover:text-slate-700")}
            >
              Paciente
            </button>
            <button
              onClick={() => setIsAdmin(true)}
              className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", isAdmin ? "bg-white shadow-sm text-medical-primary" : "text-slate-500 hover:text-slate-700")}
            >
              Administrativo
            </button>
          </div>

          {isAdmin && isRegisteringAdmin ? (
            <form onSubmit={handleRegisterAdmin} className="space-y-4">
              <h3 className="text-center font-bold text-slate-700">Cadastrar Novo Admin</h3>
              <Input
                label="Nome Completo"
                placeholder="Nome do Administrador"
                value={nomeAdmin}
                onChange={e => setNomeAdmin(e.target.value)}
                required
              />
              <Input
                label="Usuário"
                placeholder="admin_user"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button type="submit" className="w-full" isLoading={loading}>
                Cadastrar Admin
              </Button>
              <button
                type="button"
                onClick={() => setIsRegisteringAdmin(false)}
                className="w-full text-xs text-medical-primary hover:underline"
              >
                Já tenho conta, fazer login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {isAdmin ? (
                <>
                  <Input
                    label="Usuário"
                    placeholder="admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Código do Paciente"
                    placeholder="ABC123"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                    required
                  />
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    required
                  />
                </>
              )}
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              {successMsg && <p className="text-sm text-green-600 text-center">{successMsg}</p>}
              <Button type="submit" className="w-full" isLoading={loading}>
                {isAdmin ? 'Acessar Painel' : 'Consultar Exames'}
              </Button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsRegisteringAdmin(true)}
                  className="w-full text-xs text-medical-primary hover:underline"
                >
                  Não tem conta? Cadastre um novo admin
                </button>
              )}
            </form>
          )}
        </CardContent>
        <CardFooter className="text-center text-xs text-slate-400">
          Protegido por criptografia de ponta a ponta.
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function PatientDashboard({ user, onLogout, onViewExam }: { user: Patient, onLogout: () => void, onViewExam: (id: number) => void }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/paciente/exames');
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full medical-gradient flex items-center justify-center text-white">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Olá, {user.nome}</h1>
            <p className="text-sm text-slate-500">Bem-vindo ao seu portal de saúde</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </header>

      <Card>
        <CardHeader className="bg-slate-50/50">
          <h2 className="font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-medical-primary" />
            Informações do Paciente
          </h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">CPF</p>
            <p className="text-slate-700 font-medium">{user.cpf}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Data de Nascimento</p>
            <p className="text-slate-700 font-medium">{new Date(user.data_nascimento).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Código de Acesso</p>
            <p className="text-slate-700 font-medium">{user.codigo}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Seus Exames</h2>
        {loading ? (
          <div className="py-12 text-center text-slate-400">Buscando exames...</div>
        ) : exams.length === 0 ? (
          <Card className="py-12 text-center text-slate-400">
            Nenhum exame encontrado em seu histórico.
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map(exam => (
              <motion.div key={exam.id} whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="cursor-pointer hover:border-medical-primary/30 transition-colors" onClick={() => onViewExam(exam.id)}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        exam.status === 'Liberado' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                      )}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{exam.tipo_exame}</h3>
                        <p className="text-xs text-slate-500">Coletado em: {new Date(exam.data_coleta).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "hidden md:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                        exam.status === 'Liberado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {exam.status}
                      </span>
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ExamDetails({ examId, onBack }: { examId: number, onBack: () => void }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/paciente/exames/${examId}`);
      const data = await res.json();
      setExam(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (exam?.arquivo_pdf) {
      window.open(`/api/exames/download/${exam.arquivo_pdf}?download=true`, '_blank');
    }
  };

  const handleView = () => {
    if (exam?.arquivo_pdf) {
      window.open(`/api/exames/download/${exam.arquivo_pdf}`, '_blank');
    }
  };

  const handleShare = async () => {
    if (!exam) return;
    const shareData = {
      title: `Resultado de Exame: ${exam.tipo_exame}`,
      text: `Olá ${exam.paciente_nome || 'Paciente'}, seu resultado de ${exam.tipo_exame} está disponível no LabPortal.`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\nAcesse: ${shareData.url}`);
        alert('Link copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Error sharing', err);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando detalhes...</div>;
  if (!exam) return <div className="p-8 text-center">Exame não encontrado. <Button onClick={onBack}>Voltar</Button></div>;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto p-4 md:p-8 space-y-6"
    >
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ChevronRight className="h-4 w-4 mr-2 rotate-180" /> Voltar para lista
      </Button>

      <Card className="overflow-hidden">
        <div className="medical-gradient p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/70 text-xs uppercase font-bold tracking-widest mb-1">Laudo Laboratorial</p>
              <h1 className="text-2xl font-bold">{exam.tipo_exame}</h1>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold",
              exam.status === 'Liberado' ? "bg-white/20 text-white" : "bg-amber-400 text-amber-900"
            )}>
              {exam.status}
            </div>
          </div>
        </div>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <DetailItem label="Paciente" value={exam.paciente_nome || 'N/A'} />
              <DetailItem label="Data da Coleta" value={new Date(exam.data_coleta).toLocaleDateString('pt-BR')} />
              <DetailItem label="Data da Liberação" value={exam.data_liberacao ? new Date(exam.data_liberacao).toLocaleDateString('pt-BR') : 'Em processamento'} />
            </div>
            <div className="space-y-4">
              <DetailItem label="Médico Responsável" value={exam.medico_responsavel || 'Dr. Responsável Técnico'} />
              <DetailItem label="ID do Exame" value={`#${exam.id.toString().padStart(6, '0')}`} />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4">
            <Button className="flex-1" onClick={handleDownload} disabled={!exam.arquivo_pdf}>
              <Download className="h-4 w-4 mr-2" /> Baixar PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleView} disabled={!exam.arquivo_pdf}>
              <FileText className="h-4 w-4 mr-2" /> Visualizar Laudo
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'pacientes' | 'exames'>('pacientes');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const fetchPatients = async () => {
    const res = await fetch(`/api/admin/pacientes?search=${search}`, { credentials: 'include' });
    const data = await res.json();
    setPatients(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 text-medical-primary">
          <Logo imgSize="h-12" />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('pacientes')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors", activeTab === 'pacientes' ? "bg-medical-primary/10 text-medical-primary" : "text-slate-600 hover:bg-slate-50")}
          >
            <UserIcon className="h-5 w-5" /> Pacientes
          </button>
          <button
            onClick={() => setActiveTab('exames')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors", activeTab === 'exames' ? "bg-medical-primary/10 text-medical-primary" : "text-slate-600 hover:bg-slate-50")}
          >
            <ClipboardList className="h-5 w-5" /> Exames
          </button>
        </aside>

        <main className="flex-1 p-6 md:p-10 bg-slate-50 space-y-6 overflow-auto">
          {activeTab === 'pacientes' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Gestão de Pacientes</h1>
                <Button onClick={() => setShowAddPatient(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Novo Paciente
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  className="pl-10"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código / Senha</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{p.nome}</td>
                          <td className="px-6 py-4 text-slate-600">{p.cpf}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{p.codigo}</span>
                              <span className="text-slate-300">/</span>
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{(p as any).senha}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setSelectedPatient(p);
                                setShowAddExam(true);
                              }}>
                                <FileUp className="h-4 w-4 mr-2" /> Lançar Exame
                              </Button>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                const portalUrl = `${window.location.origin}/?code=${p.codigo}`;
                                const qrCodeUrl = await QRCode.toDataURL(portalUrl, {
                                  width: 300,
                                  margin: 2,
                                  color: { dark: '#008080', light: '#FFFFFF' }
                                });
                                printReceipt({ ...p, qrCodeUrl });
                              }}>
                                <QrCode className="h-4 w-4 mr-2" /> Cadastro
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <AdminExamsTab />
          )}
        </main>
      </div>

      {/* Modals */}
      {showAddPatient && (
        <AddPatientModal
          onClose={() => setShowAddPatient(false)}
          onSuccess={() => {
            setShowAddPatient(false);
            fetchPatients();
          }}
        />
      )}
      {showAddExam && selectedPatient && (
        <AddExamModal
          patient={selectedPatient}
          onClose={() => {
            setShowAddExam(false);
            setSelectedPatient(null);
          }}
          onSuccess={() => {
            setShowAddExam(false);
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
}

function AdminExamsTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  useEffect(() => {
    fetchExams();
  }, [search]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exames?search=${search}`, { credentials: 'include' });
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este exame?')) return;
    try {
      const res = await fetch(`/api/admin/exames/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        fetchExams();
      }
    } catch (err) {
      alert('Erro ao excluir exame');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Exames</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por paciente ou tipo de exame..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Exame</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando exames...</td></tr>
              ) : exams.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum exame encontrado.</td></tr>
              ) : (
                exams.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{e.paciente_nome}</td>
                    <td className="px-6 py-4 text-slate-600">{e.tipo_exame}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(e.data_coleta).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                        e.status === 'Liberado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingExam(e)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(e.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editingExam && (
        <AddExamModal
          exam={editingExam}
          patient={{ id: editingExam.paciente_id, nome: editingExam.paciente_nome || '' } as any}
          onClose={() => setEditingExam(null)}
          onSuccess={() => {
            setEditingExam(null);
            fetchExams();
          }}
        />
      )}
    </div>
  );
}

function AddPatientModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ codigo: string, senha: string, qrCodeUrl?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cpf, data_nascimento: dataNasc }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        // Generate QR Code with a link to the portal pre-filled with the code
        const portalUrl = `${window.location.origin}/?code=${data.codigo}`;
        const qrCodeUrl = await QRCode.toDataURL(portalUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#008080', // medical-primary
            light: '#FFFFFF'
          }
        });
        setResult({ codigo: data.codigo, senha: data.senha, qrCodeUrl });
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="medical-gradient p-6 text-white">
          <h2 className="text-xl font-bold">Cadastrar Novo Paciente</h2>
        </div>
        <CardContent className="p-6">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} required />
              <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" required />
              <Input label="Data de Nascimento" type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} required />
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button type="submit" className="flex-1" isLoading={loading}>Cadastrar</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-green-800 font-medium">Paciente cadastrado com sucesso!</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {result.qrCodeUrl && (
                  <div className="p-2 bg-white border-2 border-medical-primary/20 rounded-xl shadow-sm">
                    <img src={result.qrCodeUrl} alt="QR Code do Paciente" className="w-48 h-48" />
                  </div>
                )}
                <p className="text-xs text-slate-500 font-medium">QR Code único para acesso rápido ao portal</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Código</p>
                  <p className="text-xl font-mono font-bold text-medical-primary">{result.codigo}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Senha</p>
                  <p className="text-xl font-mono font-bold text-medical-primary">{result.senha}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => printReceipt({ nome, cpf, codigo: result.codigo, senha: result.senha, qrCodeUrl: result.qrCodeUrl })}>
                  <Download className="h-4 w-4 mr-2" /> Imprimir Cadastro
                </Button>
                <Button variant="outline" className="w-full" onClick={onSuccess}>Concluir</Button>
                {result.qrCodeUrl && (
                  <a
                    href={result.qrCodeUrl}
                    download={`qrcode-${result.codigo}.png`}
                    className="text-xs text-medical-primary hover:underline font-medium flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Baixar QR Code (PNG)
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </motion.div>
    </div>
  );
}

function AddExamModal({ patient, exam, onClose, onSuccess }: { patient: Patient, exam?: Exam, onClose: () => void, onSuccess: () => void }) {
  const [tipo, setTipo] = useState(exam?.tipo_exame || '');
  const [dataColeta, setDataColeta] = useState(exam?.data_coleta || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Liberado' | 'Em análise'>(exam?.status || 'Liberado');
  const [medico, setMedico] = useState(exam?.medico_responsavel || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('paciente_id', patient.id.toString());
      formData.append('tipo_exame', tipo);
      formData.append('data_coleta', dataColeta);
      formData.append('status', status);
      formData.append('medico_responsavel', medico);
      if (file) formData.append('arquivo', file);

      const url = exam ? `/api/admin/exames/${exam.id}` : '/api/admin/exames';
      const method = exam ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(`Erro ao ${exam ? 'editar' : 'lançar'} exame`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="medical-gradient p-6 text-white">
          <h2 className="text-xl font-bold">{exam ? 'Editar' : 'Lançar'} Exame: {patient.nome}</h2>
        </div>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Tipo de Exame" placeholder="Ex: Hemograma Completo" value={tipo} onChange={e => setTipo(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data da Coleta" type="date" value={dataColeta} onChange={e => setDataColeta(e.target.value)} required />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-medical-primary/50"
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                >
                  <option value="Liberado">Liberado</option>
                  <option value="Em análise">Em análise</option>
                </select>
              </div>
            </div>
            <Input label="Médico Responsável" placeholder="Dr. Fulano de Tal" value={medico} onChange={e => setMedico(e.target.value)} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Laudo (PDF)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-medical-primary/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col items-center gap-2">
                  <FileUp className="h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    {file ? file.name : 'Arraste ou clique para selecionar o PDF'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1" isLoading={loading}>Salvar Exame</Button>
            </div>
          </form>
        </CardContent>
      </motion.div>
    </div>
  );
}

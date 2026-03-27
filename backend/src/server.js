// ============================================================
// SERVIDOR PRINCIPAL — Programa Ser Livre
//
// Este é o ponto de entrada do backend. Ele:
// 1. Configura o Express (framework web)
// 2. Registra as rotas (URLs que o sistema aceita)
// 3. Inicia o servidor na porta configurada
//
// ROTAS DISPONÍVEIS:
// POST   /api/auth/login                  → Login
// POST   /api/auth/register               → Cadastro de novo usuário
// POST   /api/auth/accept-invite          → Aceitar convite e definir senha
// POST   /api/auth/forgot-password        → Solicitar redefinição de senha
// POST   /api/auth/reset-password/:token  → Redefinir senha via token
// POST   /api/users/:id/resend-invite     → Reenviar convite
// GET    /api/patients                    → Lista pacientes
// GET    /api/patients/:id               → Dados de 1 paciente
// POST   /api/patients                    → Cria paciente
// PUT    /api/patients/:id               → Atualiza paciente
// DELETE /api/patients/:id               → Exclui paciente
// DELETE /api/patients                    → Exclui pacientes em massa
// PATCH  /api/patients/:id/finish         → Finaliza programa
// PATCH  /api/patients/:id/restart        → Reinicia programa
// GET    /api/patients/:id/cycles         → Ciclos do paciente
// POST   /api/scores                      → Registra scores
// GET    /api/scores/:cycleId             → Busca scores do ciclo
// POST   /api/weekchecks                  → Salva checklist semanal
// GET    /api/weekchecks/:cycleId         → Busca checklists do ciclo
// GET    /api/alerts                      → Lista alertas
// GET    /api/dashboard                   → Dados do dashboard
// PUT    /api/users/:id/avatar            → Atualiza foto de perfil
// ============================================================

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const crypto = require('crypto');
const { sendInviteEmail, sendResetEmail } = require('./utils/mailer');
const {
  sendWelcome, sendWeighInReport, checkStatus,
} = require('./utils/whatsapp');
const { setupScheduler } = require('./utils/scheduler');

const { authRequired, requireRole, onlyOwnData } = require('./middleware/auth');
const { calcularMetabolico, calcularBemEstar, calcularMental, gerarAlertas, getPlanoFeatures } = require('./utils/scores');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// ── Configurações ──

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Logging
app.use(morgan('combined'));

// CORS — aceita todas as origens em dev, restrito em prod
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: (origin, cb) => {
    if (!ALLOWED_ORIGINS || !origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET','PUT','POST','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '15mb' })); // limite aumentado para suportar base64 de imagens

// Rate limiter para rotas de autenticação (evita força bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload de avatares
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ════════════════════════════════════════════
//  AUTENTICAÇÃO
// ════════════════════════════════════════════

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { patient: true }
    });

    if (!user) return res.status(401).json({ error: 'E-mail não encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, patientId: user.patient?.id, emailVerified: user.emailVerified }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const { email, name, role, phone } = req.body;
    if (!email || !name || !role) return res.status(400).json({ error: 'email, name e role são obrigatórios' });

    // Cria usuário sem senha (senha será definida via convite)
    const tempPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const user = await prisma.user.create({
      data: { email, password: tempPassword, name, role, phone }
    });

    // Gera token de convite
    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await prisma.inviteToken.create({
      data: { tokenHash, userId: user.id, expiresAt }
    });

    // Envia e-mail de convite
    await sendInviteEmail(email, name, tokenRaw);

    res.status(201).json({ id: user.id, name: user.name, role: user.role, inviteSent: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Aceitar convite e definir senha
app.post('/api/auth/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios' });
    if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await prisma.inviteToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: invite.userId },
        data: { password: hashed, emailVerified: true }
      }),
      prisma.inviteToken.update({
        where: { id: invite.id },
        data: { used: true }
      })
    ]);

    res.json({ message: 'Senha definida com sucesso. Faça login.', emailVerified: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Solicitar redefinição de senha
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    // Sempre retorna 200 por segurança (não revela se e-mail existe)
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.active) {
      // Invalida tokens anteriores
      await prisma.resetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true }
      });

      const tokenRaw = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await prisma.resetToken.create({
        data: { tokenHash, userId: user.id, expiresAt }
      });

      await sendResetEmail(email, user.name, tokenRaw);
    }

    res.json({ message: 'Se o e-mail existir no sistema, um link foi enviado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Redefinir senha via token
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
    }

    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const resetToken = await prisma.resetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed }
      }),
      prisma.resetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);

    res.json({ message: 'Senha redefinida com sucesso. Faça login.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reenviar convite
app.post('/api/users/:id/resend-invite', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Invalida convites anteriores
    await prisma.inviteToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: { tokenHash, userId: user.id, expiresAt }
    });

    await sendInviteEmail(user.email, user.name, tokenRaw);
    res.json({ message: 'Convite reenviado.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  PACIENTES
// ════════════════════════════════════════════

// Lista todos os pacientes (equipe vê todos, paciente vê só o seu)
app.get('/api/patients', authRequired, async (req, res) => {
  try {
    const where = req.user.role === 'PACIENTE' ? { userId: req.user.id } : {};
    const patients = await prisma.patient.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        cycles: { where: { status: 'ACTIVE' }, include: { scores: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dados de 1 paciente
app.get('/api/patients/:id', authRequired, onlyOwnData, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        cycles: {
          include: {
            weekChecks: { orderBy: { weekNumber: 'asc' } },
            scores: { orderBy: { month: 'asc' } }
          },
          orderBy: { number: 'desc' }
        },
        alerts: { where: { resolved: false }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar paciente (cria o User + Patient + Cycle 1 + envia convite)
app.post('/api/patients', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM'), async (req, res) => {
  try {
    const { name, email, phone, plan, initialWeight, height, birthDate } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name e email são obrigatórios' });

    // Cria usuário com senha temporária aleatória (será definida via convite)
    const tempPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: tempPassword, role: 'PACIENTE', phone }
      });
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          plan: plan || 'ESSENTIAL',
          initialWeight: parseFloat(initialWeight) || 0,
          currentWeight: parseFloat(initialWeight) || 0,
          height: height ? parseFloat(height) : null,
          birthDate: birthDate ? new Date(birthDate) : null
        }
      });
      const cycle = await tx.cycle.create({
        data: { patientId: patient.id, number: 1 }
      });
      return { user, patient, cycle };
    });

    // Gera token de convite
    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: { tokenHash, userId: result.user.id, expiresAt }
    });

    await sendInviteEmail(email, name, tokenRaw);

    // WhatsApp de boas-vindas (assíncrono, não bloqueia a resposta)
    if (phone) {
      sendWelcome({ name, phone, plan: plan || 'ESSENTIAL' }).catch(err =>
        console.warn('[WA] Boas-vindas não enviado:', err.message)
      );
    }

    res.status(201).json({
      patientId: result.patient.id,
      userId: result.user.id,
      cycleId: result.cycle.id,
      inviteSent: true
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Atualizar paciente
app.put('/api/patients/:id', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM'), async (req, res) => {
  try {
    const { plan, currentWeight, height, birthDate, phone } = req.body;
    const patient = await prisma.patient.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(plan && { plan }),
        ...(currentWeight !== undefined && { currentWeight: parseFloat(currentWeight) }),
        ...(height !== undefined && { height: height ? parseFloat(height) : null }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null })
      }
    });

    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: patient.userId },
        data: { phone }
      });
    }

    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Excluir paciente (individual)
app.delete('/api/patients/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await prisma.$transaction(async (tx) => {
      // Deleta ciclos e filhos (WeekCheck, ScoreEntry são cascade)
      await tx.patient.delete({ where: { id: patientId } });
      // Deleta o usuário associado
      await tx.user.delete({ where: { id: patient.userId } });
    });

    res.json({ message: 'Paciente removido com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Excluir pacientes em massa
app.delete('/api/patients', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids deve ser um array não vazio' });
    }

    const patients = await prisma.patient.findMany({
      where: { id: { in: ids.map(Number) } }
    });

    const userIds = patients.map(p => p.userId);

    await prisma.$transaction(async (tx) => {
      await tx.patient.deleteMany({ where: { id: { in: ids.map(Number) } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });

    res.json({ deleted: patients.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Finalizar programa (completa o ciclo ativo)
app.patch('/api/patients/:id/finish', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const cycle = await prisma.cycle.findFirst({
      where: { patientId, status: 'ACTIVE' }
    });

    if (!cycle) return res.status(404).json({ error: 'Nenhum ciclo ativo encontrado' });

    const updated = await prisma.cycle.update({
      where: { id: cycle.id },
      data: { status: 'COMPLETED', endDate: new Date() }
    });

    res.json({ message: 'Programa finalizado.', cycleId: cycle.id, status: 'COMPLETED' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reiniciar programa (cria novo ciclo)
app.patch('/api/patients/:id/restart', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);

    // Verifica se já tem ciclo ativo
    const activeCheck = await prisma.cycle.findFirst({ where: { patientId, status: 'ACTIVE' } });
    if (activeCheck) return res.status(400).json({ error: 'Já existe um ciclo ativo para este paciente' });

    const lastCycle = await prisma.cycle.findFirst({
      where: { patientId },
      orderBy: { number: 'desc' }
    });

    const newNumber = (lastCycle?.number || 0) + 1;
    const newCycle = await prisma.cycle.create({
      data: { patientId, number: newNumber, status: 'ACTIVE' }
    });

    res.json({ message: 'Novo ciclo iniciado.', cycleId: newCycle.id, cycleNumber: newNumber });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ciclos de um paciente
app.get('/api/patients/:id/cycles', authRequired, async (req, res) => {
  try {
    const cycles = await prisma.cycle.findMany({
      where: { patientId: parseInt(req.params.id) },
      include: {
        weekChecks: { orderBy: { weekNumber: 'asc' } },
        scores: { orderBy: { month: 'asc' } }
      },
      orderBy: { number: 'desc' }
    });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  SCORES
// ════════════════════════════════════════════

app.post('/api/scores', authRequired, requireRole('MEDICA', 'NUTRICIONISTA', 'ADMIN'), async (req, res) => {
  try {
    const data = req.body;

    // Calcula totais e status
    const met = calcularMetabolico(data);
    const bem = calcularBemEstar(data);
    const men = calcularMental(data);

    const score = await prisma.scoreEntry.create({
      data: {
        ...data,
        totalMetabolico: met.total,
        totalBemEstar: bem.total,
        totalMental: men.total,
        statusMetabolico: met.status,
        statusBemEstar: bem.status,
        statusMental: men.status,
        filledById: req.user.id
      }
    });

    // Gera alertas automáticos
    const alertas = gerarAlertas(met, bem, men);
    const cycle = await prisma.cycle.findUnique({
      where: { id: data.cycleId },
      include: { patient: true }
    });

    if (cycle) {
      for (const alerta of alertas) {
        await prisma.alert.create({
          data: { ...alerta, patientId: cycle.patientId }
        });
      }
    }

    res.status(201).json({ score, alertas });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/scores/:cycleId', authRequired, async (req, res) => {
  try {
    const scores = await prisma.scoreEntry.findMany({
      where: { cycleId: parseInt(req.params.cycleId) },
      orderBy: { month: 'asc' }
    });
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  CHECKLIST SEMANAL
// ════════════════════════════════════════════

app.post('/api/weekchecks', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM', 'NUTRICIONISTA', 'PSICOLOGA', 'TREINADOR'), async (req, res) => {
  try {
    const data = req.body;
    const check = await prisma.weekCheck.upsert({
      where: { cycleId_weekNumber: { cycleId: data.cycleId, weekNumber: data.weekNumber } },
      create: { ...data, filledById: req.user.id },
      update: { ...data, filledById: req.user.id }
    });

    // Atualiza peso atual se informado
    if (data.pesoRegistrado) {
      const cycle = await prisma.cycle.findUnique({ where: { id: data.cycleId } });
      if (cycle) {
        await prisma.patient.update({
          where: { id: cycle.patientId },
          data: { currentWeight: data.pesoRegistrado }
        });
      }
    }

    res.json(check);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/weekchecks/:cycleId', authRequired, async (req, res) => {
  try {
    const checks = await prisma.weekCheck.findMany({
      where: { cycleId: parseInt(req.params.cycleId) },
      orderBy: { weekNumber: 'asc' }
    });
    res.json(checks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  ALERTAS
// ════════════════════════════════════════════

app.get('/api/alerts', authRequired, async (req, res) => {
  try {
    const where = req.user.role === 'PACIENTE'
      ? { patient: { userId: req.user.id }, resolved: false }
      : { resolved: false };

    const alerts = await prisma.alert.findMany({
      where,
      include: { patient: { include: { user: { select: { name: true, avatarUrl: true } } } } },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolver alerta
app.patch('/api/alerts/:id/resolve', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM', 'NUTRICIONISTA', 'PSICOLOGA', 'TREINADOR'), async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: parseInt(req.params.id) },
      data: { resolved: true, resolvedAt: new Date() }
    });
    res.json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  DASHBOARD (métricas agregadas)
// ════════════════════════════════════════════

app.get('/api/dashboard', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM', 'NUTRICIONISTA', 'PSICOLOGA', 'TREINADOR'), async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        user: { select: { name: true, avatarUrl: true } },
        cycles: {
          where: { status: 'ACTIVE' },
          include: { scores: { orderBy: { month: 'desc' }, take: 1 } }
        }
      }
    });

    const totalPatients = patients.length;
    const totalWeightLost = patients.reduce((sum, p) => sum + (p.initialWeight - p.currentWeight), 0);
    const activeAlerts = await prisma.alert.count({ where: { resolved: false, severity: 'RED' } });
    const yellowAlerts = await prisma.alert.count({ where: { resolved: false, severity: 'YELLOW' } });

    res.json({
      totalPatients,
      totalWeightLost: Math.round(totalWeightLost * 10) / 10,
      avgWeightLost: totalPatients > 0 ? Math.round((totalWeightLost / totalPatients) * 10) / 10 : 0,
      redAlerts: activeAlerts,
      yellowAlerts,
      patients: patients.map(p => ({
        id: p.id,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        plan: p.plan,
        initialWeight: p.initialWeight,
        currentWeight: p.currentWeight,
        weightLost: Math.round((p.initialWeight - p.currentWeight) * 10) / 10,
        activeCycle: p.cycles[0] || null,
        latestScore: p.cycles[0]?.scores[0] || null
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  AVATAR (upload de foto)
// ════════════════════════════════════════════

app.put('/api/users/:id/avatar', authRequired, upload.single('avatar'), async (req, res) => {
  try {
    // Paciente só pode alterar o próprio avatar
    if (req.user.role === 'PACIENTE' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    const avatarUrl = `/uploads/${req.file.filename}`;
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { avatarUrl }
    });

    res.json({ avatarUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ════════════════════════════════════════════
//  EQUIPE (STAFF)
// ════════════════════════════════════════════
app.get('/api/staff', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { not: 'PACIENTE' } },
      select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, active: true }
    });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/role', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const { role, active } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { role, active }
    });
    res.json({ message: 'Permissões atualizadas' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  SENHA (PASSWORD)
// ════════════════════════════════════════════
app.put('/api/users/:id/password', authRequired, async (req, res) => {
  try {
    // Apenas o próprio usuário ou ADMIN pode alterar
    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { password: hashed }
    });

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  SEED INICIAL (cria dados de demo)
// ════════════════════════════════════════════

app.post('/api/seed', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    // Verifica se já tem dados
    const count = await prisma.user.count();
    if (count > 0) return res.json({ message: 'Banco já tem dados. Seed ignorado.' });

    const hashed = await bcrypt.hash('123456', 10);

    // Cria equipe
    await prisma.user.createMany({
      data: [
        { name: 'Dra. Mariana Wogel', email: 'mariana@institutowogel.com', password: hashed, role: 'MEDICA' },
        { name: 'Juliana Santos', email: 'juliana@institutowogel.com', password: hashed, role: 'ENFERMAGEM' },
        { name: 'Patricia Almeida', email: 'patricia@institutowogel.com', password: hashed, role: 'NUTRICIONISTA' },
        { name: 'Renata Barbosa', email: 'renata@institutowogel.com', password: hashed, role: 'PSICOLOGA' },
        { name: 'Carlos Trainer', email: 'carlos@pulsare.com', password: hashed, role: 'TREINADOR' },
        { name: 'Danilo Admin', email: 'danilo@institutowogel.com', password: hashed, role: 'ADMIN' },
      ]
    });

    res.json({ message: 'Seed criado com sucesso! Senha padrão: 123456' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  STATE BLOB — Persistência do frontend
// GET  /api/state/:key  → retorna JSON salvo
// PUT  /api/state/:key  → salva JSON
// ════════════════════════════════════════════
app.get('/api/state/:key', authRequired, async (req, res) => {
  try {
    const blob = await prisma.stateBlob.findUnique({ where: { key: req.params.key } });
    res.json(blob ? blob.value : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/state/:key', authRequired, async (req, res) => {
  try {
    await prisma.stateBlob.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: req.body },
      update: { value: req.body }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  COMUNICAÇÃO — TEMPLATES E HISTÓRICO
// ════════════════════════════════════════════

// Templates padrão do sistema (criados uma vez se não existirem)
const SYSTEM_TEMPLATES = [
  { name:"Boas-vindas ao programa",       category:"boas_vindas",  isSystem:true, body:`Olá {{nome}},\n\nSeu cadastro no Programa Ser Livre foi realizado.\n\n- Plano: {{plano}}\n- Início: {{data_inicio}}\n- Acesso ao app em breve\n\nQualquer dúvida, fale com a equipe.\n\nInstituto Dra. Mariana Wogel` },
  { name:"Resultado de pesagem",           category:"resultado",    isSystem:true, body:`Olá {{nome}},\n\nResultado — Semana {{semana}}:\n\n- Peso atual: {{peso_atual}}kg\n- Variação: {{variacao_peso}}kg\n- Massa magra: {{massa_magra}}kg\n- Massa gorda: {{massa_gorda}}kg\n\nAcompanhe sua evolução no app.` },
  { name:"Parabéns pela perda de peso",   category:"conquista",    isSystem:true, body:`Olá {{nome}},\n\nSemana {{semana}} concluída.\n\n- Total perdido até agora: {{peso_perdido}}kg\n- Peso inicial: {{peso_inicial}}kg\n- Peso atual: {{peso_atual}}kg\n\nContinue com o protocolo.` },
  { name:"Lembrete de consulta",           category:"lembrete",    isSystem:true, body:`Olá {{nome}},\n\nLembrete: você tem consulta amanhã.\n\n- Leve seus exames caso tenha realizado\n- Registre seu peso antes da consulta\n\nInstituto Dra. Mariana Wogel` },
  { name:"Lembrete de exames",             category:"lembrete",    isSystem:true, body:`Olá {{nome}},\n\nSemana {{semana}} — momento de realizar exames laboratoriais.\n\nExames solicitados:\n- Hemograma completo\n- Glicemia em jejum\n- Perfil lipídico\n- TSH\n\nAgende com antecedência.` },
  { name:"Início de semana",               category:"agendamento", isSystem:true, body:`Olá {{nome}},\n\nSemana {{semana}} do programa iniciada.\n\n- Mantenha o protocolo alimentar\n- Pesagem desta semana: conforme agendado\n\nQualquer dúvida, fale com a equipe.` },
  { name:"Conclusão do programa",          category:"conquista",   isSystem:true, body:`Olá {{nome}},\n\n16 semanas concluídas.\n\n- Peso inicial: {{peso_inicial}}kg\n- Peso final: {{peso_atual}}kg\n- Total perdido: {{peso_perdido}}kg\n\nNossa equipe entrará em contato para as próximas orientações.\n\nInstituto Dra. Mariana Wogel` },
  { name:"Confirmação de agendamento",     category:"agendamento", isSystem:true, body:`Olá {{nome}},\n\nSua consulta foi agendada.\n\n- Data: {{data_evento}}\n- Profissional: {{profissional}}\n\nEm caso de impedimento, entre em contato com antecedência.\n\nInstituto Dra. Mariana Wogel` },
  { name:"Reativação — novo ciclo",        category:"boas_vindas", isSystem:true, body:`Olá {{nome}},\n\nNovo ciclo iniciado.\n\n- Ciclo: {{ciclo}}\n- Plano: {{plano}}\n- Peso atual: {{peso_atual}}kg\n\nNossa equipe está aqui para acompanhar sua evolução.` },
];

// Garante que templates do sistema existam no banco
async function ensureSystemTemplates() {
  try {
    for (const t of SYSTEM_TEMPLATES) {
      const exists = await prisma.messageTemplate.findFirst({ where: { name: t.name, isSystem: true } });
      if (!exists) await prisma.messageTemplate.create({ data: t });
    }
  } catch (err) {
    console.warn('[TEMPLATES] Não foi possível criar templates padrão:', err.message);
  }
}

// Substitui variáveis no template
function renderTemplate(body, vars) {
  let text = body;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, v ?? '—');
  }
  return text;
}

// Monta variáveis de um paciente
async function buildPatientVars(patientId) {
  const p = await prisma.patient.findUnique({
    where: { id: parseInt(patientId) },
    include: {
      user: { select: { name: true, phone: true } },
      cycles: { where: { status: 'ACTIVE' }, include: { weekChecks: { orderBy: { weekNumber: 'desc' }, take: 1 } }, take: 1 },
    }
  });
  if (!p) return null;
  const cycle = p.cycles?.[0];
  const lastCheck = cycle?.weekChecks?.[0];
  const weekNum = cycle?.currentWeek || 1;
  const perdido = Math.max(0, (p.initialWeight - p.currentWeight)).toFixed(1);
  return {
    nome:          p.user.name,
    plano:         p.plan,
    peso_inicial:  p.initialWeight,
    peso_atual:    p.currentWeight,
    peso_perdido:  perdido,
    variacao_peso: lastCheck?.pesoRegistrado ? (lastCheck.pesoRegistrado - p.currentWeight).toFixed(1) : '—',
    massa_magra:   '—',
    massa_gorda:   '—',
    semana:        weekNum,
    ciclo:         cycle?.number || 1,
    data_inicio:   p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : '—',
    data_evento:   '—',
    profissional:  '—',
    _phone:        p.user.phone,
    _name:         p.user.name,
  };
}

// ── Listar templates
app.get('/api/templates', authRequired, async (req, res) => {
  try {
    await ensureSystemTemplates();
    const templates = await prisma.messageTemplate.findMany({
      where: { active: true },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ isSystem: 'desc' }, { category: 'asc' }, { name: 'asc' }]
    });
    res.json(templates);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Criar template
app.post('/api/templates', authRequired, requireRole('ADMIN','MEDICA','NUTRICIONISTA'), async (req, res) => {
  try {
    const { name, category, body } = req.body;
    if (!name || !body) return res.status(400).json({ error: 'name e body são obrigatórios' });
    const t = await prisma.messageTemplate.create({
      data: { name, category: category||'custom', body, createdById: req.user.id }
    });
    res.status(201).json(t);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Atualizar template
app.put('/api/templates/:id', authRequired, requireRole('ADMIN','MEDICA','NUTRICIONISTA'), async (req, res) => {
  try {
    const { name, category, body, active } = req.body;
    const t = await prisma.messageTemplate.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!t) return res.status(404).json({ error: 'Template não encontrado' });
    if (t.isSystem) return res.status(403).json({ error: 'Templates do sistema não podem ser editados. Duplique-o primeiro.' });
    const updated = await prisma.messageTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name&&{name}), ...(category&&{category}), ...(body&&{body}), ...(active!==undefined&&{active}) }
    });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Duplicar template (para customizar um sistema)
app.post('/api/templates/:id/duplicate', authRequired, async (req, res) => {
  try {
    const orig = await prisma.messageTemplate.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!orig) return res.status(404).json({ error: 'Template não encontrado' });
    const copy = await prisma.messageTemplate.create({
      data: { name:`${orig.name} (cópia)`, category: orig.category, body: orig.body, isSystem: false, createdById: req.user.id }
    });
    res.status(201).json(copy);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Excluir template (apenas não-sistema)
app.delete('/api/templates/:id', authRequired, requireRole('ADMIN','MEDICA'), async (req, res) => {
  try {
    const t = await prisma.messageTemplate.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!t) return res.status(404).json({ error: 'Não encontrado' });
    if (t.isSystem) return res.status(403).json({ error: 'Templates do sistema não podem ser excluídos.' });
    await prisma.messageTemplate.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Removido.' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Preview: renderiza template com dados reais do paciente
app.post('/api/templates/:id/preview', authRequired, async (req, res) => {
  try {
    const { patientId, extraVars } = req.body;
    const tmpl = await prisma.messageTemplate.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!tmpl) return res.status(404).json({ error: 'Template não encontrado' });
    const vars = patientId ? await buildPatientVars(patientId) : {};
    const merged = { ...vars, ...(extraVars||{}) };
    const rendered = renderTemplate(tmpl.body, merged);
    res.json({ rendered, vars: merged });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Enviar mensagem (1 ou N pacientes)
app.post('/api/messages/send', authRequired, async (req, res) => {
  try {
    const { templateId, patientIds, customBody, extraVars, channel } = req.body;
    if (!patientIds?.length) return res.status(400).json({ error: 'patientIds é obrigatório' });

    let templateBody = customBody || null;
    if (templateId && !customBody) {
      const tmpl = await prisma.messageTemplate.findUnique({ where: { id: parseInt(templateId) } });
      if (!tmpl) return res.status(404).json({ error: 'Template não encontrado' });
      templateBody = tmpl.body;
    }
    if (!templateBody) return res.status(400).json({ error: 'templateId ou customBody são obrigatórios' });

    const { sendWhatsApp } = require('./utils/whatsapp');
    const results = [];

    for (const pid of patientIds) {
      const vars = await buildPatientVars(pid);
      if (!vars) { results.push({ patientId: pid, ok: false, reason: 'not_found' }); continue; }
      const phone = vars._phone;
      if (!phone) { results.push({ patientId: pid, ok: false, reason: 'no_phone' }); continue; }

      const merged  = { ...vars, ...(extraVars||{}) };
      const body    = renderTemplate(templateBody, merged);
      const waResult = await sendWhatsApp(phone, body);

      // Salva no histórico
      await prisma.messageLog.create({
        data: {
          patientId:  parseInt(pid),
          templateId: templateId ? parseInt(templateId) : null,
          sentById:   req.user.id,
          phone,
          body,
          channel:    channel || 'whatsapp',
          status:     waResult.ok ? 'sent' : 'failed',
          error:      waResult.ok ? null : waResult.reason,
        }
      });

      results.push({ patientId: pid, ok: waResult.ok, name: vars._name });
      if (patientIds.length > 1) await new Promise(r => setTimeout(r, 1000));
    }

    res.json({ results, total: results.length, sent: results.filter(r=>r.ok).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Histórico de mensagens
app.get('/api/messages/history', authRequired, async (req, res) => {
  try {
    const { patientId, limit } = req.query;
    const where = patientId ? { patientId: parseInt(patientId) } : {};
    const logs = await prisma.messageLog.findMany({
      where,
      include: {
        patient:  { include: { user: { select: { name: true } } } },
        template: { select: { name: true, category: true } },
        sentBy:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 50
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════
//  AGENDAMENTOS (APPOINTMENTS)
// ════════════════════════════════════════════

// Lista agendamentos (filtro por data opcional)
app.get('/api/appointments', authRequired, async (req, res) => {
  try {
    const { from, to, patientId } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    }
    if (patientId) where.patientId = parseInt(patientId);

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
        staff:   { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar agendamento
app.post('/api/appointments', authRequired, async (req, res) => {
  try {
    const { patientId, staffId, type, title, date, notes } = req.body;
    if (!type || !date) return res.status(400).json({ error: 'type e date são obrigatórios' });

    // Só envia lembrete para consultas e exames
    const sendReminder = ['CONSULTA_MEDICA', 'CONSULTA_NUTRI', 'EXAME'].includes(type);

    const appt = await prisma.appointment.create({
      data: {
        patientId:   patientId ? parseInt(patientId) : null,
        staffId:     staffId   ? parseInt(staffId)   : null,
        createdById: req.user.id,
        type,
        title:       title || null,
        date:        new Date(date),
        notes:       notes || null,
        sendReminder,
      },
      include: {
        patient: { include: { user: { select: { name: true, phone: true } } } },
        staff:   { select: { id: true, name: true, role: true } },
      }
    });
    res.status(201).json(appt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Atualizar agendamento
app.put('/api/appointments/:id', authRequired, async (req, res) => {
  try {
    const { patientId, staffId, type, title, date, notes } = req.body;
    const sendReminder = type ? ['CONSULTA_MEDICA', 'CONSULTA_NUTRI', 'EXAME'].includes(type) : undefined;

    const appt = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(patientId !== undefined && { patientId: patientId ? parseInt(patientId) : null }),
        ...(staffId   !== undefined && { staffId:   staffId   ? parseInt(staffId)   : null }),
        ...(type  && { type, sendReminder }),
        ...(title !== undefined && { title }),
        ...(date  && { date: new Date(date) }),
        ...(notes !== undefined && { notes }),
        reminderSent: false, // reseta para reenviar no novo horário
      },
      include: {
        patient: { include: { user: { select: { name: true, phone: true } } } },
        staff:   { select: { id: true, name: true, role: true } },
      }
    });
    res.json(appt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Excluir agendamento
app.delete('/api/appointments/:id', authRequired, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Agendamento removido.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  WHATSAPP
// ════════════════════════════════════════════

// Status da conexão
app.get('/api/whatsapp/status', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const status = await checkStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar relatório de pesagem para paciente
app.post('/api/whatsapp/send-report', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM', 'NUTRICIONISTA'), async (req, res) => {
  try {
    const { patientId, patientName, phone: directPhone, weekNum, currentWeight, previousWeight, massaMagra, massaGordura } = req.body;

    let phone = directPhone || null;
    let name  = patientName || 'Paciente';

    // Tenta buscar pelo Prisma apenas se o ID parecer válido (int pequeno)
    if (patientId && parseInt(patientId) < 1e12) {
      const patient = await prisma.patient.findUnique({
        where: { id: parseInt(patientId) },
        include: { user: { select: { name: true, phone: true } } }
      });
      if (patient) {
        phone = patient.user?.phone || phone;
        name  = patient.user?.name  || name;
      }
    }

    if (!phone) return res.status(400).json({ error: 'Telefone do paciente não encontrado' });

    const result = await sendWeighInReport(
      { name, phone },
      { weekNum, currentWeight, previousWeight, massaMagra, massaGordura }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensagem manual para paciente
app.post('/api/whatsapp/send-custom', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const { patientId, message } = req.body;
    if (!patientId || !message) return res.status(400).json({ error: 'patientId e message são obrigatórios' });

    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      include: { user: { select: { name: true, phone: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const phone = patient.user?.phone;
    if (!phone) return res.status(400).json({ error: 'Paciente sem telefone cadastrado' });

    const { sendWhatsApp } = require('./utils/whatsapp');
    const result = await sendWhatsApp(phone, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mídia (imagem/PDF) junto com mensagem para paciente
app.post('/api/whatsapp/send-media', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM', 'NUTRICIONISTA'), async (req, res) => {
  try {
    const { patientId, patientName, phone: directPhone, base64, mimeType, fileName, caption, textMessage } = req.body;
    console.log(`[MEDIA ROUTE] patientId=${patientId}, mimeType=${mimeType}, fileName=${fileName}, base64 length=${base64?.length}`);
    if (!base64) return res.status(400).json({ error: 'base64 é obrigatório' });

    let phone = directPhone || null;
    let name  = patientName || 'Paciente';

    // Tenta buscar pelo Prisma apenas se o ID parecer válido (int pequeno)
    if (patientId && parseInt(patientId) < 1e12) {
      const patient = await prisma.patient.findUnique({
        where: { id: parseInt(patientId) },
        include: { user: { select: { name: true, phone: true } } }
      });
      if (patient) {
        phone = patient.user?.phone || phone;
        name  = patient.user?.name  || name;
      }
    }

    if (!phone) return res.status(400).json({ error: 'Telefone do paciente não encontrado' });

    const { sendMedia, sendWhatsApp } = require('./utils/whatsapp');
    const results = {};

    // Envia texto primeiro (se houver)
    if (textMessage) {
      results.text = await sendWhatsApp(phone, textMessage);
    }

    // Envia a mídia
    results.media = await sendMedia(phone, { base64, mimeType, fileName, caption });

    // Registra no histórico
    await prisma.messageLog.create({
      data: {
        patientId:  parseInt(patientId),
        sentById:   req.user?.id || null,
        phone,
        body:       caption || fileName || 'Arquivo enviado',
        channel:    'whatsapp',
        status:     results.media.ok ? 'sent' : 'failed',
        error:      results.media.ok ? null : results.media.reason,
      }
    });

    res.json({ ok: results.media.ok, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

// ── Inicia o servidor ──
app.listen(PORT, () => {
  console.log(`\n🟢 Ser Livre API rodando na porta ${PORT}`);
  console.log(`   Banco:      ${process.env.DATABASE_URL ? 'Conectado' : '⚠️ DATABASE_URL não configurada'}`);
  console.log(`   E-mail:     ${process.env.SMTP_USER ? `Configurado (${process.env.SMTP_USER})` : '⚠️ SMTP não configurado'}`);
  console.log(`   WhatsApp:   ${process.env.EVOLUTION_API_KEY ? `Configurado (${process.env.EVOLUTION_INSTANCE})` : '⚠️ Evolution API não configurada'}`);
  console.log(`   Gemini AI:  ${process.env.GEMINI_API_KEY ? 'Configurado' : '⚠️ Não configurado (usando templates padrão)'}\n`);

  // Inicia cron jobs (requer node-cron instalado)
  setupScheduler(prisma);
});

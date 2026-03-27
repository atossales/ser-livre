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
app.use(express.json({ limit: '15mb' }));

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

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

// ── Inicia o servidor ──
app.listen(PORT, () => {
  console.log(`\n🟢 Ser Livre API rodando na porta ${PORT}`);
  console.log(`   Banco: ${process.env.DATABASE_URL ? 'Conectado' : '⚠️ DATABASE_URL não configurada'}`);
  console.log(`   E-mail: ${process.env.SMTP_USER ? `Configurado (${process.env.SMTP_USER})` : '⚠️ SMTP não configurado (e-mails serão logados no console)'}\n`);
});

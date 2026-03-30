// ============================================================
// SERVIDOR PRINCIPAL — Programa Ser Livre
// Backend: Express + Prisma + Supabase Auth
//
// ROTAS:
// POST   /api/auth/login                  → Login via Supabase Auth
// POST   /api/auth/register               → Cria user no Supabase Auth + perfil
// POST   /api/auth/invite                 → Convida membro da equipe
// POST   /api/auth/accept-invite          → Aceita convite (via Supabase)
// POST   /api/auth/forgot-password        → Solicita reset de senha
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
// PATCH  /api/alerts/:id/resolve          → Resolve alerta
// GET    /api/dashboard                   → Dados do dashboard
// GET    /api/reports/cohort              → Relatório coorte de pacientes (PDF)
// GET    /api/appointments                → Lista agendamentos
// POST   /api/appointments                → Cria agendamento
// PUT    /api/users/:id/avatar            → Atualiza foto de perfil
// GET    /api/staff                       → Lista membros da equipe
// PUT    /api/users/:id/role              → Atualiza role/status
// PUT    /api/users/:id/password          → Atualiza senha via Supabase
// ============================================================

// Garante fuso horário correto para CRONs e datas (Brasília = UTC-3)
process.env.TZ = 'America/Sao_Paulo';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cron = require('node-cron');

const { authRequired, requireRole, onlyOwnData, supabaseAdmin } = require('./middleware/auth');
const { calcularMetabolico, calcularBemEstar, calcularMental, gerarAlertas } = require('./utils/scores');
const { sendInviteEmail, sendResetEmail } = require('./utils/mailer');
const { sendWhatsApp } = require('./utils/whatsapp');

const prisma = require('./lib/prisma');
const app = express();
const PORT = process.env.PORT || 3001;

// ── Configurações ────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    // Permite requisições sem origin (ex: curl, Postman em dev) apenas em desenvolvimento
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (origin && ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET','PUT','POST','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
// Pre-flight CORS deve usar a mesma validação de origem que o handler principal
app.options('*', cors({
  origin: (origin, cb) => {
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (origin && ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET','PUT','POST','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
// Limite global conservador — rotas que precisam de payload maior usam middleware próprio
app.use(express.json({ limit: '2mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit agressivo para /api/seed — máx 3 tentativas por hora
const seedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Limite de tentativas de seed atingido. Tente novamente em 1 hora.' },
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ════════════════════════════════════════════
//  AUTENTICAÇÃO — via Supabase Auth
// ════════════════════════════════════════════

// Login — Supabase Auth retorna o access_token JWT
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    // Busca perfil com role e dados de paciente
    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: { patient: true }
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário inativo. Contacte o administrador.' });
    }

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        patientId: user.patient?.id,
        emailVerified: user.emailVerified
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh token — rate limit previne abuso de tokens roubados (ex: XSS)
app.post('/api/auth/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken é obrigatório' });

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
    if (error) return res.status(401).json({ error: 'Token de refresh inválido' });

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar membro da equipe (admin cria conta, Supabase envia convite por e-mail)
app.post('/api/auth/register', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const { email, name, role, phone } = req.body;
    if (!email || !name || !role) return res.status(400).json({ error: 'email, name e role são obrigatórios' });

    // Cria usuário no Supabase Auth (o trigger auto-cria o perfil em public.users)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { name, role }
    });

    if (error) return res.status(400).json({ error: error.message });

    // Atualiza dados extras que o trigger pode não ter (phone, role específico)
    await prisma.user.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, email, name, role, phone },
      update: { role, phone }
    });

    // Gera link de convite via Supabase Auth (usuário define a senha)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name, role }, redirectTo: `${process.env.APP_URL}/convite` }
    });

    if (!linkError && linkData) {
      await sendInviteEmail(email, name, linkData.properties.action_link);
    }

    res.status(201).json({ id: data.user.id, name, role, inviteSent: !linkError });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Solicitar reset de senha (Supabase envia o e-mail automaticamente)
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    // Supabase envia o e-mail de reset — não revelamos se o usuário existe
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/reset-password`
    });

    res.json({ message: 'Se o e-mail existir no sistema, um link foi enviado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reenviar convite
app.post('/api/users/:id/resend-invite', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: user.email,
      options: { data: { name: user.name, role: user.role }, redirectTo: `${process.env.APP_URL}/convite` }
    });

    if (error) return res.status(400).json({ error: error.message });

    await sendInviteEmail(user.email, user.name, linkData.properties.action_link);
    res.json({ message: 'Convite reenviado.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  PACIENTES
// ════════════════════════════════════════════

app.get('/api/patients', authRequired, async (req, res) => {
  try {
    const where = req.user.role === 'PACIENTE' ? { userId: req.user.id } : {};
    const page     = req.query.page ? Math.max(1, parseInt(req.query.page)) : null;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);

    const query = {
      where,
      include: {
        user:   { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        cycles: {
          where:   { status: 'ACTIVE' },
          include: {
            scores:     { orderBy: { month: 'asc' } },
            weekChecks: { orderBy: { weekNumber: 'asc' } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (page) {
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({ ...query, take: pageSize, skip: (page - 1) * pageSize }),
        prisma.patient.count({ where })
      ]);
      return res.json({ data: patients, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }

    const patients = await prisma.patient.findMany(query);
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Criar paciente — cria conta no Supabase Auth + perfil + Patient + Cycle 1
app.post('/api/patients', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM'), async (req, res) => {
  try {
    const { name, email, phone, plan, initialWeight, height, birthDate } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name e email são obrigatórios' });
    if (initialWeight !== undefined && (isNaN(parseFloat(initialWeight)) || parseFloat(initialWeight) <= 0)) {
      return res.status(400).json({ error: 'initialWeight deve ser um número positivo' });
    }
    if (birthDate && isNaN(new Date(birthDate).getTime())) {
      return res.status(400).json({ error: 'birthDate inválida' });
    }

    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { name, role: 'PACIENTE' }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const result = await prisma.$transaction(async (tx) => {
      // O trigger já cria o user em public.users, mas garantimos os dados extras
      await tx.user.upsert({
        where: { id: authData.user.id },
        create: { id: authData.user.id, email, name, role: 'PACIENTE', phone },
        update: { phone }
      });

      const patient = await tx.patient.create({
        data: {
          userId: authData.user.id,
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

      return { patient, cycle };
    });

    // Envia convite por e-mail via Supabase
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name, role: 'PACIENTE' }, redirectTo: `${process.env.APP_URL}/convite` }
    });

    if (linkData) {
      await sendInviteEmail(email, name, linkData.properties.action_link);
    }

    res.status(201).json({
      patientId: result.patient.id,
      userId: authData.user.id,
      cycleId: result.cycle.id,
      inviteSent: !!linkData
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/patients/:id', authRequired, requireRole('ADMIN', 'MEDICA', 'ENFERMAGEM'), async (req, res) => {
  try {
    const { plan, currentWeight, height, birthDate, phone, name } = req.body;
    const needsUserUpdate = phone !== undefined || name !== undefined;

    // Usar transação para garantir consistência entre patient e user
    const patient = await prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id: parseInt(req.params.id) },
        data: {
          ...(plan && { plan }),
          ...(currentWeight !== undefined && { currentWeight: parseFloat(currentWeight) }),
          ...(height !== undefined && { height: height ? parseFloat(height) : null }),
          ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null })
        }
      });
      if (needsUserUpdate) {
        await tx.user.update({
          where: { id: updated.userId },
          data: {
            ...(phone !== undefined && { phone }),
            ...(name  !== undefined && { name  }),
          }
        });
      }
      return updated;
    });

    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/patients/:id', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Deleta do Supabase Auth primeiro (cascata apaga public.users via trigger)
    await supabaseAdmin.auth.admin.deleteUser(patient.userId);
    // Agora deleta o patient (FK de patient → users já foi removida pela cascata)
    await prisma.patient.delete({ where: { id: patientId } });

    res.json({ message: 'Paciente removido com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/patients', authRequired, requireRole('ADMIN'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids deve ser um array não vazio' });
    }

    const patients = await prisma.patient.findMany({
      where: { id: { in: ids.map(Number) } }
    });

    // Deleta do Supabase Auth primeiro (cascata apaga public.users via trigger)
    // Apenas depois remove do Prisma — mesmo padrão do delete individual
    await Promise.all(patients.map(p => supabaseAdmin.auth.admin.deleteUser(p.userId)));
    await prisma.patient.deleteMany({ where: { id: { in: ids.map(Number) } } });

    res.json({ deleted: patients.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/patients/:id/finish', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const cycle = await prisma.cycle.findFirst({ where: { patientId, status: 'ACTIVE' } });
    if (!cycle) return res.status(404).json({ error: 'Nenhum ciclo ativo encontrado' });

    await prisma.cycle.update({
      where: { id: cycle.id },
      data: { status: 'COMPLETED', endDate: new Date() }
    });

    res.json({ message: 'Programa finalizado.', cycleId: cycle.id, status: 'COMPLETED' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/patients/:id/restart', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const activeCheck = await prisma.cycle.findFirst({ where: { patientId, status: 'ACTIVE' } });
    if (activeCheck) return res.status(400).json({ error: 'Já existe um ciclo ativo para este paciente' });

    const lastCycle = await prisma.cycle.findFirst({
      where: { patientId },
      orderBy: { number: 'desc' }
    });

    const newCycle = await prisma.cycle.create({
      data: { patientId, number: (lastCycle?.number || 0) + 1, status: 'ACTIVE' }
    });

    res.json({ message: 'Novo ciclo iniciado.', cycleId: newCycle.id, cycleNumber: newCycle.number });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/patients/:id/cycles', authRequired, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);

    // IDOR guard: paciente só pode ver os próprios ciclos
    if (req.user.role === 'PACIENTE') {
      if (!req.user.patient || req.user.patient.id !== patientId) {
        return res.status(403).json({ error: 'Acesso negado a dados de outro paciente' });
      }
    }

    const cycles = await prisma.cycle.findMany({
      where: { patientId },
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
    // Destructure explicitamente — evita mass-assignment de campos não autorizados
    const {
      cycleId, month,
      // Metabólico
      gorduraVisceral, massaMuscular, pcrUltrassensivel, ferritina,
      hemoglobinaGlicada, acidoUrico, triglicerideosHdl, circAbdominal,
      // Bem-estar
      gastrointestinal, libido, doresArticulares, autoestimaMental,
      energiaPerformance, sonoCefaleia,
      // Mental
      consistenciaAlimentar, gestaoEmocional, movimentoPresenca,
    } = req.body;

    const data = {
      cycleId, month,
      gorduraVisceral, massaMuscular, pcrUltrassensivel, ferritina,
      hemoglobinaGlicada, acidoUrico, triglicerideosHdl, circAbdominal,
      gastrointestinal, libido, doresArticulares, autoestimaMental,
      energiaPerformance, sonoCefaleia,
      consistenciaAlimentar, gestaoEmocional, movimentoPresenca,
    };

    const met = calcularMetabolico(data);
    const bem = calcularBemEstar(data);
    const men = calcularMental(data);

    // Usar transação para garantir atomicidade: score + alertas criados juntos ou nenhum
    const { score, alertas } = await prisma.$transaction(async (tx) => {
      const entry = await tx.scoreEntry.create({
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

      const alertasGerados = gerarAlertas(met, bem, men);
      const cycle = await tx.cycle.findUnique({ where: { id: data.cycleId } });

      if (cycle && alertasGerados.length > 0) {
        await tx.alert.createMany({
          data: alertasGerados.map(a => ({ ...a, patientId: cycle.patientId }))
        });
      }

      return { score: entry, alertas: alertasGerados };
    });

    res.status(201).json({ score, alertas });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/scores/:cycleId', authRequired, async (req, res) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    // IDOR guard: paciente só pode ver scores do próprio ciclo
    if (req.user.role === 'PACIENTE') {
      const cycle = await prisma.cycle.findUnique({
        where: { id: cycleId },
        include: { patient: { select: { userId: true } } }
      });
      if (!cycle || cycle.patient.userId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }
    const scores = await prisma.scoreEntry.findMany({
      where: { cycleId },
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
    // Destructure explicitamente — evita mass-assignment (req.body pode conter campos extras)
    const {
      cycleId, weekNumber, weekDate,
      tirzepatida, tirzepatidaDose, terapiaInjetavel, pesagem, pesoRegistrado,
      sessaoPsicologia, bioimpedancia,
      treino1, treino2, treino3,
      nutriAvaliacaoCompleta, nutriPlanoAlimentar, nutriScoresClinicos,
      observations,
      // campos de body composition
      massaMagra, massaGordura,
    } = req.body;

    const safeData = {
      cycleId, weekNumber,
      ...(weekDate        !== undefined && { weekDate }),
      ...(tirzepatida     !== undefined && { tirzepatida }),
      ...(tirzepatidaDose !== undefined && { tirzepatidaDose }),
      ...(terapiaInjetavel !== undefined && { terapiaInjetavel }),
      ...(pesagem         !== undefined && { pesagem }),
      ...(pesoRegistrado  !== undefined && { pesoRegistrado }),
      ...(sessaoPsicologia !== undefined && { sessaoPsicologia }),
      ...(bioimpedancia   !== undefined && { bioimpedancia }),
      ...(treino1         !== undefined && { treino1 }),
      ...(treino2         !== undefined && { treino2 }),
      ...(treino3         !== undefined && { treino3 }),
      ...(nutriAvaliacaoCompleta !== undefined && { nutriAvaliacaoCompleta }),
      ...(nutriPlanoAlimentar   !== undefined && { nutriPlanoAlimentar }),
      ...(nutriScoresClinicos   !== undefined && { nutriScoresClinicos }),
      ...(observations    !== undefined && { observations }),
      // body composition (não estão no schema como colunas — ignorado se schema não tiver)
    };

    const check = await prisma.weekCheck.upsert({
      where: { cycleId_weekNumber: { cycleId, weekNumber } },
      create: { ...safeData, filledById: req.user.id },
      update: { ...safeData, filledById: req.user.id }
    });

    if (pesoRegistrado) {
      const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
      if (cycle) {
        await prisma.patient.update({
          where: { id: cycle.patientId },
          data: { currentWeight: pesoRegistrado }
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
    const cycleId = parseInt(req.params.cycleId);
    // IDOR guard: paciente só pode ver checklists do próprio ciclo
    if (req.user.role === 'PACIENTE') {
      const cycle = await prisma.cycle.findUnique({
        where: { id: cycleId },
        include: { patient: { select: { userId: true } } }
      });
      if (!cycle || cycle.patient.userId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }
    const checks = await prisma.weekCheck.findMany({
      where: { cycleId },
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

app.patch('/api/alerts/:id/resolve', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: parseInt(req.params.id) },
      data: { resolved: true, resolvedAt: new Date() }
    });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════

app.get('/api/dashboard', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), async (req, res) => {
  try {
    const [patients, alerts, appointments] = await Promise.all([
      prisma.patient.findMany({
        include: {
          user:   { select: { name: true, email: true } },
          // Limita a 1 ciclo ativo e as últimas 4 semanas de checklist — evita N+1 em memória
          cycles: {
            where:   { status: 'ACTIVE' },
            take:    1,
            include: {
              weekChecks: { orderBy: { weekNumber: 'desc' }, take: 4 }
            }
          }
        }
      }),
      prisma.alert.findMany({ where: { resolved: false }, include: { patient: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.appointment.findMany({
        where: { date: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
        include: { patient: { include: { user: { select: { name: true } } } } },
        orderBy: { date: 'asc' }
      }).catch(() => [])
    ]);

    const activePatients = patients.filter(p => p.cycles.some(c => c.status === 'ACTIVE'));
    const totalWeightLost = patients.reduce((sum, p) => sum + Math.max(0, p.initialWeight - p.currentWeight), 0);

    // Calcular engagement por paciente (% de itens do checklist preenchidos nas últimas 4 semanas)
    // weekChecks já vem limitado a 4, ordenado desc — sem carregar dados extras em memória
    const engagements = activePatients.map(p => {
      const cycle = p.cycles[0];
      if (!cycle || !cycle.weekChecks.length) return 0;
      const filled = cycle.weekChecks.filter(w => w.pesagem || w.tirzepatida).length;
      return Math.round((filled / cycle.weekChecks.length) * 100);
    });
    const avgEngagement = engagements.length
      ? Math.round(engagements.reduce((a, b) => a + b, 0) / engagements.length)
      : 0;

    res.json({
      totalPatients: patients.length,
      activePatients: activePatients.length,
      totalWeightLost: Math.round(totalWeightLost * 10) / 10,
      avgEngagement,
      alerts: {
        red: alerts.filter(a => a.severity === 'RED').length,
        yellow: alerts.filter(a => a.severity === 'YELLOW').length,
        items: alerts.slice(0, 5)
      },
      upcomingAppointments: appointments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  RELATÓRIOS
// ════════════════════════════════════════════

app.get('/api/reports/cohort', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        user: { select: { name: true, email: true } },
        cycles: {
          include: {
            scores: { orderBy: { month: 'asc' } },
            weekChecks: { orderBy: { weekNumber: 'asc' } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const report = patients.map(p => ({
      name: p.user.name,
      plan: p.plan,
      startDate: p.startDate,
      initialWeight: p.initialWeight,
      currentWeight: p.currentWeight,
      weightLost: Math.max(0, p.initialWeight - p.currentWeight),
      pctLost: p.initialWeight > 0 ? ((p.initialWeight - p.currentWeight) / p.initialWeight * 100).toFixed(1) : '0.0',
      totalCycles: p.cycles.length,
      lastScore: p.cycles[0]?.scores?.slice(-1)[0] || null
    }));

    res.json({ generatedAt: new Date(), totalPatients: patients.length, patients: report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  AGENDAMENTOS
// ════════════════════════════════════════════

app.get('/api/appointments', authRequired, async (req, res) => {
  try {
    // Paciente só vê os próprios agendamentos
    const where = req.user.role === 'PACIENTE'
      ? { patient: { userId: req.user.id } }
      : {};
    const appointments = await prisma.appointment.findMany({
      where,
      include: { patient: { include: { user: { select: { name: true } } } } },
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), async (req, res) => {
  try {
    const { patientId, type, title, date, notes, sendReminder } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientId ? parseInt(patientId) : null,
        type,
        title,
        date: new Date(date),
        notes,
        sendReminder: !!sendReminder,
        createdById: req.user.id
      }
    });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  WHATSAPP — Envio manual
// ════════════════════════════════════════════

app.post('/api/whatsapp/send', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM'), async (req, res) => {
  try {
    const { phone, message, patientId } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone e message são obrigatórios' });

    const result = await sendWhatsApp(phone, message);

    // Log no banco se tiver patientId
    if (patientId && (result.ok || result.success)) {
      await prisma.messageLog.create({
        data: {
          patientId: parseInt(patientId),
          sentById: req.user.id,
          phone,
          body: message,
          channel: 'whatsapp',
          status: 'sent'
        }
      });
    }

    res.json({ success: result.ok || result.success, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  MESSAGES — Chat interno / por paciente
// ════════════════════════════════════════════

// GET /api/messages — lista todas conversas (equipe)
// GET /api/messages?patientId=X — mensagens de um paciente
app.get('/api/messages', authRequired, async (req, res) => {
  try {
    const { patientId } = req.query;
    // Paciente só vê mensagens do próprio contexto
    let where = patientId ? { patientId: parseInt(patientId) } : {};
    if (req.user.role === 'PACIENTE') {
      where = { patient: { userId: req.user.id } };
    }
    const msgs = await prisma.messageLog.findMany({
      where,
      include: {
        sentBy: { select: { id: true, name: true, role: true } },
        patient: { include: { user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/messages — envia mensagem (salva no MessageLog)
// Pacientes não podem enviar mensagens internas (apenas equipe)
app.post('/api/messages', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), async (req, res) => {
  try {
    const { patientId, body, channel = 'interno' } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'body obrigatório' });
    const msg = await prisma.messageLog.create({
      data: {
        patientId: patientId ? parseInt(patientId) : null,
        sentById: req.user.id,
        phone: null,  // null para mensagens internas; WhatsApp usa o endpoint /api/whatsapp/send
        body: body.trim(),
        channel,
        status: 'sent',
      },
      include: { sentBy: { select: { id: true, name: true, role: true } } },
    });
    res.json(msg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════
//  ACTIVITY LOG
// ════════════════════════════════════════════

app.get('/api/activity', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/activity', authRequired, async (req, res) => {
  try {
    const { action, patientId, patientName, detail } = req.body;
    const log = await prisma.activityLog.create({
      data: {
        action,
        patientId: patientId ? parseInt(patientId) : null,
        patientName: patientName || null,
        memberId: req.user.id,
        memberName: req.user.name,
        detail: detail || null,
      },
    });
    res.json(log);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════
//  AVATAR
// ════════════════════════════════════════════

app.put('/api/users/:id/avatar', authRequired, upload.single('avatar'), async (req, res) => {
  try {
    if (req.user.role === 'PACIENTE' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    const avatarUrl = `/uploads/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.params.id }, data: { avatarUrl } });
    res.json({ avatarUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  EQUIPE
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

app.put('/api/users/:id/profile', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const { name, phone, specialty, active } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(specialty !== undefined && { specialty }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/users/:id/role', authRequired, requireRole('ADMIN', 'MEDICA'), async (req, res) => {
  try {
    const { role, active } = req.body;

    // Impede autopromocão / rebaixamento da própria conta
    if (req.params.id === req.user.id) {
      return res.status(403).json({ error: 'Não é permitido alterar o próprio papel' });
    }

    // Valida que o role é um dos valores válidos do enum
    const VALID_ROLES = ['ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR','PACIENTE'];
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role inválido. Permitidos: ${VALID_ROLES.join(', ')}` });
    }

    // Somente ADMIN pode promover para ADMIN
    if (role === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode promover outro usuário a ADMIN' });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(role   !== undefined && { role }),
        ...(active !== undefined && { active }),
      }
    });
    res.json({ message: 'Permissões atualizadas' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  SENHA — via Supabase Auth Admin
// ════════════════════════════════════════════

app.put('/api/users/:id/password', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  STATE BLOB
// ════════════════════════════════════════════

// StateBlob: pacientes não têm acesso a blobs de estado da equipe
app.get('/api/state/:key', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), async (req, res) => {
  try {
    const blob = await prisma.stateBlob.findUnique({ where: { key: req.params.key } });
    res.json(blob ? blob.value : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/state/:key', authRequired, requireRole('ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR'), express.json({ limit: '10mb' }), async (req, res) => {
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
//  SEED INICIAL (cria usuários admin via Supabase Auth)
// ════════════════════════════════════════════

app.post('/api/seed', seedLimiter, async (req, res) => {
  // Desabilitar completamente em produção
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not Found' });
  }
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[SEED] Tentativa de seed recebida de IP: ${ip} em ${new Date().toISOString()}`);

    const { adminSecret } = req.body;
    if (adminSecret !== process.env.SEED_SECRET) {
      console.warn(`[SEED] Falha de autenticação do seed — IP: ${ip}`);
      return res.status(403).json({ error: 'Não autorizado' });
    }

    const count = await prisma.user.count();
    if (count > 0) return res.json({ message: 'Banco já tem dados. Seed ignorado.' });

    const equipe = [
      { name: 'Dra. Mariana Wogel', email: 'mariana@institutowogel.com', role: 'MEDICA' },
      { name: 'Juliana Santos', email: 'juliana@institutowogel.com', role: 'ENFERMAGEM' },
      { name: 'Patricia Almeida', email: 'patricia@institutowogel.com', role: 'NUTRICIONISTA' },
      { name: 'Renata Barbosa', email: 'renata@institutowogel.com', role: 'PSICOLOGA' },
      { name: 'Carlos Trainer', email: 'carlos@pulsare.com', role: 'TREINADOR' },
      { name: 'Danilo Admin', email: 'danilo@institutowogel.com', role: 'ADMIN' },
    ];

    // Senha inicial lida de env var — nunca deve ser hardcoded no código
    const seedPassword = process.env.SEED_DEFAULT_PASS;
    if (!seedPassword) {
      return res.status(500).json({ error: 'SEED_DEFAULT_PASS não definido. Configure a variável de ambiente antes de usar o seed.' });
    }

    const created = [];
    for (const member of equipe) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: seedPassword,
        email_confirm: true,
        user_metadata: { name: member.name, role: member.role }
      });
      if (!error) {
        await prisma.user.upsert({
          where: { id: data.user.id },
          create: { id: data.user.id, email: member.email, name: member.name, role: member.role, emailVerified: true },
          update: { role: member.role, emailVerified: true }
        });
        created.push(member.email);
      }
    }

    res.json({ message: 'Seed criado!', created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware de erros
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

// ════════════════════════════════════════════
//  CRON — Avanço automático de semana
//  Segunda às 8h fuso Brasília (America/Sao_Paulo)
// ════════════════════════════════════════════
cron.schedule('0 8 * * 1', async () => {
  try {
    // Uma única query em vez de N updates sequenciais (N+1 fix)
    const updated = await prisma.cycle.updateMany({
      where: { status: 'ACTIVE', currentWeek: { lt: 16 } },
      data: { currentWeek: { increment: 1 } }
    });
    console.log(`[CRON] Semanas avançadas: ${updated.count} ciclos`);
  } catch (err) {
    console.error('[CRON] Erro ao avançar semanas:', err.message);
  }
});

// ════════════════════════════════════════════
//  CRON — Lembretes de consulta via WhatsApp
//  Todo dia às 9h fuso Brasília (America/Sao_Paulo)
// ════════════════════════════════════════════
cron.schedule('0 9 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow); start.setHours(0,0,0,0);
    const end   = new Date(tomorrow); end.setHours(23,59,59,999);

    const appointments = await prisma.appointment.findMany({
      where: { date: { gte: start, lte: end }, sendReminder: true, reminderSent: false },
      include: { patient: { include: { user: { select: { name: true, phone: true } } } } }
    });

    for (const appt of appointments) {
      const phone = appt.patient?.user?.phone;
      const name  = appt.patient?.user?.name || 'Paciente';
      if (!phone) continue;

      const hora = new Date(appt.date).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
      const tipo = appt.type === 'CONSULTA_MEDICA' ? 'consulta médica' : appt.type === 'CONSULTA_NUTRI' ? 'consulta com a nutricionista' : 'exame';

      const msg = `Olá ${name}! 👋\n\nLembrete: você tem ${tipo} amanhã às ${hora} no Instituto Dra. Mariana Wogel.\n\nQualquer dúvida, entre em contato. Até amanhã! 🌟`;

      const result = await sendWhatsApp(phone, msg);
      if (result.ok || result.success) {
        await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSent: true } });
        console.log(`[CRON] Lembrete enviado para ${name} (${phone})`);
      }
    }
    console.log(`[CRON] Lembretes processados: ${appointments.length} agendamentos`);
  } catch (err) {
    console.error('[CRON] Erro ao enviar lembretes:', err.message);
  }
});

// ════════════════════════════════════════════
//  HEALTH CHECK — para EasyPanel / Docker
// ════════════════════════════════════════════
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', uptime: Math.floor(process.uptime()) });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});


// ════════════════════════════════════════════
//  STARTUP — sincroniza usuários e inicia servidor
//  Usa async/await para garantir que o sync complete
//  antes do servidor começar a aceitar requisições.
// ════════════════════════════════════════════
const { spawn } = require('child_process');

// Roda prisma db push em background (não bloqueia o servidor)
function runPrismaPush() {
  return new Promise((resolve) => {
    const p = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'], {
      stdio: 'pipe', env: { ...process.env }
    });
    p.stdout.on('data', (d) => process.stdout.write('[PRISMA] ' + d.toString()));
    p.stderr.on('data', (d) => process.stderr.write('[PRISMA] ' + d.toString()));
    p.on('close', (code) => { console.log(`[PRISMA] db push concluído (exit ${code})`); resolve(code); });
    p.on('error', (err) => { console.warn('[PRISMA] Erro:', err.message); resolve(1); });
    // Timeout de 3 minutos
    setTimeout(() => { p.kill(); console.warn('[PRISMA] db push cancelado por timeout'); resolve(1); }, 180000);
  });
}

let server;
(async () => {
  // 0. Detectar schema antigo (id INT) e forçar migração
  try {
    const colInfo = await prisma.$queryRaw`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='User' AND column_name='id'
    `;
    const idType = colInfo[0]?.data_type || 'unknown';
    console.log(`[STARTUP] User.id type: ${idType}`);

    if (idType === 'integer') {
      console.log('[STARTUP] Schema antigo detectado (id INT). Recriando banco...');
      // $executeRawUnsafe não suporta múltiplos statements — executar um a um
      const drops = [
        `DROP TABLE IF EXISTS "activity_logs" CASCADE`,
        `DROP TABLE IF EXISTS "InviteToken" CASCADE`,
        `DROP TABLE IF EXISTS "ResetToken" CASCADE`,
        `DROP TABLE IF EXISTS "MessageLog" CASCADE`,
        `DROP TABLE IF EXISTS "MessageTemplate" CASCADE`,
        `DROP TABLE IF EXISTS "Appointment" CASCADE`,
        `DROP TABLE IF EXISTS "ScoreEntry" CASCADE`,
        `DROP TABLE IF EXISTS "WeekCheck" CASCADE`,
        `DROP TABLE IF EXISTS "Cycle" CASCADE`,
        `DROP TABLE IF EXISTS "Alert" CASCADE`,
        `DROP TABLE IF EXISTS "Patient" CASCADE`,
        `DROP TABLE IF EXISTS "StateBlob" CASCADE`,
        `DROP TABLE IF EXISTS "User" CASCADE`,
        `DROP TYPE IF EXISTS "Role" CASCADE`,
        `DROP TYPE IF EXISTS "Plan" CASCADE`,
        `DROP TYPE IF EXISTS "CycleStatus" CASCADE`,
        `DROP TYPE IF EXISTS "AlertType" CASCADE`,
        `DROP TYPE IF EXISTS "AlertSeverity" CASCADE`,
        `DROP TYPE IF EXISTS "AppointmentType" CASCADE`,
      ];
      for (const sql of drops) {
        try { await prisma.$executeRawUnsafe(sql); } catch (e) { console.warn('[STARTUP] Drop:', e.message); }
      }
      console.log('[STARTUP] Tabelas antigas removidas. Rodando prisma db push...');
      await runPrismaPush();
      console.log('[STARTUP] Schema recriado com sucesso.');
    } else {
      // Schema correto — apenas garantir colunas novas existem
      const colFixes = [
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS specialty TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
        `UPDATE "User" SET active = true WHERE active IS NULL OR active = false`,
      ];
      for (const sql of colFixes) {
        try { await prisma.$executeRawUnsafe(sql); } catch (_) { /* OK */ }
      }
    }
  } catch (schemaErr) {
    console.warn('[STARTUP] Erro ao verificar schema:', schemaErr.message);
  }

  // 1. Sincronizar usuários do Supabase Auth → banco local
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.warn('[STARTUP] listUsers error:', error.message);
    } else {
      const authUsers = data?.users || [];
      console.log(`[STARTUP] Sincronizando ${authUsers.length} usuário(s)...`);
      let ok = 0, fail = 0;
      for (const authUser of authUsers) {
        if (!authUser.email || !authUser.id) continue;
        try {
          const role = authUser.user_metadata?.role;
          const validRoles = ['ADMIN','MEDICA','ENFERMAGEM','NUTRICIONISTA','PSICOLOGA','TREINADOR','PACIENTE'];
          const safeRole = validRoles.includes(role) ? role : 'PACIENTE';

          // Se existir um registro com o mesmo email mas ID diferente (schema antigo com INT),
          // deletar o registro antigo para que o upsert possa criar com o UUID correto.
          await prisma.$executeRawUnsafe(
            `DELETE FROM "User" WHERE email = $1 AND id != $2`,
            authUser.email, authUser.id
          );

          await prisma.user.upsert({
            where:  { id: authUser.id },
            create: {
              id:            authUser.id,
              email:         authUser.email,
              name:          authUser.user_metadata?.name || authUser.email.split('@')[0],
              role:          safeRole,
              emailVerified: !!authUser.email_confirmed_at,
              active:        true
            },
            update: { active: true, emailVerified: !!authUser.email_confirmed_at }
          });
          ok++;
        } catch (upsertErr) {
          fail++;
          console.warn(`[STARTUP] Sync falhou para ${authUser.email}:`, upsertErr.message);
        }
      }
      console.log(`[STARTUP] Sync: ${ok} OK, ${fail} falhas.`);
    }
  } catch (syncErr) {
    console.warn('[STARTUP] Erro geral no sync:', syncErr.message);
  }

  // 2. Iniciar servidor
  server = app.listen(PORT, () => {
    console.log(`\n🟢 Ser Livre API rodando na porta ${PORT}`);
    console.log(`   Banco: ${process.env.DATABASE_URL ? 'PostgreSQL conectado' : '⚠️ DATABASE_URL não configurada'}`);
    console.log(`   Supabase Auth: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL : '⚠️ não configurado'}\n`);
  });
})();

// ════════════════════════════════════════════
//  GRACEFUL SHUTDOWN — fecha conexões antes de sair
// ════════════════════════════════════════════
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Encerrando servidor graciosamente...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[SHUTDOWN] Conexões fechadas. Até logo!');
    process.exit(0);
  });
  // Força saída após 10s se travar
  setTimeout(() => { console.error('[SHUTDOWN] Timeout — forçando saída.'); process.exit(1); }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

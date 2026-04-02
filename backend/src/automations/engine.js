// ============================================================
// AUTOMATION ENGINE — Motor de mensagens automáticas
//
// Um único cron roda a cada 10 minutos e processa todas as
// regras de automação ativas do banco de dados.
// Substitui os 5 cron jobs hardcoded anteriores.
// ============================================================

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendWhatsApp } = require('../utils/whatsapp');

// ── Template variable resolver ──
function resolveTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ── Dedup check: já enviou para este paciente com esta regra recentemente? ──
async function alreadySent(ruleId, patientId, withinDays) {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const existing = await prisma.messageLog.findFirst({
    where: { automationRuleId: ruleId, patientId, createdAt: { gt: cutoff } }
  });
  return !!existing;
}

// ── Grace period check: paciente criado recentemente? ──
function inGracePeriod(patient, graceDays) {
  if (!graceDays) return false;
  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  return new Date(patient.createdAt) > cutoff;
}

// ── Send + log ──
async function sendAndLog(rule, patient, message) {
  const phone = patient.user?.phone;
  if (!phone) return;
  try {
    const result = await sendWhatsApp(phone, message);
    await prisma.messageLog.create({
      data: {
        patientId: patient.id,
        automationRuleId: rule.id,
        phone,
        body: message,
        channel: 'whatsapp',
        status: (result.ok || result.success) ? 'sent' : 'failed',
        error: (result.ok || result.success) ? null : JSON.stringify(result).slice(0, 500)
      }
    });
  } catch (e) {
    await prisma.messageLog.create({
      data: { patientId: patient.id, automationRuleId: rule.id, phone, body: message, channel: 'whatsapp', status: 'failed', error: e.message?.slice(0, 500) }
    }).catch(() => {});
    console.warn(`[AUTO] Falha ${rule.type} → ${patient.user?.name}:`, e.message);
  }
}

// ════════════════════════════════════════════
//  HANDLERS — Um por tipo de automação
// ════════════════════════════════════════════

async function handleWelcome(rule) {
  // Envia para pacientes criados nas últimas 2 horas (janela de 10min do cron)
  const config = rule.config || {};
  const hoursAfter = config.hoursAfterSignup || 0;
  const windowEnd = new Date(Date.now() - hoursAfter * 60 * 60 * 1000);
  const windowStart = new Date(windowEnd.getTime() - 15 * 60 * 1000); // 15min window

  const patients = await prisma.patient.findMany({
    where: { createdAt: { gte: windowStart, lte: windowEnd } },
    include: { user: { select: { name: true, phone: true } } }
  });

  for (const p of patients) {
    if (!p.user?.phone) continue;
    if (await alreadySent(rule.id, p.id, 30)) continue; // Never re-send welcome
    const msg = resolveTemplate(rule.messageBody || '', { nome: p.user.name?.split(' ')[0] || '' });
    await sendAndLog(rule, p, msg);
  }
}

async function handleAppointmentReminder(rule) {
  const config = rule.config || {};
  const hoursBefore = config.hoursBefore || 24;
  const target = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);
  const start = new Date(target); start.setMinutes(start.getMinutes() - 30);
  const end = new Date(target); end.setMinutes(end.getMinutes() + 30);

  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: start, lte: end }, sendReminder: true, reminderSent: false },
    include: { patient: { include: { user: { select: { name: true, phone: true } } } } }
  });

  for (const appt of appointments) {
    const p = appt.patient;
    if (!p?.user?.phone) continue;
    if (inGracePeriod(p, rule.gracePeriodDays)) continue;

    const hora = new Date(appt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const tipoMap = { CONSULTA_MEDICA: 'consulta medica', CONSULTA_NUTRI: 'consulta com a nutricionista', EXAME: 'exame' };
    const vars = { nome: p.user.name?.split(' ')[0] || '', tipo_consulta: tipoMap[appt.type] || 'compromisso', hora_consulta: hora };
    const msg = resolveTemplate(rule.messageBody || '', vars);
    await sendAndLog(rule, p, msg);
    await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSent: true } });
  }
}

async function handleWeeklyMotivational(rule) {
  const config = rule.config || {};
  const now = new Date();
  if (now.getDay() !== (config.dayOfWeek ?? 1)) return; // Não é o dia certo
  if (now.getHours() !== (config.hour ?? 8)) return; // Não é a hora certa

  const patients = await prisma.patient.findMany({
    where: { cycles: { some: { status: 'ACTIVE' } } },
    include: { user: { select: { name: true, phone: true } }, cycles: { where: { status: 'ACTIVE' }, take: 1 } }
  });

  for (const p of patients) {
    if (!p.user?.phone) continue;
    if (inGracePeriod(p, rule.gracePeriodDays)) continue;
    if (await alreadySent(rule.id, p.id, 6)) continue; // 1x por semana

    const week = p.cycles[0]?.currentWeek || 1;
    const msg = resolveTemplate(rule.messageBody || '', { nome: p.user.name?.split(' ')[0] || '', semana: String(week) });
    await sendAndLog(rule, p, msg);
  }
}

async function handleWeighReminder(rule) {
  const config = rule.config || {};
  const now = new Date();
  if (now.getHours() !== (config.hour ?? 9)) return;

  const patients = await prisma.patient.findMany({
    where: { cycles: { some: { status: 'ACTIVE' } } },
    include: {
      user: { select: { name: true, phone: true } },
      cycles: { where: { status: 'ACTIVE' }, take: 1, include: { weekChecks: { orderBy: { createdAt: 'desc' }, take: 1 } } }
    }
  });

  for (const p of patients) {
    if (!p.user?.phone) continue;
    if (inGracePeriod(p, rule.gracePeriodDays)) continue;

    // Dia de pesagem: individual do paciente ou fallback da regra
    const weighDay = p.weighDay ?? config.fallbackDay ?? 4;
    if (now.getDay() !== weighDay) continue;

    // Já pesou esta semana? Skip
    const lastCheck = p.cycles[0]?.weekChecks[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (lastCheck && new Date(lastCheck.createdAt) > weekAgo) continue;

    if (await alreadySent(rule.id, p.id, 6)) continue;
    const msg = resolveTemplate(rule.messageBody || '', { nome: p.user.name?.split(' ')[0] || '' });
    await sendAndLog(rule, p, msg);
  }
}

async function handleInactivityAlert(rule) {
  const config = rule.config || {};
  const now = new Date();
  if (now.getHours() !== (config.hour ?? 10)) return;

  const inactiveDays = config.inactiveDays || 14;
  const cooldownDays = config.cooldownDays || 7;
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  const patients = await prisma.patient.findMany({
    where: { cycles: { some: { status: 'ACTIVE' } }, updatedAt: { lt: cutoff } },
    include: { user: { select: { name: true, phone: true } } }
  });

  for (const p of patients) {
    if (!p.user?.phone) continue;
    if (inGracePeriod(p, rule.gracePeriodDays)) continue;
    if (await alreadySent(rule.id, p.id, cooldownDays)) continue;

    const msg = resolveTemplate(rule.messageBody || '', { nome: p.user.name?.split(' ')[0] || '' });
    await sendAndLog(rule, p, msg);
  }
}

// ════════════════════════════════════════════
//  TICK — Executado a cada 10 minutos
// ════════════════════════════════════════════

const handlers = {
  WELCOME: handleWelcome,
  APPOINTMENT_REMINDER: handleAppointmentReminder,
  WEEKLY_MOTIVATIONAL: handleWeeklyMotivational,
  WEIGH_REMINDER: handleWeighReminder,
  INACTIVITY_ALERT: handleInactivityAlert,
};

async function tick() {
  try {
    const rules = await prisma.automationRule.findMany({ where: { enabled: true } });
    for (const rule of rules) {
      const handler = handlers[rule.type];
      if (!handler) continue;
      try { await handler(rule); }
      catch (e) { console.error(`[AUTO] Erro handler ${rule.type}:`, e.message); }
    }
  } catch (e) {
    console.error('[AUTO] Erro no tick:', e.message);
  }
}

function start() {
  console.log('[AUTO] Automation engine started (every 10 min)');
  cron.schedule('*/10 * * * *', tick);
  // Run once on startup after 30s delay
  setTimeout(tick, 30000);
}

module.exports = { start, tick };

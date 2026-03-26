// ============================================================
// AGENDADOR DE MENSAGENS AUTOMÁTICAS
//
// Usa node-cron para disparar mensagens de WhatsApp
// automaticamente nos momentos certos.
//
// Jobs configurados:
//   - Toda segunda 08:00 → início de semana (pacientes ativos)
//   - Todo dia 09:00     → lembrete de consulta (retorno amanhã)
//   - Todo dia 08:30     → lembrete de exames (semanas 4, 8, 16)
// ============================================================

let cron;
try {
  cron = require('node-cron');
} catch {
  console.warn('[SCHEDULER] node-cron não instalado. Rode: npm install node-cron');
  cron = null;
}

const {
  sendWeekStart,
  sendConsultaReminder,
  sendExamReminder,
  sendProgramCompletion,
} = require('./whatsapp');

// Semanas que exigem exames laboratoriais
const EXAM_WEEKS = [4, 8, 16];

// Verifica se duas datas são o mesmo dia
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()    === b.getMonth()
    && a.getDate()     === b.getDate();
}

// Calcula semana atual do paciente com base na data de início
function calcWeekNum(startDate) {
  if (!startDate) return null;
  const diffMs   = Date.now() - new Date(startDate).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(16, Math.max(1, Math.floor(diffDays / 7) + 1));
}

// Busca todos os pacientes ativos com dados necessários
async function getActivePatients(prisma) {
  try {
    return await prisma.patient.findMany({
      where: { cycles: { some: { status: 'ACTIVE' } } },
      include: {
        user:   { select: { name: true, phone: true } },
        cycles: { where: { status: 'ACTIVE' }, orderBy: { number: 'desc' }, take: 1 }
      }
    });
  } catch (err) {
    console.error('[SCHEDULER] Erro ao buscar pacientes:', err.message);
    return [];
  }
}

// ── Job 1: Início de semana — toda segunda às 08:00 ────────

async function jobWeekStart(prisma) {
  console.log('[SCHEDULER] Rodando job início de semana...');
  const patients = await getActivePatients(prisma);
  let sent = 0;

  for (const p of patients) {
    const phone = p.user?.phone;
    if (!phone) continue;

    const cycle = p.cycles?.[0];
    if (!cycle?.startDate) continue;

    const weekNum = calcWeekNum(cycle.startDate);
    if (!weekNum) continue;

    try {
      await sendWeekStart({
        name:  p.user.name,
        phone,
      }, weekNum);
      sent++;
      // Pequena pausa para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[SCHEDULER] Erro ao enviar week_start para ${p.user.name}:`, err.message);
    }
  }
  console.log(`[SCHEDULER] Week start: ${sent}/${patients.length} enviados`);
}

// ── Job 2: Lembrete de consulta — todo dia às 09:00 ───────

async function jobConsultaReminder(prisma) {
  console.log('[SCHEDULER] Rodando job lembrete de consulta...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const patients = await getActivePatients(prisma);
  let sent = 0;

  for (const p of patients) {
    const phone = p.user?.phone;
    if (!phone) continue;
    if (!p.nextReturn) continue;

    const returnDate = new Date(p.nextReturn);
    if (!sameDay(returnDate, tomorrow)) continue;

    try {
      await sendConsultaReminder({ name: p.user.name, phone });
      sent++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[SCHEDULER] Erro ao enviar consulta_reminder para ${p.user.name}:`, err.message);
    }
  }
  console.log(`[SCHEDULER] Consulta reminder: ${sent} enviados`);
}

// ── Job 3: Lembrete de exames — todo dia às 08:30 ─────────

async function jobExamReminder(prisma) {
  console.log('[SCHEDULER] Rodando job lembrete de exames...');
  const patients = await getActivePatients(prisma);
  let sent = 0;

  for (const p of patients) {
    const phone = p.user?.phone;
    if (!phone) continue;

    const cycle = p.cycles?.[0];
    if (!cycle?.startDate) continue;

    const weekNum = calcWeekNum(cycle.startDate);
    if (!EXAM_WEEKS.includes(weekNum)) continue;

    // Só envia na segunda-feira da semana de exame (não reenvia toda semana)
    const weekStart = new Date(cycle.startDate);
    weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
    if (!sameDay(weekStart, new Date())) continue;

    try {
      await sendExamReminder({ name: p.user.name, phone }, weekNum);
      sent++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[SCHEDULER] Erro ao enviar exam_reminder para ${p.user.name}:`, err.message);
    }
  }
  console.log(`[SCHEDULER] Exam reminder: ${sent} enviados`);
}

// ── Job 4: Conclusão de programa — diário às 10:00 ────────

async function jobCompletion(prisma) {
  const patients = await getActivePatients(prisma);

  for (const p of patients) {
    const phone = p.user?.phone;
    if (!phone) continue;

    const cycle = p.cycles?.[0];
    if (!cycle?.startDate) continue;

    const weekNum = calcWeekNum(cycle.startDate);
    // Envia na semana 16, apenas na segunda-feira de início da semana
    if (weekNum !== 16) continue;

    const weekStart = new Date(cycle.startDate);
    weekStart.setDate(weekStart.getDate() + 15 * 7);
    if (!sameDay(weekStart, new Date())) continue;

    try {
      await sendProgramCompletion({
        name:          p.user.name,
        phone,
        initialWeight: p.initialWeight,
        currentWeight: p.currentWeight,
      });
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[SCHEDULER] Erro ao enviar completion para ${p.user.name}:`, err.message);
    }
  }
}

// ── Inicialização ──────────────────────────────────────────

function setupScheduler(prisma) {
  if (!cron) {
    console.warn('[SCHEDULER] node-cron indisponível. Scheduler desativado.');
    return;
  }

  console.log('[SCHEDULER] Iniciando agendador de mensagens...');

  // Toda segunda-feira às 08:00 (início de semana)
  cron.schedule('0 8 * * 1', () => jobWeekStart(prisma), { timezone: 'America/Sao_Paulo' });

  // Todo dia às 09:00 (lembrete de consulta)
  cron.schedule('0 9 * * *', () => jobConsultaReminder(prisma), { timezone: 'America/Sao_Paulo' });

  // Todo dia às 08:30 (lembrete de exames — só processa se for semana certa)
  cron.schedule('30 8 * * *', () => jobExamReminder(prisma), { timezone: 'America/Sao_Paulo' });

  // Todo dia às 10:00 (conclusão de programa — só processa semana 16)
  cron.schedule('0 10 * * *', () => jobCompletion(prisma), { timezone: 'America/Sao_Paulo' });

  console.log('[SCHEDULER] Jobs registrados:');
  console.log('  - Seg 08:00 → Início de semana');
  console.log('  - Diário 08:30 → Lembrete de exames (semanas 4, 8, 16)');
  console.log('  - Diário 09:00 → Lembrete de consulta (retorno amanhã)');
  console.log('  - Diário 10:00 → Conclusão de programa (semana 16)');
}

module.exports = { setupScheduler, calcWeekNum };

// ============================================================
// SERVIÇO DE WHATSAPP — Evolution API + Gemini AI
//
// Variáveis de ambiente necessárias:
//   EVOLUTION_API_URL   → https://evolution-evolution-api.xy1pmp.easypanel.host
//   EVOLUTION_API_KEY   → chave da Evolution API
//   EVOLUTION_INSTANCE  → nome da instância (ex: Mariana_Wogel_Instituto)
//   GEMINI_API_KEY      → chave da API do Google Gemini
// ============================================================

const https = require('https');
const http  = require('http');

// ── Helpers de HTTP (sem axios, sem dependência extra) ──────

function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ── Formata número para padrão Evolution (55XXXXXXXXXXX) ───

function formatPhoneBR(raw) {
  if (!raw) return null;
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, '');
  // Se já começa com 55 e tem 12-13 dígitos, está ok
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  // Se tem 11 dígitos (0XX XXXXX-XXXX), adiciona 55
  if (digits.length === 11) return '55' + digits;
  // Se tem 10 dígitos, adiciona 55
  if (digits.length === 10) return '55' + digits;
  return null;
}

// ── Gemini AI — formata mensagem ───────────────────────────

async function formatWithGemini(type, data) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.log('[GEMINI] Chave não configurada, usando template padrão');
    return defaultTemplate(type, data);
  }

  const systemInstruction = `Você formata mensagens de WhatsApp para pacientes de um programa médico de emagrecimento chamado "Programa Ser Livre" do Instituto Dra. Mariana Wogel.

Regras obrigatórias:
- Máximo 1 emoji por mensagem (apenas quando necessário)
- Informação em tópicos curtos com hífen (-)
- Sem frases motivacionais ou clichês
- Sem excessos de entusiasmo
- Direto ao ponto
- Português BR informal mas profissional
- Máximo 200 palavras
- Comece com "Olá [nome],"`;

  const prompts = {
    welcome: `Crie uma mensagem de boas-vindas ao programa. Dados: ${JSON.stringify(data)}. Informe: que foi cadastrada no programa, o plano contratado, que receberá acesso ao app, e o próximo passo (aguardar contato da equipe).`,
    week_start: `Crie uma mensagem de início de semana do programa. Dados: ${JSON.stringify(data)}. Informe: número da semana que inicia, o que está previsto para esta semana (pesagem, consulta se houver).`,
    weighin_report: `Crie uma mensagem com o resultado da pesagem semanal. Dados: ${JSON.stringify(data)}. Informe: semana de referência, peso atual, variação de peso em relação à semana anterior SEMPRE com sinal (use "-" para perda de peso e "+" para ganho, ex: "-1.5kg" ou "+0.3kg"), composição corporal se disponível. Felicite com discrição se houver perda.`,
    consulta_reminder: `Crie uma mensagem de lembrete de consulta. Dados: ${JSON.stringify(data)}. Informe: que tem consulta amanhã, data e horário se disponível, para levar exames se necessário.`,
    exam_reminder: `Crie uma mensagem lembrando sobre exames laboratoriais. Dados: ${JSON.stringify(data)}. Informe: que é o momento de realizar exames de acompanhamento (conforme protocolo da semana ${data.weekNum}). Liste os principais: hemograma, glicemia, perfil lipídico, TSH.`,
    completion: `Crie uma mensagem de conclusão do programa de 16 semanas. Dados: ${JSON.stringify(data)}. Informe: parabéns pela conclusão, resultados alcançados (peso perdido, composição), próximos passos.`,
  };

  try {
    const prompt = prompts[type] || `Crie uma mensagem informativa. Dados: ${JSON.stringify(data)}`;
    const response = await httpRequest(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 }
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text.trim();
    console.warn('[GEMINI] Resposta inesperada:', response.data);
    return defaultTemplate(type, data);
  } catch (err) {
    console.error('[GEMINI] Erro:', err.message);
    return defaultTemplate(type, data);
  }
}

// ── Templates padrão (fallback sem Gemini) ─────────────────

function defaultTemplate(type, data) {
  const n = data.name || 'paciente';
  switch (type) {
    case 'welcome':
      return `Olá ${n},\n\nSeu cadastro no Programa Ser Livre foi realizado.\n\n- Plano: ${data.plan || 'conforme contratado'}\n- Em breve você receberá o acesso ao aplicativo\n- Nossa equipe entrará em contato para orientações iniciais\n\nInstituto Dra. Mariana Wogel`;

    case 'week_start':
      return `Olá ${n},\n\nSemana ${data.weekNum} do programa iniciada.\n\n- Pesagem desta semana: ${data.weighDate || 'a combinar com a equipe'}\n- Mantenha o protocolo em dia\n\nQualquer dúvida, fale com a equipe.`;

    case 'weighin_report': {
      const diff = data.previousWeight ? +(data.previousWeight - data.currentWeight).toFixed(1) : null;
      // diff > 0 = perdeu peso (bom), diff < 0 = ganhou peso
      const sign = diff !== null ? (diff >= 0 ? '-' : '+') : null;
      const absDiff = diff !== null ? Math.abs(diff).toFixed(1) : null;
      const diffText = diff !== null ? `- Variação: ${sign}${absDiff}kg em relação à semana anterior` : '';
      return `Olá ${n},\n\nResultado da pesagem — Semana ${data.weekNum}:\n\n- Peso atual: ${data.currentWeight}kg\n${diffText}${data.massaMagra ? `\n- Massa magra: ${data.massaMagra}kg` : ''}${data.massaGordura ? `\n- Massa gorda: ${data.massaGordura}kg` : ''}\n\nAcompanhe sua evolução pelo aplicativo.`;
    }

    case 'consulta_reminder':
      return `Olá ${n},\n\nLembrete: você tem consulta de retorno amanhã.\n\n- Leve seus exames caso tenha feito\n- Registre seu peso antes da consulta\n\nInstituto Dra. Mariana Wogel`;

    case 'exam_reminder':
      return `Olá ${n},\n\nSemana ${data.weekNum} do programa — momento de realizar exames.\n\nExames solicitados:\n- Hemograma completo\n- Glicemia em jejum\n- Perfil lipídico\n- TSH\n\nAgende com antecedência e traga os resultados na próxima consulta.`;

    case 'completion':
      return `Olá ${n},\n\nParabéns pela conclusão das 16 semanas do programa.\n\n- Peso inicial: ${data.initialWeight}kg\n- Peso final: ${data.currentWeight}kg\n- Total: ${(data.initialWeight - data.currentWeight).toFixed(1)}kg\n\nNossa equipe entrará em contato para orientações de manutenção.`;

    default:
      return `Olá ${n},\n\nMensagem do Programa Ser Livre — Instituto Dra. Mariana Wogel.`;
  }
}

// ── Envio via Evolution API ────────────────────────────────

async function sendWhatsApp(phone, message) {
  const BASE   = process.env.EVOLUTION_API_URL;
  const KEY    = process.env.EVOLUTION_API_KEY;
  const INST   = process.env.EVOLUTION_INSTANCE;

  if (!BASE || !KEY || !INST) {
    console.log(`[WHATSAPP] Não configurado. Mensagem para ${phone}:\n${message}`);
    return { ok: false, reason: 'not_configured' };
  }

  const number = formatPhoneBR(phone);
  if (!number) {
    console.warn(`[WHATSAPP] Número inválido: ${phone}`);
    return { ok: false, reason: 'invalid_phone' };
  }

  try {
    const res = await httpRequest(
      `${BASE}/message/sendText/${INST}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': KEY },
      },
      { number, text: message }
    );

    if (res.status >= 200 && res.status < 300) {
      console.log(`[WHATSAPP] Enviado para ${number}`);
      return { ok: true, data: res.data };
    } else {
      console.error(`[WHATSAPP] Erro ${res.status}:`, res.data);
      return { ok: false, reason: `http_${res.status}`, data: res.data };
    }
  } catch (err) {
    console.error('[WHATSAPP] Erro de rede:', err.message);
    return { ok: false, reason: err.message };
  }
}

// ── Funções de mensagem específicas ───────────────────────

async function sendWelcome(patient) {
  const msg = await formatWithGemini('welcome', {
    name: patient.name,
    plan: patient.plan,
  });
  return sendWhatsApp(patient.phone, msg);
}

async function sendWeekStart(patient, weekNum) {
  const msg = await formatWithGemini('week_start', {
    name: patient.name,
    weekNum,
  });
  return sendWhatsApp(patient.phone, msg);
}

async function sendWeighInReport(patient, weighData) {
  const msg = await formatWithGemini('weighin_report', {
    name:           patient.name,
    weekNum:        weighData.weekNum,
    currentWeight:  weighData.currentWeight,
    previousWeight: weighData.previousWeight,
    massaMagra:     weighData.massaMagra,
    massaGordura:   weighData.massaGordura,
  });
  return sendWhatsApp(patient.phone, msg);
}

async function sendConsultaReminder(patient) {
  const msg = await formatWithGemini('consulta_reminder', {
    name: patient.name,
  });
  return sendWhatsApp(patient.phone, msg);
}

async function sendExamReminder(patient, weekNum) {
  const msg = await formatWithGemini('exam_reminder', {
    name: patient.name,
    weekNum,
  });
  return sendWhatsApp(patient.phone, msg);
}

async function sendProgramCompletion(patient) {
  const msg = await formatWithGemini('completion', {
    name:          patient.name,
    initialWeight: patient.initialWeight,
    currentWeight: patient.currentWeight,
  });
  return sendWhatsApp(patient.phone, msg);
}

// ── Envia mídia (imagem ou PDF) via Evolution API ─────────
// mediaData: { base64, mimeType, fileName, caption }

async function sendMedia(phone, mediaData) {
  const BASE = process.env.EVOLUTION_API_URL;
  const KEY  = process.env.EVOLUTION_API_KEY;
  const INST = process.env.EVOLUTION_INSTANCE;

  if (!BASE || !KEY || !INST) return { ok: false, reason: 'not_configured' };

  const number = formatPhoneBR(phone);
  if (!number) return { ok: false, reason: 'invalid_phone' };

  // Determina o tipo de mídia
  const isImage = mediaData.mimeType?.startsWith('image/');
  const mediatype = isImage ? 'image' : 'document';

  const mimeType = mediaData.mimeType || 'image/png';
  const fileName = mediaData.fileName || (isImage ? 'imagem.png' : 'documento.pdf');

  // Evolution API aceita base64 puro OU com prefixo data URI
  // Garante que o base64 é puro (sem prefixo)
  const pureBase64 = mediaData.base64.replace(/^data:[^;]+;base64,/, '');

  try {
    const body = {
      number,
      mediatype,
      mimetype:  mimeType,
      caption:   mediaData.caption || '',
      media:     pureBase64,
      fileName,
    };
    console.log(`[WHATSAPP MEDIA] Enviando ${mediatype} (${fileName}) para ${number}, tamanho base64: ${pureBase64.length} chars`);

    const res = await httpRequest(
      `${BASE}/message/sendMedia/${INST}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': KEY } },
      body
    );

    console.log(`[WHATSAPP MEDIA] Resposta ${res.status}:`, JSON.stringify(res.data).slice(0, 200));

    if (res.status >= 200 && res.status < 300) {
      console.log(`[WHATSAPP] Mídia enviada para ${number}`);
      return { ok: true, data: res.data };
    }

    // Tenta com prefixo data URI (algumas versões da Evolution API exigem isso)
    console.warn(`[WHATSAPP MEDIA] Tentando com prefixo data URI...`);
    const res2 = await httpRequest(
      `${BASE}/message/sendMedia/${INST}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': KEY } },
      { ...body, media: `data:${mimeType};base64,${pureBase64}` }
    );

    console.log(`[WHATSAPP MEDIA] Resposta 2 ${res2.status}:`, JSON.stringify(res2.data).slice(0, 200));

    if (res2.status >= 200 && res2.status < 300) {
      return { ok: true, data: res2.data };
    }
    return { ok: false, reason: `http_${res2.status}`, data: res2.data };

  } catch (err) {
    console.error('[WHATSAPP] Erro de rede (mídia):', err.message);
    return { ok: false, reason: err.message };
  }
}

// ── Verifica status da instância ───────────────────────────

async function checkStatus() {
  const BASE = process.env.EVOLUTION_API_URL;
  const KEY  = process.env.EVOLUTION_API_KEY;
  const INST = process.env.EVOLUTION_INSTANCE;
  if (!BASE || !KEY || !INST) return { connected: false, reason: 'not_configured' };

  try {
    const res = await httpRequest(
      `${BASE}/instance/fetchInstances?instanceName=${INST}`,
      { headers: { 'apikey': KEY } }
    );
    const inst = Array.isArray(res.data) ? res.data[0] : res.data;
    const state = inst?.instance?.state || inst?.state;
    return { connected: state === 'open', state, instance: INST };
  } catch (err) {
    return { connected: false, reason: err.message };
  }
}

module.exports = {
  sendWhatsApp,
  sendMedia,
  sendWelcome,
  sendWeekStart,
  sendWeighInReport,
  sendConsultaReminder,
  sendExamReminder,
  sendProgramCompletion,
  checkStatus,
  formatWithGemini,
  formatPhoneBR,
};

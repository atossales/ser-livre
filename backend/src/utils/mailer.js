// ============================================================
// SERVIÇO DE E-MAIL — Resend SDK
//
// Variáveis de ambiente necessárias:
//   RESEND_API_KEY  → chave da API do Resend
//   RESEND_FROM     → remetente (ex: "Ser Livre <noreply@seudominio.com>")
//                     padrão: onboarding@resend.dev (sem precisar de domínio)
//   APP_URL         → URL do frontend (ex: https://clawdbot-frontend.xy1pmp.easypanel.host)
// ============================================================

const { Resend } = require('resend');

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM    = process.env.RESEND_FROM || 'Instituto Ser Livre <onboarding@resend.dev>';

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ── Helpers de template ────────────────────────────────────

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Instituto Dra. Mariana Wogel</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#4A7C59,#2E5438);padding:28px 32px;text-align:center;">
            <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Instituto Dra. Mariana Wogel</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;">Programa Ser Livre</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr>
          <td style="background:#f9f9f7;padding:20px 32px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
              Instituto Dra. Mariana Wogel — Programa Ser Livre<br/>
              Este é um e-mail automático, não responda diretamente.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label, href) {
  return `<a href="${href}" style="display:inline-block;background:#4A7C59;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin:20px 0;">${label}</a>`;
}

function note(text) {
  return `<p style="font-size:12px;color:#999;margin-top:8px;">${text}</p>`;
}

// ── Email 1: Convite para membro da equipe ─────────────────

async function sendInviteEmail(to, name, link) {
  const resend = getClient();
  if (!resend) {
    console.warn(`[MAILER] RESEND_API_KEY não configurado. Convite para ${name} <${to}> NÃO enviado.`);
    return { ok: false, reason: 'not_configured' };
  }

  const firstName = name.split(' ')[0];
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#2E5438;">Bem-vindo(a) à equipe, ${firstName}! 👋</h2>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 8px;">
      Você foi adicionado(a) à equipe do <strong>Instituto Dra. Mariana Wogel</strong>.<br/>
      Clique abaixo para criar sua senha e acessar o sistema.
    </p>
    <div style="text-align:center;">${btn('Criar minha senha e acessar', link)}</div>
    <div style="background:#f0f7f3;border-radius:10px;padding:14px 16px;margin-top:4px;">
      <p style="margin:0;font-size:13px;color:#4A7C59;font-weight:600;">O que você encontrará no sistema:</p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#555;line-height:1.8;">
        <li>Fichas dos pacientes do programa</li>
        <li>Checklist semanal de acompanhamento</li>
        <li>Scores clínicos e evolução</li>
        <li>Comunicação via WhatsApp</li>
      </ul>
    </div>
    ${note('Este link expira em 72 horas. Se você não esperava este e-mail, ignore-o com segurança.')}
  `);

  try {
    const r = await resend.emails.send({ from: FROM, to, subject: `Bem-vindo(a) ao Programa Ser Livre — ${name}`, html });
    console.log(`[MAILER] Convite (equipe) enviado para ${to} | id: ${r.data?.id}`);
    return { ok: true };
  } catch (err) {
    console.error(`[MAILER] Erro ao enviar convite para ${to}:`, err.message);
    return { ok: false, reason: err.message };
  }
}

// ── Email 2: Boas-vindas ao paciente ──────────────────────

async function sendWelcomePatientEmail(to, name, link) {
  const resend = getClient();
  if (!resend) {
    console.warn(`[MAILER] RESEND_API_KEY não configurado. Boas-vindas para ${name} <${to}> NÃO enviado.`);
    return { ok: false, reason: 'not_configured' };
  }

  const firstName = name.split(' ')[0];
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#2E5438;">Olá, ${firstName}! Seja bem-vinda ao Programa Ser Livre 🌿</h2>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Sua jornada de transformação começa agora. Seu cadastro no programa foi realizado com sucesso.<br/>
      Para acessar o aplicativo e acompanhar sua evolução, crie sua senha clicando abaixo.
    </p>
    <div style="text-align:center;">${btn('Criar senha e acessar o app', link)}</div>
    <div style="background:#f0f7f3;border-radius:10px;padding:14px 16px;margin-top:8px;">
      <p style="margin:0 0 8px;font-size:13px;color:#4A7C59;font-weight:600;">No app você terá acesso a:</p>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#555;line-height:1.8;">
        <li>Seu histórico de peso e composição corporal</li>
        <li>Evolução dos seus scores clínicos</li>
        <li>Acompanhamento semanal do programa</li>
        <li>Comunicação direta com a equipe</li>
      </ul>
    </div>
    <p style="color:#555;font-size:13px;margin-top:16px;line-height:1.6;">
      Qualquer dúvida, nossa equipe está à disposição.<br/>
      <strong style="color:#4A7C59;">— Equipe Instituto Dra. Mariana Wogel</strong>
    </p>
    ${note('Este link expira em 72 horas.')}
  `);

  try {
    const r = await resend.emails.send({ from: FROM, to, subject: `Bem-vinda ao Programa Ser Livre, ${firstName}!`, html });
    console.log(`[MAILER] Boas-vindas (paciente) enviado para ${to} | id: ${r.data?.id}`);
    return { ok: true };
  } catch (err) {
    console.error(`[MAILER] Erro ao enviar boas-vindas para ${to}:`, err.message);
    return { ok: false, reason: err.message };
  }
}

// ── Email 3: Redefinição de senha ─────────────────────────

async function sendResetEmail(to, name, link) {
  const resend = getClient();
  if (!resend) {
    console.warn(`[MAILER] RESEND_API_KEY não configurado. Reset para ${name} <${to}> NÃO enviado.`);
    return { ok: false, reason: 'not_configured' };
  }

  const firstName = name.split(' ')[0];
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#2E5438;">Redefinição de senha</h2>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Olá, <strong>${firstName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta no Programa Ser Livre.
    </p>
    <div style="text-align:center;">${btn('Redefinir minha senha', link)}</div>
    <div style="background:#fff8e6;border:1px solid #f0d080;border-radius:10px;padding:12px 16px;margin-top:8px;">
      <p style="margin:0;font-size:13px;color:#8a6d00;">
        ⚠️ <strong>Não solicitou a redefinição?</strong><br/>
        Ignore este e-mail com segurança. Sua senha permanece inalterada.
      </p>
    </div>
    ${note('Este link expira em 1 hora. Por segurança, use-o apenas uma vez.')}
  `);

  try {
    const r = await resend.emails.send({ from: FROM, to, subject: 'Programa Ser Livre — Redefinição de senha', html });
    console.log(`[MAILER] Reset enviado para ${to} | id: ${r.data?.id}`);
    return { ok: true };
  } catch (err) {
    console.error(`[MAILER] Erro ao enviar reset para ${to}:`, err.message);
    return { ok: false, reason: err.message };
  }
}

module.exports = { sendInviteEmail, sendWelcomePatientEmail, sendResetEmail };

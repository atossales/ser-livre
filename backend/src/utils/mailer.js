// ============================================================
// SERVIÇO DE E-MAIL
//
// Usa Nodemailer para enviar e-mails transacionais.
// Configure as variáveis de ambiente no .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   APP_URL (ex: https://app.serlivre.com)
// ============================================================

const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const APP_URL = process.env.APP_URL || 'http://localhost';
const FROM = process.env.SMTP_FROM || '"Programa Ser Livre" <noreply@serlivre.com>';

/**
 * Envia convite para novo usuário criar sua senha
 */
async function sendInviteEmail(to, name, token) {
  if (!process.env.SMTP_USER) {
    console.log(`[MAILER] SMTP não configurado. Link de convite para ${name}: ${APP_URL}/convite/${token}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Bem-vindo ao Programa Ser Livre — Crie sua senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B6D1E;">Bem-vindo ao Programa Ser Livre, ${name}!</h2>
        <p>Sua conta foi criada. Clique no botão abaixo para definir sua senha e acessar o sistema:</p>
        <a href="${APP_URL}/convite/${token}"
           style="display:inline-block; background:#8B6D1E; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; margin:16px 0;">
          Criar minha senha
        </a>
        <p style="color:#666; font-size:14px;">Este link expira em 72 horas.</p>
        <p style="color:#999; font-size:12px;">Se você não esperava este e-mail, ignore-o.</p>
      </div>
    `
  });
}

/**
 * Envia e-mail de redefinição de senha
 */
async function sendResetEmail(to, name, token) {
  if (!process.env.SMTP_USER) {
    console.log(`[MAILER] SMTP não configurado. Link de reset para ${name}: ${APP_URL}/redefinir-senha/${token}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Programa Ser Livre — Redefinição de senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B6D1E;">Redefinição de senha</h2>
        <p>Olá ${name}, recebemos uma solicitação para redefinir sua senha.</p>
        <a href="${APP_URL}/redefinir-senha/${token}"
           style="display:inline-block; background:#8B6D1E; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; margin:16px 0;">
          Redefinir minha senha
        </a>
        <p style="color:#666; font-size:14px;">Este link expira em 1 hora.</p>
        <p style="color:#999; font-size:12px;">Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.</p>
      </div>
    `
  });
}

module.exports = { sendInviteEmail, sendResetEmail };

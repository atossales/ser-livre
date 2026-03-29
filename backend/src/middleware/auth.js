// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO — via Supabase Auth
//
// "Middleware" é como um segurança na porta. Antes de qualquer
// requisição chegar na rota, ele verifica:
// 1. O usuário tem um token Supabase válido? (está logado?)
// 2. O usuário tem permissão para isso? (é médica? paciente?)
//
// O token JWT é emitido pelo Supabase Auth. Validamos usando
// supabaseAdmin.auth.getUser(token) — sem segredo local.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const prisma = require('../lib/prisma');

// Cliente Supabase com a service role key (acesso total ao Auth Admin API)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Verifica se o usuário está autenticado (logado via Supabase Auth)
 * Se sim, coloca os dados do usuário em req.user
 */
async function authRequired(req, res, next) {
  try {
    // Pega o token do header "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    // Valida o token com o Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Busca o perfil do usuário no banco (id é UUID string do Supabase)
    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: { patient: true }
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Coloca os dados do usuário na requisição
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Erro ao verificar autenticação' });
  }
}

/**
 * Verifica se o usuário tem um dos papéis permitidos
 * Exemplo de uso: requireRole('MEDICA', 'NUTRICIONISTA')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Sem permissão. Papel necessário: ' + roles.join(' ou ')
      });
    }
    next();
  };
}

/**
 * Middleware especial para pacientes:
 * Garante que o paciente só acessa seus próprios dados
 */
function onlyOwnData(req, res, next) {
  if (req.user.role === 'PACIENTE') {
    // Suporta tanto :id quanto :patientId como nome do parâmetro
    const paramId = req.params.id || req.params.patientId;
    if (paramId && req.user.patient) {
      const numId = Number(paramId);
      // Se não for número finito ou não pertencer ao paciente logado, bloqueia
      if (!Number.isFinite(numId) || numId !== req.user.patient.id) {
        return res.status(403).json({ error: 'Acesso negado a dados de outro paciente' });
      }
    }
  }
  next();
}

module.exports = { supabaseAdmin, authRequired, requireRole, onlyOwnData };

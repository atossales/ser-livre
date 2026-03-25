// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO
//
// "Middleware" é como um segurança na porta. Antes de qualquer
// requisição chegar na rota, ele verifica:
// 1. O usuário tem um token válido? (está logado?)
// 2. O usuário tem permissão para isso? (é médica? paciente?)
//
// JWT = JSON Web Token. É como um "crachá digital" que o
// sistema dá quando o usuário faz login. Cada requisição
// depois disso manda esse crachá para provar quem é.
// ============================================================

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verifica se o usuário está autenticado (logado)
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

    // Verifica se o token é válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { patient: true }
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Coloca os dados do usuário na requisição
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
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
    // Se for paciente, só pode ver dados do próprio patient.id
    if (req.params.patientId && req.user.patient) {
      if (parseInt(req.params.patientId) !== req.user.patient.id) {
        return res.status(403).json({ error: 'Acesso negado a dados de outro paciente' });
      }
    }
  }
  next();
}

module.exports = { authRequired, requireRole, onlyOwnData };

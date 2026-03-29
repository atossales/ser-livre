// ============================================================
// PRISMA SINGLETON
// Garante que apenas uma instância do PrismaClient existe
// em toda a aplicação — evita pool exhaustion e conflitos.
// ============================================================

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

module.exports = globalForPrisma.prisma;

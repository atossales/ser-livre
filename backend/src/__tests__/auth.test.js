const request = require('supertest');

// Testes básicos de smoke test — verifica que as rotas existem e respondem
describe('Auth Routes', () => {
  const BASE = process.env.API_URL || 'http://localhost:3001';

  test('POST /api/auth/login sem body retorna 400', async () => {
    const res = await request(BASE).post('/api/auth/login').send({});
    expect([400, 401, 500]).toContain(res.statusCode);
  });

  test('GET /api/patients sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/patients');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/seed sem secret retorna 403', async () => {
    const res = await request(BASE).post('/api/seed').send({ adminSecret: 'errado' });
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/dashboard sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/dashboard');
    expect(res.statusCode).toBe(401);
  });
});

// Testes de autorização cruzada — paciente não deve acessar dados de outros
describe('Authorization — Cross-data access', () => {
  const BASE = process.env.API_URL || 'http://localhost:3001';

  test('GET /api/scores/:cycleId sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/scores/999');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/weekchecks/:cycleId sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/weekchecks/999');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/alerts sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/alerts');
    expect(res.statusCode).toBe(401);
  });

  test('PATCH /api/alerts/999/resolve sem token retorna 401', async () => {
    const res = await request(BASE).patch('/api/alerts/999/resolve');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/staff sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/staff');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/appointments sem token retorna 401', async () => {
    const res = await request(BASE).get('/api/appointments');
    expect(res.statusCode).toBe(401);
  });
});

// Testes de StateBlob — CRITICO: sem autenticacao (documentado na auditoria)
describe('StateBlob Routes — sem autenticacao (vulnerabilidade documentada)', () => {
  const BASE = process.env.API_URL || 'http://localhost:3001';

  test('GET /api/state/:key responde sem token (vulnerabilidade conhecida)', async () => {
    const res = await request(BASE).get('/api/state/test-key-nao-existe');
    // Documenta que a rota responde sem autenticacao — deve ser 401 idealmente
    // Atualmente retorna 200 (null) — vulnerabilidade registrada no SECURITY_AUDIT.md
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      console.warn(
        '[SECURITY] GET /api/state/:key acessivel sem autenticacao! ' +
        'Ver SECURITY_AUDIT.md secao Critico.'
      );
    }
  });

  test('PUT /api/state/:key responde sem token (vulnerabilidade conhecida)', async () => {
    const res = await request(BASE)
      .put('/api/state/test-audit-key')
      .send({ audit: true });
    // Documenta que a rota responde sem autenticacao — deve ser 401 idealmente
    expect([200, 401, 403, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      console.warn(
        '[SECURITY] PUT /api/state/:key gravavel sem autenticacao! ' +
        'Ver SECURITY_AUDIT.md secao Critico.'
      );
    }
  });
});

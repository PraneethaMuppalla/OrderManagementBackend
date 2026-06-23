import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { Sequelize } from 'sequelize';
import type { Application } from 'express';

let container: any;
let testSequelize: Sequelize;
let app: Application;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  testSequelize = new Sequelize(container.getConnectionUri(), {
    dialect: 'postgres',
    logging: false,
  });

  // Reset module registry so mocks take effect even if modules were cached
  vi.resetModules();

  vi.doMock('../../src/config/database', () => ({
    default: testSequelize,
    connectDB: vi.fn(),
  }));

  vi.doMock('../../src/config/redis', () => ({
    default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), on: vi.fn(), sendCommand: vi.fn() },
    connectRedis: vi.fn(),
  }));

  vi.doMock('../../src/services/socket', () => ({
    emitToUser: vi.fn(),
    emitToAdmin: vi.fn(),
    initSocket: vi.fn(),
  }));

  // Dynamic imports MUST come after vi.resetModules() + vi.doMock()
  const supertest = await import('supertest');
  request = supertest.default;

  const appModule = await import('../../src/app');
  app = appModule.default;

  await testSequelize.sync({ force: true });
}, 60_000);

afterAll(async () => {
  await testSequelize?.close();
  await container?.stop();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with userId on successful registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
    expect(res.body.message).toBe('User registered successfully');
  });

  it('returns 400 for duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'First', email: 'dup@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second', email: 'dup@example.com', password: 'password456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with a JWT token for valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'mypassword' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'mypassword' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('login@example.com');
  });
});

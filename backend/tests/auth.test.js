const request = require('supertest');
const app = require('../src/app');

// Mock database query
jest.mock('../src/config/database', () => {
  const actualDb = jest.requireActual('../src/config/database');
  return {
    ...actualDb,
    query: jest.fn(),
    testConnection: jest.fn().mockResolvedValue(true),
  };
});

const { query } = require('../src/config/database');
const bcrypt = require('bcryptjs');

describe('Auth & Permission Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns 200 with status info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('API is running');
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects invalid email or missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects login for non-existent user', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@college.edu', password: 'Password@123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('logs in successfully and sets cookie for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Correct@123', 10);
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Test Coordinator',
            email: 'admin@college.edu',
            phone: '9999999999',
            role: 'admin',
            password_hash: hashedPassword,
            must_change_password: false,
            batch_id: null,
            is_active: true,
          },
        ],
      });
      // Audit log query
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@college.edu', password: 'Correct@123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@college.edu');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Protected Route Role Checks', () => {
    it('rejects unauthenticated requests to /api/batches', async () => {
      const res = await request(app).get('/api/batches');
      expect(res.statusCode).toBe(401);
    });
  });
});

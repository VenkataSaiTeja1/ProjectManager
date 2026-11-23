const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/config/database', () => {
  const actualDb = jest.requireActual('../src/config/database');
  return {
    ...actualDb,
    query: jest.fn(),
    testConnection: jest.fn().mockResolvedValue(true),
  };
});

const { query } = require('../src/config/database');
const { JWT_SECRET } = require('../src/middleware/auth');

describe('Daily Tracker & Access Control Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const generateAuthCookie = (user) => {
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    return `token=${token}`;
  };

  it('rejects faculty or student accessing admin daily tracker', async () => {
    const studentUser = { id: 10, email: 'student@college.edu', role: 'student', is_active: true };
    const cookie = generateAuthCookie(studentUser);

    // Mock query for authenticate middleware
    query.mockResolvedValueOnce({
      rows: [studentUser],
    });

    const res = await request(app)
      .get('/api/daily-updates/tracker')
      .set('Cookie', cookie);

    expect(res.statusCode).toBe(403);
  });

  it('allows admin to query daily tracker with proper submitted/not-submitted counts', async () => {
    const adminUser = { id: 1, email: 'admin@college.edu', role: 'admin', is_active: true };
    const cookie = generateAuthCookie(adminUser);

    // Mock query for authenticate middleware
    query.mockResolvedValueOnce({ rows: [adminUser] });
    // Mock query for holiday check
    query.mockResolvedValueOnce({ rows: [] });
    // Mock query for teams & daily updates
    query.mockResolvedValueOnce({
      rows: [
        {
          team_id: 1,
          team_name: 'Team Alpha',
          project_title: 'AI System',
          batch_id: 1,
          batch_name: '2027 Batch',
          lead_id: 2,
          lead_name: 'Lead Arun',
          lead_email: 'arun@student.edu',
          lead_phone: '9000000001',
          guide_name: 'Dr. Ramesh',
          update_id: 101,
          done_today: 'Completed module 1',
          plan_tomorrow: 'Start module 2',
          blockers: null,
          percent_complete: 25,
          is_late: false,
          submitted_at: new Date().toISOString(),
          last_update_before: null,
        },
        {
          team_id: 2,
          team_name: 'Team Beta',
          project_title: 'IoT System',
          batch_id: 1,
          batch_name: '2027 Batch',
          lead_id: 3,
          lead_name: 'Lead Bhavya',
          lead_email: 'bhavya@student.edu',
          lead_phone: '9000000002',
          guide_name: 'Dr. Priya',
          update_id: null,
          done_today: null,
          plan_tomorrow: null,
          blockers: null,
          percent_complete: null,
          is_late: null,
          submitted_at: null,
          last_update_before: '2026-11-20',
        },
      ],
    });

    const res = await request(app)
      .get('/api/daily-updates/tracker?date=2026-11-23')
      .set('Cookie', cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total).toBe(2);
    expect(res.body.data.summary.submitted).toBe(1);
    expect(res.body.data.summary.notSubmitted).toBe(1);
    expect(res.body.data.submitted[0].team_name).toBe('Team Alpha');
    expect(res.body.data.notSubmitted[0].team_name).toBe('Team Beta');
    expect(res.body.data.notSubmitted[0].days_since_update).toBe(3);
  });
});

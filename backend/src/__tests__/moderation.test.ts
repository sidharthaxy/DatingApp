import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let userToken: string;
let userId: string;
let adminToken: string;
let targetUserId: string;

beforeEach(async () => {
  const authRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'mod_test_user' });
  userToken = authRes.body.data.accessToken;
  userId = authRes.body.data.user.id;

  const adminRes = await request(app)
    .post('/api/v1/auth/google')
    .send({ idToken: 'admin_test_user' });
  adminToken = adminRes.body.data.accessToken;

  const target = await prisma.user.create({
    data: {
      firebase_uid: 'mod_target_' + Date.now(),
      status: 'APPROVED',
      discover_enabled: true
    }
  });
  targetUserId = target.id;
});

describe('Moderation & Trust System', () => {
  it('should allow user to report and increment report count', async () => {
    const res = await request(app)
      .post(`/api/v1/reports/${targetUserId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'SPAM', evidence: 'Sent me a link' });
    
    expect(res.status).toBe(201);

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(target?.report_count).toBe(1);
    expect(target?.discover_enabled).toBe(true);
  });

  it('should enforce 5 reports per day rate limit', async () => {
    // Report 5 different targets
    for(let i=0; i<5; i++) {
      const t = await prisma.user.create({ data: { firebase_uid: `t_${i}_${Date.now()}` } });
      await request(app)
        .post(`/api/v1/reports/${t.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'SPAM' });
    }

    // Try 6th report
    const t6 = await prisma.user.create({ data: { firebase_uid: `t_6_${Date.now()}` } });
    const res = await request(app)
      .post(`/api/v1/reports/${t6.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'SPAM' });

    expect(res.status).toBe(429);
  });

  it('should automatically hide user at 10 reports', async () => {
    // Manually add 9 reports to the target from fake users
    await prisma.user.update({
      where: { id: targetUserId },
      data: { report_count: 9 }
    });

    const res = await request(app)
      .post(`/api/v1/reports/${targetUserId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'HARASSMENT' });
    
    expect(res.status).toBe(201);

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(target?.report_count).toBe(10);
    expect(target?.discover_enabled).toBe(false); // Auto-hidden
  });

  it('admin should be able to view reports and resolve by banning', async () => {
    // Add a report
    await request(app)
      .post(`/api/v1/reports/${targetUserId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'SCAM' });
    
    // View as admin
    const getRes = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.reports.length).toBeGreaterThan(0);
    
    // Find our specific report to prevent cross-test contamination
    const report = getRes.body.data.reports.find((r: any) => r.reported_id === targetUserId);

    // Resolve as ban
    const resolveRes = await request(app)
      .post(`/api/v1/admin/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'BAN', remark: 'Clear scammer' });
    
    expect(resolveRes.status).toBe(200);

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(target?.status).toBe('REJECTED');
    expect(target?.discover_enabled).toBe(false);
  });

  it('banned user should be able to appeal and admin can approve', async () => {
    const appealUserRes = await request(app).post('/api/v1/auth/google').send({ idToken: 'appeal_test_user' });
    const appealToken = appealUserRes.body.data.accessToken;
    const appealUserId = appealUserRes.body.data.user.id;

    await prisma.user.update({ where: { id: appealUserId }, data: { status: 'REJECTED', discover_enabled: false, report_count: 10 } });

    const appealRes = await request(app)
      .post('/api/v1/appeals')
      .set('Authorization', `Bearer ${appealToken}`)
      .send({ reason: 'My account was hacked' });

    expect(appealRes.status).toBe(201);
    const appealId = appealRes.body.data.appeal.id;

    // Admin approves appeal
    const adminRes = await request(app)
      .post(`/api/v1/admin/appeals/${appealId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });
    
    expect(adminRes.status).toBe(200);

    const checkUser = await prisma.user.findUnique({ where: { id: appealUserId } });
    expect(checkUser?.status).toBe('APPROVED');
    expect(checkUser?.discover_enabled).toBe(true);
    expect(checkUser?.report_count).toBe(0);
  });
});

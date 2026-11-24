import { clearDatabase, createTestApp, signUp, type TestApp } from './test-app';

describe('GET /api/quacks', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(t.prisma);
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('returns 401 to a visitor who is not signed in', async () => {
    await t.http().get('/api/quacks').expect(401);
  });

  it('returns 200 and an empty list to a signed-in user', async () => {
    const cookie = await signUp(t);

    const res = await t
      .http()
      .get('/api/quacks')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body).toEqual([]);
  });
});

// Likes (cases.md, section 2: A1-A16). HTTP against the real app and the test database.
import { clearDatabase, createTestApp, signUp, type TestApp } from './test-app';

type FeedRow = Record<string, unknown> & { id: string };

describe('likes API', () => {
  let t: TestApp;
  let a: { cookie: string; id: string };
  let b: { cookie: string; id: string };
  let c: { cookie: string; id: string };

  async function user(email: string, role?: 'admin') {
    const cookie = await signUp(t, email);
    const row = await t.prisma.user.findFirstOrThrow({ where: { email } });
    if (role) {
      await t.prisma.user.update({ where: { id: row.id }, data: { role } });
    }
    return { cookie, id: row.id };
  }

  const aQuack = (userId: string, data: object = {}) =>
    t.prisma.quack.create({ data: { text: 'quack', userId, ...data } });
  const seed = (quackId: string, userId: string) =>
    t.prisma.quackLike.create({ data: { quackId, userId } });
  const likeRows = (quackId: string) =>
    t.prisma.quackLike.findMany({ where: { quackId } });
  const put = (cookie: string, id: string) =>
    t.http().put(`/api/quacks/${id}/like`).set('Cookie', cookie);
  const del = (cookie: string, id: string) =>
    t.http().delete(`/api/quacks/${id}/like`).set('Cookie', cookie);
  const feed = async (cookie: string): Promise<FeedRow[]> =>
    (await t.http().get('/api/quacks').set('Cookie', cookie).expect(200))
      .body as FeedRow[];

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(t.prisma);
    a = await user('a@example.com');
    b = await user('b@example.com');
    c = await user('c@example.com');
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('A1 like: 200, { likeCount: 1, likedByMe: true }, one row in the database', async () => {
    const q = await aQuack(b.id);
    const res = await put(a.cookie, q.id).expect(200);
    expect(res.body).toEqual({ likeCount: 1, likedByMe: true });
    expect(await likeRows(q.id)).toHaveLength(1);
  });

  it('A2 unlike: 200, { likeCount: 0, likedByMe: false }, the row is gone', async () => {
    const q = await aQuack(b.id);
    await t.prisma.quackLike.create({ data: { quackId: q.id, userId: a.id } });
    const res = await del(a.cookie, q.id).expect(200);
    expect(res.body).toEqual({ likeCount: 0, likedByMe: false });
    expect(await likeRows(q.id)).toHaveLength(0);
  });

  it('A3 liking twice: 200, still one like, one row', async () => {
    const q = await aQuack(b.id);
    await put(a.cookie, q.id).expect(200);
    const res = await put(a.cookie, q.id).expect(200);
    expect(res.body).toEqual({ likeCount: 1, likedByMe: true });
    expect(await likeRows(q.id)).toHaveLength(1);
  });

  it('A4 two simultaneous likes: both 200, one row, no 500', async () => {
    const q = await aQuack(b.id);
    const [r1, r2] = await Promise.all([
      put(a.cookie, q.id),
      put(a.cookie, q.id),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(await likeRows(q.id)).toHaveLength(1);
  });

  it('A5 unliking without a like: 200, count unchanged, likedByMe false', async () => {
    const q = await aQuack(b.id);
    await t.prisma.quackLike.create({ data: { quackId: q.id, userId: b.id } });
    const res = await del(a.cookie, q.id).expect(200);
    expect(res.body).toEqual({ likeCount: 1, likedByMe: false });
    expect(await likeRows(q.id)).toHaveLength(1);
  });

  it('A6 without a session PUT, DELETE and GET all return 401 and nothing is written', async () => {
    const q = await aQuack(b.id);
    await t.http().put(`/api/quacks/${q.id}/like`).expect(401);
    await t.http().delete(`/api/quacks/${q.id}/like`).expect(401);
    await t.http().get('/api/quacks').expect(401);
    expect(await t.prisma.quackLike.count()).toBe(0);
  });

  it.each(['put', 'delete'] as const)(
    'A7 %s on a quack that does not exist: 404',
    async (method) => {
      await t
        .http()
        [method]('/api/quacks/does-not-exist/like')
        .set('Cookie', a.cookie)
        .expect(404);
    },
  );

  it.each(['put', 'delete'] as const)(
    'A8 %s on a deleted quack with replies: 404 and nothing is written',
    async (method) => {
      const q = await aQuack(b.id);
      await aQuack(c.id, { threadId: q.id, replyToId: q.id });
      await t.http().delete(`/api/quacks/${q.id}`).set('Cookie', b.cookie);
      expect(
        (await t.prisma.quack.findUniqueOrThrow({ where: { id: q.id } }))
          .deletedAt,
      ).not.toBeNull();

      await t
        .http()
        [method](`/api/quacks/${q.id}/like`)
        .set('Cookie', a.cookie)
        .expect(404);
      expect(await t.prisma.quackLike.count()).toBe(0);
    },
  );

  it('A9 the feed carries likeCount and likedByMe per viewer, never who liked', async () => {
    const q = await aQuack(c.id);
    await seed(q.id, a.id);
    await seed(q.id, b.id);

    const asA = (await feed(a.cookie)).find((r) => r.id === q.id);
    expect(asA).toMatchObject({ likeCount: 2, likedByMe: true });
    const asC = (await feed(c.cookie)).find((r) => r.id === q.id);
    expect(asC).toMatchObject({ likeCount: 2, likedByMe: false });

    const json = JSON.stringify(asA);
    expect(json).not.toContain(a.id);
    expect(json).not.toContain(b.id);
    expect(json).not.toContain('b@example.com');
    expect(asA).not.toHaveProperty('likes');
    expect(asA).not.toHaveProperty('likedBy');
  });

  it('A10 a reply has its own likeCount and likedByMe (GET /api/quacks/:id/replies; replies are not in the feed)', async () => {
    const q = await aQuack(c.id);
    const reply = await aQuack(b.id, { threadId: q.id, replyToId: q.id });
    await seed(reply.id, a.id);

    const res = await t
      .http()
      .get(`/api/quacks/${q.id}/replies`)
      .set('Cookie', a.cookie)
      .expect(200);
    const row = (res.body as FeedRow[]).find((r) => r.id === reply.id);
    expect(row).toMatchObject({ likeCount: 1, likedByMe: true });
    const parent = (await feed(a.cookie)).find((r) => r.id === q.id);
    expect(parent).toMatchObject({ likeCount: 0, likedByMe: false });
  });

  it('A11 a placeholder row in the feed has no likeCount, likedByMe, text or author', async () => {
    const q = await aQuack(b.id);
    await aQuack(c.id, { threadId: q.id, replyToId: q.id });
    await seed(q.id, a.id);
    await t.http().delete(`/api/quacks/${q.id}`).set('Cookie', b.cookie);

    const row = (await feed(a.cookie)).find((r) => r.id === q.id);
    expect(row).toMatchObject({ deleted: true, text: null, userId: null });
    expect(row?.likeCount ?? null).toBeNull();
    expect(row?.likedByMe ?? null).toBeNull();
    // A live quack next to it does carry the fields, so the two differ.
    const live = await aQuack(c.id);
    const liveRow = (await feed(a.cookie)).find((r) => r.id === live.id);
    expect(liveRow).toMatchObject({ likeCount: 0, likedByMe: false });
    // The like rows of the placeholder are gone too (ADR 0002).
    expect(await likeRows(q.id)).toHaveLength(0);
  });

  it('A12 deleting a quack without replies removes its likes', async () => {
    const q = await aQuack(b.id);
    await seed(q.id, a.id);
    await seed(q.id, c.id);
    await t.http().delete(`/api/quacks/${q.id}`).set('Cookie', b.cookie);
    expect(await likeRows(q.id)).toHaveLength(0);
  });

  it('A13 deleting a user removes their likes and lowers the counts by 1', async () => {
    const q1 = await aQuack(a.id);
    const q2 = await aQuack(b.id);
    await seed(q1.id, c.id);
    await seed(q2.id, c.id);
    await seed(q1.id, b.id);

    await t.prisma.user.delete({ where: { id: c.id } });

    expect(await t.prisma.quackLike.count({ where: { userId: c.id } })).toBe(0);
    const rows = await feed(a.cookie);
    expect(rows.find((r) => r.id === q1.id)).toMatchObject({ likeCount: 1 });
    expect(rows.find((r) => r.id === q2.id)).toMatchObject({ likeCount: 0 });
  });

  it("A14 a foreign userId in the body or query is ignored, the like is the session user's", async () => {
    const q = await aQuack(c.id);
    await t
      .http()
      .put(`/api/quacks/${q.id}/like?userId=${b.id}`)
      .set('Cookie', a.cookie)
      .send({ userId: b.id });
    const rows = await likeRows(q.id);
    expect(rows.map((r) => r.userId)).toEqual([a.id]);
    // Even if the server refuses extra fields, B must not get a like.
    expect(rows.some((r) => r.userId === b.id)).toBe(false);
  });

  it("A15 a moderator likes and unlikes like anyone, and cannot remove someone else's like", async () => {
    const m = await user('mod@example.com', 'admin');
    const q = await aQuack(b.id);
    await t.prisma.quackLike.create({ data: { quackId: q.id, userId: a.id } });

    expect((await put(m.cookie, q.id).expect(200)).body).toEqual({
      likeCount: 2,
      likedByMe: true,
    });
    expect((await put(m.cookie, q.id).expect(200)).body).toEqual({
      likeCount: 2,
      likedByMe: true,
    });
    expect((await del(m.cookie, q.id).expect(200)).body).toEqual({
      likeCount: 1,
      likedByMe: false,
    });
    // A's like survived the moderator's unlike, also when he has none left.
    expect((await del(m.cookie, q.id).expect(200)).body).toEqual({
      likeCount: 1,
      likedByMe: false,
    });
    expect((await likeRows(q.id)).map((r) => r.userId)).toEqual([a.id]);
  });

  it.each(['put', 'delete'] as const)(
    'A16 %s with an invalid id: 4xx and nothing is written',
    async (method) => {
      // Existing endpoints answer an unknown id with 404, so does this one.
      const res = await t
        .http()
        [method]('/api/quacks/%20%20/like')
        .set('Cookie', a.cookie);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(await t.prisma.quackLike.count()).toBe(0);
    },
  );
});

import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Config } from '@/shared/config/config.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

// Sign-up queues a verification email. React Email's renderer needs ESM dynamic
// import, which Jest does not provide, and the tests do not care about the mail.
jest.mock('@/core/email/render', () => ({
  renderEmail: () => Promise.resolve('<p>test email</p>'),
}));

export type TestApp = {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
};

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, app.get(Config));
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
  };
}

/** Deletes every row from every table, keeping the schema. */
export async function clearDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

/** Signs a new user up through the real auth endpoint and returns the session cookie. */
export async function signUp(
  { http }: TestApp,
  email = 'duck@example.com',
): Promise<string> {
  const res = await http()
    .post('/api/auth/sign-up/email')
    .set('Origin', process.env.FRONTEND_URL!)
    .send({ email, password: 'password-123', name: 'Test Duck' })
    .expect(200);
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  if (!cookies?.length) throw new Error('Sign-up did not set a session cookie');
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

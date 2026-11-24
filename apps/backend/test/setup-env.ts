// Runs in every test worker before any app code is imported.
// Integration tests talk to their own database, never the development one:
// TEST_DATABASE_URL (CI service, or the Docker Postgres from `pnpm dev` with
// a separate `quacker_test` database) is copied over DATABASE_URL.
import { assertTestDatabase, TEST_DATABASE_URL } from './test-database';

assertTestDatabase(TEST_DATABASE_URL);

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET ??=
  'integration-test-secret-integration-test-secret';
process.env.SUPERADMIN_EMAIL ??= 'admin@example.com';
process.env.SUPERADMIN_PASSWORD ??= 'adminpassword';
process.env.BACKEND_URL ??= 'http://127.0.0.1:4060';
process.env.FRONTEND_URL ??= 'http://127.0.0.1:3060';
// No mail provider in tests: emails fall back to the console adapter.
delete process.env.RESEND_API_KEY;
delete process.env.SMTP_HOST;

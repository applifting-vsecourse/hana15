import { execSync } from 'node:child_process';
import { assertTestDatabase, TEST_DATABASE_URL } from './test-database';

// Builds the schema from our Prisma migrations (creating the database if it
// does not exist yet) once before the suite starts.
export default function globalSetup(): void {
  assertTestDatabase(TEST_DATABASE_URL);
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

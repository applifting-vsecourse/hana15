export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://quacker:quacker@localhost:5434/quacker_test';

/**
 * The suite deletes all rows between tests, so it refuses to run against
 * anything that is not clearly a throwaway test database.
 */
export function assertTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against database "${name}": ` +
        'the name must end with "_test".',
    );
  }
}

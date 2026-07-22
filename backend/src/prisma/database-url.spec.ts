import {
  inspectPostgresConnectionString,
  normalizePostgresConnectionString,
} from './database-url';

describe('PostgreSQL connection URL', () => {
  it.each(['prefer', 'require', 'verify-ca'])(
    'makes the current secure pg semantics explicit for sslmode=%s',
    (sslMode) => {
      const normalized = normalizePostgresConnectionString(
        `postgresql://user:secret@example.neon.tech/database?sslmode=${sslMode}&channel_binding=require`,
      );
      const parsed = new URL(normalized);

      expect(parsed.searchParams.getAll('sslmode')).toEqual(['verify-full']);
      expect(parsed.searchParams.get('channel_binding')).toBe('require');
    },
  );

  it('preserves verify-full without adding a duplicate parameter', () => {
    const normalized = normalizePostgresConnectionString(
      'postgresql://user:secret@example.neon.tech/database?sslmode=verify-full',
    );

    expect(new URL(normalized).searchParams.getAll('sslmode')).toEqual(['verify-full']);
  });

  it('does not expose credentials or the endpoint identifier in diagnostics', () => {
    const diagnostics = inspectPostgresConnectionString(
      'postgresql://private-user:private-password@ep-private-pooler.us-east-1.aws.neon.tech/database?sslmode=require',
    );

    expect(diagnostics).toMatchObject({
      host: '***.aws.neon.tech',
      sslMode: 'require',
      usesPooler: true,
    });
    expect(JSON.stringify(diagnostics)).not.toContain('private-user');
    expect(JSON.stringify(diagnostics)).not.toContain('private-password');
    expect(JSON.stringify(diagnostics)).not.toContain('ep-private');
  });

  it('rejects non-PostgreSQL URLs', () => {
    expect(() => normalizePostgresConnectionString('https://example.com/database')).toThrow(
      'DATABASE_URL must use the postgresql protocol.',
    );
  });
});

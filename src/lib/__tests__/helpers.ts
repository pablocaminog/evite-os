/// <reference types="@cloudflare/workers-types" />

// Minimal D1PreparedStatement mock
export function createMockStatement(result: unknown = null, rows: unknown[] = []) {
  return {
    bind: (..._args: unknown[]) => createMockStatement(result, rows),
    first: async <T>() => result as T | null,
    run: async () => ({ success: true, meta: {}, results: [] }),
    all: async <T>() => ({ success: true, meta: {}, results: rows as T[] }),
    raw: async () => rows as unknown[][],
  };
}

export function createMockD1(
  overrides: Partial<D1Database> = {}
): D1Database {
  return {
    prepare: (_query: string) => createMockStatement() as unknown as D1PreparedStatement,
    batch: async (_stmts: D1PreparedStatement[]) => [],
    dump: async () => new ArrayBuffer(0),
    exec: async (_query: string) => ({ count: 0, duration: 0 }),
    ...overrides,
  } as unknown as D1Database;
}

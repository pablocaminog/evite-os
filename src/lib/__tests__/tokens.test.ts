import { describe, it, expect } from 'vitest';
import { generateId, generateToken } from '../tokens';

describe('generateId', () => {
  it('returns a UUID v4 string', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('returns unique values each call', () => {
    expect(generateId()).not.toBe(generateId());
  });
});

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns unique values each call', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

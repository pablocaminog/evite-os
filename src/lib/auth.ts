/// <reference types="@cloudflare/workers-types" />
import { generateToken, generateId } from './tokens';

export interface User {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
}

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: number;
  transports: string;
}

export interface Session {
  userId: string;
  username: string;
  displayName: string;
}

const SESSION_PREFIX = 'wid:session:';
const CHALLENGE_PREFIX = 'wid:challenge:';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const CHALLENGE_TTL = 300; // 5 minutes

// ── Users ─────────────────────────────────────────────────────────────────────

export function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
}

export async function createUser(db: D1Database, username: string): Promise<User> {
  const id = generateId();
  await db
    .prepare('INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)')
    .bind(id, username, username)
    .run();
  return { id, username, display_name: username, created_at: new Date().toISOString() };
}

// ── Credentials ───────────────────────────────────────────────────────────────

export async function getCredentialsByUserId(
  db: D1Database,
  userId: string
): Promise<PasskeyCredential[]> {
  const res = await db
    .prepare('SELECT * FROM passkey_credentials WHERE user_id = ?')
    .bind(userId)
    .all<PasskeyCredential>();
  return res.results;
}

export async function getCredentialById(
  db: D1Database,
  credentialId: string
): Promise<PasskeyCredential | null> {
  return db
    .prepare('SELECT * FROM passkey_credentials WHERE credential_id = ?')
    .bind(credentialId)
    .first<PasskeyCredential>();
}

export async function saveCredential(
  db: D1Database,
  cred: Omit<PasskeyCredential, 'id'>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO passkey_credentials
         (id, user_id, credential_id, public_key, counter, device_type, backed_up, transports)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(), cred.user_id, cred.credential_id, cred.public_key,
      cred.counter, cred.device_type, cred.backed_up, cred.transports
    )
    .run();
}

export async function updateCredentialCounter(
  db: D1Database,
  credentialId: string,
  counter: number
): Promise<void> {
  await db
    .prepare('UPDATE passkey_credentials SET counter = ? WHERE credential_id = ?')
    .bind(counter, credentialId)
    .run();
}

// ── Challenges ────────────────────────────────────────────────────────────────

export async function saveChallenge(
  kv: KVNamespace,
  key: string,
  challenge: string
): Promise<void> {
  await kv.put(`${CHALLENGE_PREFIX}${key}`, challenge, { expirationTtl: CHALLENGE_TTL });
}

export async function consumeChallenge(
  kv: KVNamespace,
  key: string
): Promise<string | null> {
  const val = await kv.get(`${CHALLENGE_PREFIX}${key}`);
  if (val) await kv.delete(`${CHALLENGE_PREFIX}${key}`);
  return val;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(
  kv: KVNamespace,
  session: Session
): Promise<string> {
  const token = generateToken();
  await kv.put(`${SESSION_PREFIX}${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL,
  });
  return token;
}

export async function getSession(
  kv: KVNamespace,
  token: string
): Promise<Session | null> {
  const raw = await kv.get(`${SESSION_PREFIX}${token}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { return null; }
}

export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${token}`);
}

export function sessionCookieOpts(maxAge = SESSION_TTL) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    process.env.NODE_ENV !== 'development' ? '; Secure' : ''
  }`;
}

// ── Base64url helpers (CF Workers safe) ───────────────────────────────────────

export function toBase64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function fromBase64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

import crypto from 'crypto';

const VAULT_SECRET =
  process.env.MEHREGAN_VAULT_SECRET || 'mehregan-local-hardware-bound-vault-secret-2026';
const KEY_BUFFER = crypto.scryptSync(VAULT_SECRET, 'mehregan-salt-v1', 32);

export interface EncryptedSecretPayload {
  cipher: 'aes-256-gcm';
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(plainText: string, salt: string): string {
  return crypto.pbkdf2Sync(plainText, salt, 10000, 32, 'sha256').toString('hex');
}

export function verifyPassword(plainText: string, salt: string, expectedHash: string): boolean {
  const calculated = hashPassword(plainText, salt);
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function encryptSecret(plainText: string): EncryptedSecretPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BUFFER, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    cipher: 'aes-256-gcm',
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    ciphertextHex: encrypted.toString('hex'),
  };
}

export function decryptSecret(payload: EncryptedSecretPayload | undefined | null): string {
  if (!payload || !payload.ciphertextHex) return '';
  try {
    const iv = Buffer.from(payload.ivHex, 'hex');
    const authTag = Buffer.from(payload.authTagHex, 'hex');
    const encrypted = Buffer.from(payload.ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUFFER, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'passwordsalt',
  'currentpassword',
  'newpassword',
  'secret',
  'token',
  'connectionstring',
  'encryptedpassword',
  'ciphertexthex',
  'authtaghex',
  'privatekey',
]);

export function sanitizeForLogAndApi<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForLogAndApi(item)) as unknown as T;
  }
  const cloned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      cloned[k] = '[REDACTED_BY_SECURITY_POLICY]';
    } else if (typeof v === 'object' && v !== null) {
      cloned[k] = sanitizeForLogAndApi(v);
    } else {
      cloned[k] = v;
    }
  }
  return cloned as T;
}

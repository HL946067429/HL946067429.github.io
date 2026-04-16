/**
 * AES-GCM 加解密（Web Crypto API）
 * 用 admin 密码派生密钥，加密 PAT 后存入仓库
 * 避免 GitHub Secret Scanning 拦截
 */

const SALT = new TextEncoder().encode('ggl-anniversary-2024');

async function deriveKey(password: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** 加密明文 → base64(iv + ciphertext) */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  // iv(12) + ciphertext 拼起来再 base64
  const buf = new Uint8Array(iv.length + enc.byteLength);
  buf.set(iv);
  buf.set(new Uint8Array(enc), iv.length);
  let binary = '';
  buf.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

/** 解密 base64(iv + ciphertext) → 明文 */
export async function decrypt(encoded: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const raw = atob(encoded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  const iv = buf.slice(0, 12);
  const data = buf.slice(12);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

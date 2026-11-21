/**
 * AES-GCM 256-bit token encryption utility using the Web Crypto API (SubtleCrypto).
 */

async function getEncryptionKey(rawSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest('SHA-256', enc.encode(rawSecret));
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptToken(
  plaintext: string,
  secretKey: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await getEncryptionKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

export async function decryptToken(
  ciphertext: string,
  iv: string,
  secretKey: string,
): Promise<string> {
  const key = await getEncryptionKey(secretKey);
  const ivBuffer = base64ToBuffer(iv);
  const encryptedBuffer = base64ToBuffer(ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer,
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

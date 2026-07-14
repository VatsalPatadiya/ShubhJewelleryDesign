/**
 * crypto.js — AES-GCM encryption/decryption for localStorage data.
 *
 * Uses the Web Crypto API (built into all modern browsers).
 * A passphrase is hashed via PBKDF2 to derive a 256-bit AES-GCM key.
 * Each encrypt() call produces a random 12-byte IV prepended to the ciphertext,
 * then the whole thing is Base64-encoded for safe storage in localStorage.
 */

const PASSPHRASE = 'ShubhJewellers@SecureStorage#2026!';
const SALT = new TextEncoder().encode('ShubhJewelleryDesign_Salt_v1');
const IV_LENGTH = 12; // bytes – recommended for AES-GCM

let _cryptoKey = null;

/**
 * Derive and cache the AES-256-GCM key from the passphrase.
 * Must be called once before any encrypt/decrypt operations.
 */
export async function initCryptoKey() {
  if (_cryptoKey) return;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PASSPHRASE),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  _cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext
 * @returns {Promise<string>} Base64-encoded (IV + ciphertext)
 */
export async function encrypt(plaintext) {
  if (!_cryptoKey) throw new Error('Crypto key not initialised. Call initCryptoKey() first.');

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    _cryptoKey,
    encoded
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  return uint8ToBase64(combined);
}

/**
 * Decrypt a Base64-encoded (IV + ciphertext) string.
 * @param {string} base64Cipher
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(base64Cipher) {
  if (!_cryptoKey) throw new Error('Crypto key not initialised. Call initCryptoKey() first.');

  const combined = base64ToUint8(base64Cipher);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    _cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// ── Base64 helpers ──────────────────────────────────────────

function uint8ToBase64(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

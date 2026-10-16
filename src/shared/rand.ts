/** Aléa cryptographique portable (Node 22 et navigateurs) via Web Crypto. */
const cryptoApi = (): Crypto => globalThis.crypto;

export function randomBytesArray(n: number): Uint8Array {
  const a = new Uint8Array(n);
  cryptoApi().getRandomValues(a);
  return a;
}

/** Identifiant aléatoire encodé en base64url (sans remplissage). */
export function randomId(bytes = 9): string {
  let bin = '';
  for (const b of randomBytesArray(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Entier uniforme dans [0, max) sans biais de modulo. */
export function randomIntBelow(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('max invalide');
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    cryptoApi().getRandomValues(buf);
    const x = buf[0] as number;
    if (x < limit) return x % max;
  }
}

/** Comparaison en temps constant de deux chaînes. */
export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

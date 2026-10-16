/**
 * Emballage compact d'un objet JSON pour le canal de présence de la page partagée :
 * JSON → deflate → base64, découpé en morceaux de 1 000 caractères (limite par chaîne).
 * Sans CompressionStream (vieux navigateurs), le JSON brut est découpé tel quel.
 */
export interface Packed {
  f: 'z' | 'j';
  z: string[];
}

const CHUNK = 1000;

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const split = (s: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += CHUNK) out.push(s.slice(i, i + CHUNK));
  return out;
};

const canZip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function pack(value: unknown): Promise<Packed> {
  const json = JSON.stringify(value);
  if (!canZip()) return { f: 'j', z: split(json) };
  const stream = new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return { f: 'z', z: split(toBase64(bytes)) };
}

export async function unpack(p: unknown): Promise<unknown> {
  if (typeof p !== 'object' || p === null) return null;
  const { f, z } = p as Partial<Packed>;
  if (!Array.isArray(z) || !z.every((c) => typeof c === 'string')) return null;
  const text = z.join('');
  try {
    if (f === 'j') return JSON.parse(text);
    if (f !== 'z' || !canZip()) return null;
    const stream = new Blob([fromBase64(text)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
  } catch {
    return null;
  }
}

/** Taille en octets du texte JSON d'un objet de présence (limite : 4 Kio). */
export const jsonBytes = (v: unknown): number => new TextEncoder().encode(JSON.stringify(v)).length;

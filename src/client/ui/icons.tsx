/** Jeu d'icônes original (trait de 1,8 px sur grille de 24). */
import type { CategoryId } from '../../shared/types.ts';

type P = { className?: string; title?: string };

const S = ({ children, className, title }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

export const Icon = {
  back: (p: P) => <S {...p}><path d="M15 5l-7 7 7 7" /></S>,
  close: (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>,
  sound: (p: P) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></S>,
  mute: (p: P) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></S>,
  up: (p: P) => <S {...p}><path d="M12 19V5M6 11l6-6 6 6" /></S>,
  down: (p: P) => <S {...p}><path d="M12 5v14M6 13l6 6 6-6" /></S>,
  target: (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></S>,
  hint: (p: P) => <S {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0012 3z" /></S>,
  swap: (p: P) => <S {...p}><path d="M4 8h13l-3-3M20 16H7l3 3" /></S>,
  bet: (p: P) => <S {...p}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></S>,
  double: (p: P) => <S {...p}><path d="M3.5 8.5l6 7M9.5 8.5l-6 7" /><path d="M13.5 9.5a3 3 0 015.6 1.4c0 2.2-5.6 4.4-5.6 4.6h6" /></S>,
  copy: (p: P) => <S {...p}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></S>,
  share: (p: P) => <S {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></S>,
  crown: (p: P) => <S {...p}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z" /></S>,
  kick: (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 8.5l7 7" /></S>,
  users: (p: P) => <S {...p}><circle cx="9" cy="9" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 5.5a3.5 3.5 0 010 7M18 14.5a6.5 6.5 0 013.5 5.5" /></S>,
  wifiOff: (p: P) => <S {...p}><path d="M3 3l18 18" /><path d="M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015.2-2.7M13.8 9.8A10 10 0 0119 12.5M2 9a15 15 0 015.5-3.2M12 5a15 15 0 0110 4" /><circle cx="12" cy="20" r="0.8" fill="currentColor" /></S>,
  check: (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>,
  lock: (p: P) => <S {...p}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 018 0v3" /></S>,
  unlock: (p: P) => <S {...p}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 017.6-1.7" /></S>,
  play: (p: P) => <S {...p}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" /></S>,
  settings: (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></S>,
  chart: (p: P) => <S {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9" /></S>,
  book: (p: P) => <S {...p}><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" /><path d="M4 20.5A2.5 2.5 0 016.5 23H20" transform="translate(0 -2)" /></S>,
  grid: (p: P) => <S {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></S>,
  door: (p: P) => <S {...p}><path d="M14 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></S>,
  heart: (p: P) => <S {...p}><path d="M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0112 7a4.4 4.4 0 017.5 3c0 5.4-7.5 10-7.5 10z" /></S>,
  bolt: (p: P) => <S {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></S>,
  timer: (p: P) => <S {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></S>,
  robot: (p: P) => <S {...p}><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6" /></S>,
  screen: (p: P) => <S {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></S>,
  globe: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></S>,
  key: (p: P) => <S {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3" /></S>,
  star: (p: P) => <S {...p}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></S>,
  starFill: (p: P) => <S {...p}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="currentColor" /></S>,
  refresh: (p: P) => <S {...p}><path d="M20 11a8 8 0 00-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.5 4.5L20 16M20 20v-4h-4" /></S>,
  info: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></S>,
};

/** Emblèmes de catégories. */
export function CategoryIcon({ id, className }: { id: CategoryId; className?: string }) {
  const paths: Record<CategoryId, React.ReactNode> = {
    culture: <><path d="M4 19V6.5L12 3l8 3.5V19" /><path d="M4 19h16M8 19v-8M12 19v-8M16 19v-8M3 8h18" /></>,
    histoire: <><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" /></>,
    geo: <><path d="M3 20l5.5-11 4 6.5L15 12l6 8z" /><circle cx="17" cy="6" r="2" /></>,
    sciences: <><path d="M9 3h6M10 3v6.5L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9.5V3" /><path d="M7.5 14.5h9" /></>,
    nature: <><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" /><path d="M5 19l8-8" /></>,
    espace: <><circle cx="12" cy="12" r="4.5" /><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-20 12 12)" /></>,
    sport: <><circle cx="12" cy="12" r="9" /><path d="M3.5 9.5c4.5 1 12.5 1 17 0M3.5 14.5c4.5-1 12.5-1 17 0M12 3c-2.5 3-2.5 15 0 18" /></>,
    football: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z" /><path d="M12 3v4.5M16 10.4l4.3-1.4M14.5 15.1l2.6 3.7M9.5 15.1l-2.6 3.7M8 10.4L3.7 9" /></>,
    cinema: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 6l2 4M12 6l2 4M17 6l2 4" /></>,
    musique: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
    tech: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
    jeuxvideo: <><path d="M7 8h10a4.5 4.5 0 014.4 5.5l-.8 3.4a2.4 2.4 0 01-4.1 1L14 16h-4l-2.5 1.9a2.4 2.4 0 01-4.1-1l-.8-3.4A4.5 4.5 0 017 8z" /><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01" /></>,
    gastro: <><path d="M6 3v7a2 2 0 004 0V3M8 10v11M17 21V3c-2 1.5-3 4-3 7v4h3" /></>,
    quotidien: <><path d="M3 11l9-7 9 7" /><path d="M5 9.5V20h14V9.5M10 20v-6h4v6" /></>,
    records: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4" /></>,
    insolite: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    eco: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><path d="M4 10l6-6 6 9 5-5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

/**
 * Logo : un « M » formé de barres qui montent par paliers, comme une échelle
 * d'ordres de grandeur, avec un repère « Tout Pile » au sommet.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lm-a" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e6862a" />
          <stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
        <linearGradient id="lm-b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1aa6d6" />
          <stop offset="1" stopColor="#9cf3fb" />
        </linearGradient>
      </defs>
      <rect x="6" y="30" width="9" height="28" rx="3" fill="url(#lm-a)" />
      <rect x="18" y="18" width="9" height="40" rx="3" fill="url(#lm-a)" opacity="0.9" />
      <rect x="30" y="34" width="4" height="24" rx="2" fill="#f4f2ff" opacity="0.75" />
      <rect x="37" y="18" width="9" height="40" rx="3" fill="url(#lm-b)" opacity="0.9" />
      <rect x="49" y="6" width="9" height="52" rx="3" fill="url(#lm-b)" />
      <circle cx="32" cy="24" r="4.5" fill="none" stroke="#fff1c2" strokeWidth="2.4" />
      <circle cx="32" cy="24" r="1.4" fill="#fff1c2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Avatars originaux, générés à partir de formes simples                 */
/* ------------------------------------------------------------------ */

export const AVATARS = [
  { name: 'Comète', shape: 'circle', hue: 36, eyes: 'round', deco: 'tail' },
  { name: 'Boussole', shape: 'squircle', hue: 190, eyes: 'wide', deco: 'needle' },
  { name: 'Pixel', shape: 'square', hue: 300, eyes: 'pixel', deco: 'none' },
  { name: 'Volt', shape: 'hex', hue: 52, eyes: 'happy', deco: 'bolt' },
  { name: 'Marée', shape: 'drop', hue: 205, eyes: 'round', deco: 'wave' },
  { name: 'Prisme', shape: 'triangle', hue: 268, eyes: 'wide', deco: 'none' },
  { name: 'Braise', shape: 'circle', hue: 12, eyes: 'happy', deco: 'flame' },
  { name: 'Lichen', shape: 'squircle', hue: 140, eyes: 'sleepy', deco: 'leaf' },
  { name: 'Orbite', shape: 'circle', hue: 222, eyes: 'wide', deco: 'ring' },
  { name: 'Quartz', shape: 'hex', hue: 330, eyes: 'round', deco: 'none' },
  { name: 'Sablier', shape: 'square', hue: 28, eyes: 'sleepy', deco: 'none' },
  { name: 'Écho', shape: 'drop', hue: 172, eyes: 'happy', deco: 'wave' },
  { name: 'Nova', shape: 'triangle', hue: 46, eyes: 'round', deco: 'spark' },
  { name: 'Givre', shape: 'squircle', hue: 198, eyes: 'sleepy', deco: 'spark' },
  { name: 'Radar', shape: 'circle', hue: 104, eyes: 'pixel', deco: 'needle' },
  { name: 'Cosmo', shape: 'hex', hue: 250, eyes: 'happy', deco: 'ring' },
] as const;

export const AVATAR_COUNT = AVATARS.length;

export function Avatar({ index, size = 48, className, ring }: { index: number; size?: number; className?: string; ring?: string }) {
  const a = AVATARS[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT] ?? AVATARS[0];
  const c1 = `hsl(${a.hue} 92% 66%)`;
  const c2 = `hsl(${(a.hue + 28) % 360} 80% 42%)`;
  const gid = `av-${index}`;
  const body = {
    circle: <circle cx="32" cy="34" r="22" />,
    squircle: <rect x="10" y="12" width="44" height="44" rx="16" />,
    square: <rect x="11" y="13" width="42" height="42" rx="6" />,
    hex: <path d="M32 9l20 11.5v23L32 55 12 43.5v-23z" />,
    drop: <path d="M32 8c10 12 20 20 20 30a20 20 0 01-40 0c0-10 10-18 20-30z" />,
    triangle: <path d="M32 9l24 44H8z" />,
  }[a.shape];
  const eyes = {
    round: <><circle cx="25" cy="34" r="4" fill="#101640" /><circle cx="39" cy="34" r="4" fill="#101640" /><circle cx="26.3" cy="32.7" r="1.3" fill="#fff" /><circle cx="40.3" cy="32.7" r="1.3" fill="#fff" /></>,
    wide: <><ellipse cx="25" cy="34" rx="4.5" ry="5.5" fill="#fff" /><ellipse cx="39" cy="34" rx="4.5" ry="5.5" fill="#fff" /><circle cx="26" cy="35" r="2.4" fill="#101640" /><circle cx="40" cy="35" r="2.4" fill="#101640" /></>,
    pixel: <><rect x="21" y="31" width="7" height="7" fill="#101640" /><rect x="36" y="31" width="7" height="7" fill="#101640" /></>,
    happy: <><path d="M21 35q4-5 8 0M35 35q4-5 8 0" stroke="#101640" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
    sleepy: <><path d="M21 34h8M35 34h8" stroke="#101640" strokeWidth="3" strokeLinecap="round" /></>,
  }[a.eyes];
  const deco = {
    tail: <path d="M50 18l8-6M47 13l5-8" stroke={c1} strokeWidth="3" strokeLinecap="round" />,
    needle: <path d="M32 4v8" stroke="#fff1c2" strokeWidth="3" strokeLinecap="round" />,
    bolt: <path d="M34 2l-6 9h5l-3 7 7-10h-5z" fill="#fff1c2" />,
    wave: <path d="M16 54q4-3 8 0t8 0 8 0 8 0" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.4" fill="none" />,
    flame: <path d="M32 2c4 5 6 8 2 12 0-3-2-4-2-4s-2 2-2 4c-4-4-2-7 2-12z" fill="#ffd27a" />,
    leaf: <path d="M44 10c-8 0-12 4-12 10 6 0 12-2 12-10z" fill="hsl(120 60% 55%)" />,
    ring: <ellipse cx="32" cy="34" rx="29" ry="7" fill="none" stroke="#fff1c2" strokeOpacity="0.7" strokeWidth="2.2" transform="rotate(-14 32 34)" />,
    spark: <path d="M50 8l1.5 4 4 1.5-4 1.5L50 19l-1.5-4-4-1.5 4-1.5z" fill="#fff1c2" />,
    none: null,
  }[a.deco];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label={`Avatar ${a.name}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      {ring ? <circle cx="32" cy="32" r="31" fill="none" stroke={ring} strokeWidth="2.5" /> : null}
      <g fill={`url(#${gid})`}>{body}</g>
      <g opacity="0.25" fill="#fff"><ellipse cx="26" cy="20" rx="9" ry="4" /></g>
      {eyes}
      <path d="M28 44q4 3 8 0" stroke="#101640" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {deco}
    </svg>
  );
}

export const avatarName = (i: number) => (AVATARS[((i % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT] ?? AVATARS[0]).name;

/** Composants réutilisables de l'interface. */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { audio, ui } from '../audio/engine.ts';
import { formatCompact, formatNumber, parseEstimate } from '../../shared/numbers.ts';
import type { PublicQuestion } from '../../shared/types.ts';
import { Icon } from './icons.tsx';
import { getState } from '../lib/store.ts';

/* ------------------------------------------------------------------ */
/* Bouton                                                              */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'cyan' | 'ghost' | 'danger' | 'default';

export function Button({
  variant = 'default',
  big,
  block,
  icon,
  sound = 'click',
  className = '',
  children,
  onClick,
  ...rest
}: {
  variant?: BtnVariant;
  big?: boolean;
  block?: boolean;
  icon?: ReactNode;
  sound?: 'click' | 'back' | 'select' | 'none';
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ['btn', variant !== 'default' ? `btn--${variant}` : '', big ? 'btn--big' : '', block ? 'btn--block' : '', !children ? 'btn--icon' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      onPointerEnter={() => ui('hover')}
      onClick={(e) => {
        void audio.unlock();
        if (sound !== 'none') ui(sound);
        haptic(8);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function haptic(ms: number | number[]): void {
  try {
    if (getState().settings.haptics && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* indisponible */
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                        */
/* ------------------------------------------------------------------ */

interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'ok' | 'error';
}
const ToastCtx = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    if (tone === 'error') ui('error');
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === 'error' ? 5200 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'ok' ? <Icon.check className="toast__icon" /> : t.tone === 'error' ? <Icon.info className="toast__icon" /> : null}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Modale                                                              */
/* ------------------------------------------------------------------ */

export function Modal({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, [href], input, select')?.focus();
    ui('open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])'));
        if (f.length === 0) return;
        const first = f[0] as HTMLElement;
        const last = f[f.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="row between">
          <h2 id={id}>{title}</h2>
          <Button variant="ghost" icon={<Icon.close />} aria-label="Fermer" sound="back" onClick={onClose} />
        </div>
        {children}
        {actions ? <div className="modal__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compteur animé (les chiffres « roulent »)                             */
/* ------------------------------------------------------------------ */

export function useReducedMotion(): boolean {
  const pref = getState().settings.motion;
  const [sys, setSys] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSys(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return pref === 'reduce' || (pref === 'auto' && sys);
}

export function useCountUp(value: number, duration = 900, from?: number, onTick?: () => void): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(from ?? value);
  const fromRef = useRef(from ?? value);
  useEffect(() => {
    if (reduced || duration <= 0) {
      setShown(value);
      fromRef.current = value;
      return;
    }
    const start = performance.now();
    const a = fromRef.current;
    let raf = 0;
    let lastTick = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      const v = a + (value - a) * e;
      setShown(v);
      if (onTick && now - lastTick > 55 && t < 1) {
        lastTick = now;
        onTick();
      }
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduced]);
  return shown;
}

export function Counter({ value, decimals = 0, kind, duration = 900, from, className = '', tick }: {
  value: number; decimals?: number; kind?: PublicQuestion['kind']; duration?: number; from?: number; className?: string; tick?: boolean;
}) {
  const v = useCountUp(value, duration, from, tick ? () => ui('score') : undefined);
  const rounded = decimals > 0 ? Number(v.toFixed(decimals)) : Math.round(v);
  return <span className={`num ${className}`}>{formatNumber(rounded, decimals, kind)}</span>;
}

/* ------------------------------------------------------------------ */
/* Chronomètre                                                          */
/* ------------------------------------------------------------------ */

/** Horloge corrigée du décalage serveur (0 en local). */
export function useNow(offset = 0, hz = 10): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000 / hz);
    return () => window.clearInterval(id);
  }, [offset, hz]);
  return now;
}

export function TimerRing({ deadline, total, now, label }: { deadline: number | null; total: number; now: number; label?: string }) {
  if (deadline === null || total <= 0) {
    return (
      <div className="timer timer--free" aria-label="Temps illimité">
        <Icon.timer />
      </div>
    );
  }
  const left = Math.max(0, deadline - now);
  const frac = Math.max(0, Math.min(1, left / total));
  const secs = Math.ceil(left / 1000);
  const urgent = secs <= 5;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={`timer ${urgent ? 'timer--urgent' : ''}`} role="timer" aria-label={`${label ?? 'Temps restant'} : ${secs} secondes`}>
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} className="timer__track" />
        <circle cx="32" cy="32" r={r} className="timer__bar" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="num">{secs}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Saisie d'une estimation                                              */
/* ------------------------------------------------------------------ */

export function EstimateInput({
  question,
  onSubmit,
  disabled,
  autoFocus = true,
  submitLabel = 'Verrouiller',
  extra,
  onDraft,
}: {
  question: PublicQuestion;
  onSubmit: (value: number) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  submitLabel?: string;
  extra?: ReactNode;
  onDraft?: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const parsed = useMemo(() => parseEstimate(text, question.decimals, question.signed, question.kind), [text, question]);
  // Le composant est remonté à chaque question (clé = identifiant) : pas de remise à zéro à faire ici.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  const preview = parsed.ok
    ? question.kind === 'year'
      ? `${formatNumber(parsed.value, 0, 'year')}${question.unit ? ` ${question.unit}` : ''}`
      : `${formatCompact(parsed.value, question.decimals, question.kind)}${question.unit ? ` ${question.unit}` : ''}`
    : null;
  const submit = () => {
    setTouched(true);
    if (parsed.ok && !disabled) onSubmit(parsed.value);
    else ui('error');
  };
  const showError = touched && !parsed.ok && text.length > 0;
  return (
    <form
      className="estimate"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Votre estimation{question.unit ? ` en ${question.unit}` : ''}
      </label>
      <div className="estimate__box">
        <input
          ref={inputRef}
          id={id}
          className="estimate__input num"
          inputMode={question.decimals > 0 || question.signed ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={question.kind === 'year' ? 'Année' : 'Votre nombre'}
          value={text}
          disabled={disabled}
          aria-invalid={showError}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setText(e.target.value);
            onDraft?.(e.target.value);
            ui('key');
          }}
        />
        {question.unit ? <span className="estimate__unit">{question.unit}</span> : null}
      </div>
      <div id={`${id}-help`} className={`estimate__help ${showError ? 'is-error' : ''}`} aria-live="polite">
        {showError && !parsed.ok ? parsed.error : preview ?? (question.decimals > 0 ? `Jusqu’à ${question.decimals} décimale${question.decimals > 1 ? 's' : ''}. Raccourcis : 3,5 M ou 2 milliards.` : 'Raccourcis acceptés : 12 k, 3,5 M, 2 milliards.')}
      </div>
      <div className="estimate__actions">
        {extra}
        <Button type="submit" variant="primary" big disabled={disabled} aria-disabled={!parsed.ok} icon={<Icon.lock />} sound="none">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Confettis (canvas léger)                                             */
/* ------------------------------------------------------------------ */

export function Confetti({ colors, burst = 140, active }: { colors: string[]; burst?: number; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!active || reduced) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const W = c.width;
    const H = c.height;
    const parts = Array.from({ length: burst }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.25,
      y: H * 0.42,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-Math.random() * 15 - 6) * dpr,
      s: (4 + Math.random() * 6) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      col: colors[Math.floor(Math.random() * colors.length)] as string,
      life: 1,
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.vy += 0.42 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life -= 0.0075;
        if (p.y > H + 40) p.life = 0;
        if (p.life <= 0) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced, burst, colors]);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Divers                                                              */
/* ------------------------------------------------------------------ */

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="switch"
      onClick={() => {
        void audio.unlock();
        ui(checked ? 'toggle_off' : 'toggle_on');
        onChange(!checked);
      }}
    >
      <span>
        <span style={{ display: 'block', fontWeight: 600 }}>{label}</span>
        {hint ? <span className="muted small">{hint}</span> : null}
      </span>
      <span className="switch__track" />
    </button>
  );
}

export function Choice<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            disabled={o.disabled}
            title={o.hint}
            className="chip"
            onClick={() => {
              ui('select');
              onChange(o.value);
            }}
          >
            {o.disabled ? <Icon.lock /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stars({ n, max = 3, size = 22 }: { n: number; max?: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${n} étoile${n > 1 ? 's' : ''} sur ${max}`}>
      {Array.from({ length: max }, (_, i) =>
        i < n ? <Icon.starFill key={i} className="star star--on" /> : <Icon.star key={i} className="star" />,
      ).map((el, i) => (
        <span key={i} style={{ width: size, height: size, display: 'inline-flex' }}>
          {el}
        </span>
      ))}
    </span>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="empty" role="status">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

/**
 * La Règle : l'instrument de mesure de Magnitude.
 *
 * Elle situe l'estimation, sa zone « Tout Pile » et la vraie valeur sur une
 * échelle graduée. L'échelle devient logarithmique quand les valeurs s'étalent
 * sur plusieurs ordres de grandeur, pour que tout reste lisible.
 * Pendant le suspense, un faisceau balaie la règle ; puis le repère de la
 * réponse glisse depuis l'estimation jusqu'à sa vraie position.
 */
import { useMemo } from 'react';
import { formatNumber } from '../../shared/numbers.ts';
import type { ValueKind } from '../../shared/types.ts';

export interface RulerProps {
  estimate: number | null;
  tolerance: number;
  answer: number | null;
  revealed: boolean;
  kind: ValueKind;
  decimals: number;
  unit: string;
  teamClass: 'team-a' | 'team-b';
  /** Estimations supplémentaires (départage). */
  marks?: { value: number; className: string; label: string }[];
}

interface Scale {
  log: boolean;
  lo: number;
  hi: number;
  ticks: { v: number; major: boolean }[];
  pos: (v: number) => number;
}

function niceStep(range: number, target = 6): number {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}

export function buildScale(values: number[], kind: ValueKind): Scale {
  const vs = values.filter((v) => Number.isFinite(v));
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  const positive = lo > 0;
  const ratio = positive ? hi / lo : 1;
  if (positive && ratio > 6 && kind !== 'year') {
    const a = Math.floor(Math.log10(lo) - 0.15);
    const b = Math.ceil(Math.log10(hi) + 0.15);
    const L = 10 ** a;
    const H = 10 ** b;
    const ticks: Scale['ticks'] = [];
    for (let e = a; e <= b; e++) {
      ticks.push({ v: 10 ** e, major: true });
      if (e < b && b - a <= 4) for (const m of [2, 5]) ticks.push({ v: m * 10 ** e, major: false });
    }
    return {
      log: true,
      lo: L,
      hi: H,
      ticks,
      pos: (v) => (Math.log10(Math.max(v, L)) - a) / (b - a),
    };
  }
  const span = Math.max(hi - lo, Math.abs(hi) * 0.02, kind === 'year' ? 10 : 1e-9);
  const pad = span * 0.35;
  lo -= pad;
  hi += pad;
  if (lo < 0 && Math.min(...vs) >= 0) lo = 0;
  const step = niceStep(hi - lo);
  const start = Math.ceil(lo / step) * step;
  const ticks: Scale['ticks'] = [];
  for (let v = start, i = 0; v <= hi + 1e-9 && i < 40; v += step / 2, i++) {
    const major = Math.abs(Math.round(v / step) * step - v) < step * 1e-6;
    ticks.push({ v: Number(v.toPrecision(12)), major });
  }
  return { log: false, lo, hi, ticks, pos: (v) => (v - lo) / (hi - lo) };
}

function shortNumber(v: number): string {
  const a = Math.abs(v);
  const f = (x: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: x < 10 ? 1 : 0 }).format(x);
  if (a >= 1e9) return `${f(v / 1e9)} Md`;
  if (a >= 1e6) return `${f(v / 1e6)} M`;
  if (a >= 1e4) return `${f(v / 1e3)} k`;
  return formatNumber(v, a < 10 ? 2 : 0);
}

const label = (v: number, kind: ValueKind, _decimals: number) => (kind === 'year' ? formatNumber(v, 0, 'year') : shortNumber(v));

export function Ruler({ estimate, tolerance, answer, revealed, kind, decimals, unit, teamClass, marks = [] }: RulerProps) {
  const scale = useMemo(() => {
    const vals: number[] = [];
    if (estimate !== null) vals.push(estimate - tolerance, estimate + tolerance, estimate);
    if (answer !== null) vals.push(answer);
    for (const m of marks) vals.push(m.value);
    if (vals.length === 0) vals.push(0, 1);
    if (vals.length === 1) vals.push((vals[0] as number) * 1.2 + 1);
    return buildScale(vals, kind);
  }, [estimate, tolerance, answer, kind, marks]);

  const clamp = (x: number) => Math.max(0, Math.min(1, x)) * 100;
  const ePos = estimate !== null ? clamp(scale.pos(estimate)) : null;
  const zl = estimate !== null ? clamp(scale.pos(Math.max(estimate - tolerance, scale.log ? scale.lo : -Infinity))) : 0;
  const zr = estimate !== null ? clamp(scale.pos(estimate + tolerance)) : 0;
  const aPos = answer !== null ? clamp(scale.pos(answer)) : null;
  const answerLeft = revealed ? aPos : ePos;

  return (
    <div className={`ruler ${teamClass} ${revealed ? 'is-revealed' : 'is-suspense'}`} role="img"
      aria-label={revealed && answer !== null ? `Réponse ${formatNumber(answer, decimals, kind)}${unit ? ' ' + unit : ''}${estimate !== null ? `, estimation ${formatNumber(estimate, decimals, kind)}` : ''}` : 'Révélation en cours'}>
      <div className="ruler__track">
        <div className="ruler__sweep" />
        {scale.ticks.map((t, i) => (
          <div key={t.v} className={`ruler__tick ${t.major ? 'is-major' : ''} ${t.major && scale.ticks.filter((x, j) => x.major && j < i).length % 2 === 1 ? 'is-odd' : ''}`} style={{ left: `${clamp(scale.pos(t.v))}%` }}>
            {t.major ? <span>{label(t.v, kind, decimals)}</span> : null}
          </div>
        ))}
        {estimate !== null ? (
          <>
            <div className="ruler__zone" style={{ left: `${zl}%`, width: `${Math.max(0.6, zr - zl)}%` }} />
            <div className="ruler__mark ruler__mark--estimate" style={{ left: `${ePos}%` }}>
              <span className="ruler__flag num">{formatNumber(estimate, decimals, kind)}</span>
            </div>
          </>
        ) : null}
        {marks.map((m) => (
          <div key={m.className + m.value} className={`ruler__mark ruler__mark--extra ${m.className}`} style={{ left: `${clamp(scale.pos(m.value))}%` }}>
            <span className="ruler__flag num">{m.label}</span>
          </div>
        ))}
        {answer !== null && answerLeft !== null ? (
          <div className="ruler__mark ruler__mark--answer" style={{ left: `${answerLeft}%` }}>
            <span className="ruler__pin" />
          </div>
        ) : null}
      </div>
      <div className="ruler__legend">
        <span className="ruler__key ruler__key--estimate">Estimation</span>
        <span className="ruler__key ruler__key--zone">Zone Tout Pile</span>
        <span className="ruler__key ruler__key--answer">Réponse</span>
        {scale.log ? <span className="ruler__key muted">Échelle logarithmique</span> : null}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_BY_ID } from '../../shared/categories.ts';
import type { CategoryId } from '../../shared/types.ts';
import { BANK } from '../lib/bank.ts';
import { CategoryIcon, Icon } from '../ui/icons.tsx';
import { Button } from '../ui/kit.tsx';
import { ScreenHeader, useNav } from './common.tsx';

export function CategoriesScreen() {
  const nav = useNav();
  const [open, setOpen] = useState<CategoryId | null>(null);
  const counts = useMemo(() => {
    const m: Record<string, { n: number; levels: number[] }> = {};
    for (const q of BANK.all) {
      const e = (m[q.cat] ??= { n: 0, levels: [0, 0, 0, 0] });
      e.n++;
      (e.levels[q.level - 1] as number)++;
      e.levels[q.level - 1] = e.levels[q.level - 1] as number;
    }
    return m;
  }, []);
  const cat = open ? CATEGORY_BY_ID[open] : null;
  const sample = useMemo(() => (open ? BANK.all.filter((q) => q.cat === open).slice(0, 4) : []), [open]);
  return (
    <div className="screen">
      <ScreenHeader title="Catégories" />
      <p className="lede">{BANK.all.length} questions réparties en {CATEGORIES.length} catégories, chacune avec sa source et son explication. Choisissez vos thèmes au moment de créer une partie.</p>
      <ul className="cat-grid">
        {CATEGORIES.map((c) => {
          const k = counts[c.id];
          return (
            <li key={c.id}>
              <button type="button" className={`cat-card ${open === c.id ? 'is-on' : ''}`} style={{ ['--hue' as string]: c.hue }} onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                <CategoryIcon id={c.id} className="cat-card__icon" />
                <span className="cat-card__title">{c.label}</span>
                <span className="cat-card__blurb">{c.blurb}</span>
                <span className="cat-card__count"><span className="num">{k?.n ?? 0}</span> questions</span>
                <span className="cat-card__levels" aria-label="Répartition par niveau">
                  {(k?.levels ?? []).map((n, i) => <i key={i} style={{ flex: Math.max(n, 0.2) }} title={`Niveau ${i + 1} : ${n}`} />)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {cat ? (
        <section className="panel" style={{ ['--hue' as string]: cat.hue }} aria-live="polite">
          <h2><CategoryIcon id={cat.id} className="inline-icon" /> Exemples en {cat.label}</h2>
          <ul className="samples">
            {sample.map((q) => (
              <li key={q.id}>
                <span>{q.text}</span>
                <span className="muted small">Niveau {q.level} sur 4. Réponse révélée en jeu.</span>
              </li>
            ))}
          </ul>
          <div className="row">
            <Button variant="primary" icon={<Icon.play />} onClick={() => nav.go({ name: 'solo-play', mode: 'serie', difficulty: 'normal', categories: [cat.id], key: Date.now() })}>
              Jouer une série en {cat.label}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

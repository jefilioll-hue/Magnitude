import test from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveTolerance,
  evaluate,
  formatNumber,
  normalizedError,
  parseEstimate,
  roundNice,
  toScaled,
  validateValue,
} from '../src/shared/numbers.ts';

test('saisie : formats français et internationaux', () => {
  const ok = (s: string, d = 0, neg = false) => {
    const r = parseEstimate(s, d, neg);
    assert.ok(r.ok, `« ${s} » devrait être accepté : ${!r.ok ? r.error : ''}`);
    return r.ok ? r.value : NaN;
  };
  assert.equal(ok('1234'), 1234);
  assert.equal(ok('1 234 567'), 1234567);
  assert.equal(ok('1 234'), 1234); // espace fine insécable (format Intl fr-FR)
  assert.equal(ok('1 234'), 1234);
  assert.equal(ok('1.234.567'), 1234567);
  assert.equal(ok('1,234'), 1234); // séparateur de milliers quand aucune décimale n'est permise
  assert.equal(ok('3,5', 1), 3.5);
  assert.equal(ok('3.5', 1), 3.5);
  assert.equal(ok('1 234,56', 2), 1234.56);
  assert.equal(ok('1,234.56', 2), 1234.56);
  assert.equal(ok('1.234,56', 2), 1234.56);
  assert.equal(ok('3,5 M'), 3_500_000);
  assert.equal(ok('1,1 M'), 1_100_000); // pas de résidu flottant
  assert.equal(ok('2 milliards'), 2e9);
  assert.equal(ok('12k'), 12000);
  assert.equal(ok('-273,15', 2, true), -273.15);
  assert.equal(ok('0'), 0);
  assert.equal(ok(',5', 1), 0.5);
});

test('saisie : rejets explicites', () => {
  const bad = (s: string, d = 0, neg = false) => {
    const r = parseEstimate(s, d, neg);
    assert.equal(r.ok, false, `« ${s} » devrait être refusé`);
    return r.ok ? '' : r.error;
  };
  assert.match(bad(''), /Entrez/);
  assert.match(bad('abc'), /chiffres/);
  assert.match(bad('1,5'), /entier/);
  assert.match(bad('1,234', 2), /décimale/); // 3 décimales demandées, 2 permises
  assert.match(bad('-5'), /négative/);
  assert.match(bad('1e300'), /chiffres|grand/);
  assert.match(bad('9'.repeat(30)), /grand/);
  bad('1..2', 1);
  bad('1,2,3', 1);
  bad('12 xyz');
});

test('comparaison exacte sans erreur d’arrondi', () => {
  // 0,1 + 0,2 vaut 0,30000000000000004 en flottant : doit rester exact.
  const e = evaluate(0.1 + 0.2, 0.3, 0);
  assert.equal(e.exact, true);
  assert.equal(e.inZone, true);
  assert.equal(e.direction, 'egal');
  assert.equal(evaluate(42.195, 42.195, 0).exact, true);
  assert.equal(evaluate(-273.15, -273.15, 0).exact, true);
  assert.equal(toScaled(1e15), 1_000_000_000_000_000_000_000n);
});

test('zone de tolérance : bornes incluses, direction correcte', () => {
  assert.deepEqual(
    [evaluate(90, 100, 10).inZone, evaluate(110, 100, 10).inZone, evaluate(89, 100, 10).inZone, evaluate(111, 100, 10).inZone],
    [true, true, false, false],
  );
  assert.equal(evaluate(80, 100, 10).direction, 'plus'); // la vraie valeur est au-dessus
  assert.equal(evaluate(120, 100, 10).direction, 'moins');
  assert.equal(evaluate(-90, -89.2, 0.5).direction, 'plus');
  // Décimales : 9,58 ± 0,05
  assert.equal(evaluate(9.63, 9.58, 0.05).inZone, true);
  assert.equal(evaluate(9.64, 9.58, 0.05).inZone, false);
});

test('tolérance effective arrondie au pas de saisie', () => {
  const year = { tol: { abs: 2 }, answer: 1789, decimals: 0 };
  assert.equal(effectiveTolerance(year, 1), 2);
  assert.equal(effectiveTolerance(year, 1.6), 3); // 3,2 → 3
  assert.equal(effectiveTolerance(year, 0.35), 0); // 0,7 → 0 : valeur exacte exigée
  const pop = { tol: { rel: 0.05 }, answer: 68.6, decimals: 1 };
  assert.equal(effectiveTolerance(pop, 1), 3.4); // 3,43 → 3,4
  const big = { tol: { rel: 0.1 }, answer: 384400, decimals: 0 };
  assert.equal(effectiveTolerance(big, 1), 38440);
  assert.equal(effectiveTolerance({ tol: { abs: 0 }, answer: 3, decimals: 0, minTol: 1 }, 1), 1);
});

test('validation serveur des valeurs', () => {
  assert.equal(validateValue(12, { decimals: 0, kind: 'count' }), true);
  assert.equal(validateValue(12.5, { decimals: 0, kind: 'count' }), false);
  assert.equal(validateValue(12.5, { decimals: 1, kind: 'count' }), true);
  assert.equal(validateValue(-1, { decimals: 0, kind: 'count' }), false);
  assert.equal(validateValue(-1, { decimals: 0, kind: 'count', allowNegative: true }), true);
  assert.equal(validateValue(Number.NaN, { decimals: 0, kind: 'count' }), false);
  assert.equal(validateValue(Infinity, { decimals: 0, kind: 'count' }), false);
  assert.equal(validateValue('12', { decimals: 0, kind: 'count' }), false);
  assert.equal(validateValue(1e16, { decimals: 0, kind: 'count' }), false);
});

test('affichage français', () => {
  assert.equal(formatNumber(1234567), '1 234 567');
  assert.equal(formatNumber(3.5, 1), '3,5');
  assert.equal(formatNumber(1789, 0, 'year'), '1789');
  assert.equal(formatNumber(-273.15, 2), '−273,15');
});

test('arrondis « ronds » vers l’extérieur', () => {
  assert.equal(roundNice(1234, 'down'), 1200);
  assert.equal(roundNice(1234, 'up'), 1300);
  assert.equal(roundNice(0.0456, 'down', 2), 0.04);
  assert.equal(roundNice(56, 'up'), 56);
});

test('écart normalisé', () => {
  const q = { answer: 100, tol: { rel: 0.1 }, decimals: 0 };
  assert.equal(normalizedError(100, q), 0);
  assert.ok(Math.abs(normalizedError(110, q) - 1) < 1e-9);
  // Se tromper d'un facteur 2 en plus ou en moins compte pareil.
  assert.ok(Math.abs(normalizedError(200, q) - normalizedError(50, q)) < 1e-9);
  assert.equal(normalizedError(1795, { answer: 1789, tol: { abs: 2 }, decimals: 0 }), 3);
});

test('années : 4 chiffres au plus, à la saisie comme côté serveur', () => {
  assert.equal(parseEstimate('1969', 0, false, 'year').ok, true);
  const r = parseEstimate('12345678', 0, false, 'year');
  assert.equal(r.ok, false);
  assert.equal(validateValue(12345678, { decimals: 0, kind: 'year' }), false);
  assert.equal(validateValue(1969, { decimals: 0, kind: 'year' }), true);
});

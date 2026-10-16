"""
« Podium » — écran des résultats.

120 BPM, ré majeur : le leitmotiv passe en majeur, triomphal. Caisse claire de défilé,
cuivres à pleine voix, cordes au galop, chœur. Boucle de 16 mesures.
"""
from __future__ import annotations

from core import Session
from theory import n, chord
from orch import I, brass, line, strings, timpani
import drums as D
import synth as S
from theme import _gallop, _bass_bar, notes

BPM = 120
INTRO = 0
LOOP = 16
PROG = [('D3', 'maj'), ('B2', 'min'), ('G2', 'maj'), ('A2', 'maj'), ('D3', 'maj'), ('F#2', 'min'), ('G2', 'maj'), ('A2', 'maj')]

MEL = [
    ('D4', 1), ('A4', 1), ('D5', 1.5), ('F#5', 0.5),
    ('F#5', 2), ('D5', 1), ('B4', 1),
    ('B4', 2), ('D5', 1), ('G5', 1),
    ('A5', 3), ('E5', 1),
    ('F#5', 1.5), ('F#5', 0.5), ('G5', 1), ('A5', 1),
    ('A5', 2), ('F#5', 1), ('C#5', 1),
    ('B5', 2), ('A5', 1), ('G5', 1),
    ('E5', 1), ('F#5', 1), ('E5', 1), ('C#5', 1),
]


def build(loop_repeats: int = 2) -> Session:
    s = Session(BPM, LOOP * loop_repeats, tail=5.0)
    b = s.beat
    s.track('drums', gain=-6, eq=[('hp', 40)], comp=dict(threshold_db=-12, ratio=3, attack=0.004, release=0.09), rev={'room': 0.15})
    s.track('kick', gain=-11, eq=[('hp', 32), ('peak', 300, 1.0, -3)])
    s.track('bass', gain=-11, duck=0.5, eq=[('hp', 34)])
    s.track('ostinato', gain=-5, rev={'hall': 0.22}, eq=[('hp', 90), ('peak', 280, 0.8, -3), ('highshelf', 3500, 0.7, 5)])
    s.track('brass', gain=-3.5, rev={'hall': 0.32}, eq=[('hp', 80), ('peak', 250, 0.8, -2), ('highshelf', 3200, 0.7, 4.5)])
    s.track('melody', gain=0, rev={'hall': 0.35}, eq=[('hp', 140), ('highshelf', 3000, 0.7, 5), ('peak', 1600, 1, 2)], sat=1.3)
    s.track('strings', gain=-4, rev={'hall': 0.4}, eq=[('hp', 50), ('highshelf', 4000, 0.7, 4)])
    s.track('choir', gain=-8, rev={'hall': 0.5}, eq=[('hp', 200)], width=1.3)
    s.track('timpani', gain=2, rev={'hall': 0.35}, eq=[('hp', 45)])
    s.track('sparkle', gain=-5, rev={'hall': 0.5}, delay=(0.75, 0.25))
    T = s.tracks
    total = LOOP * loop_repeats
    for bar in range(total):
        i = bar % LOOP
        root, q = PROG[i % 8]
        tones = chord(root, q)
        t0 = s.t(bar)
        # caisse claire de défilé
        for k in range(4):
            T['kick'].add(D.kick(0.85, punch=0.8), t0 + k * b)
            s.kicks.append(t0 + k * b)
        for beat, v in [(0, 0.5), (0.75, 0.4), (1, 0.9), (1.5, 0.45), (2, 0.5), (2.5, 0.45), (2.75, 0.5), (3, 0.95), (3.5, 0.45), (3.75, 0.55)]:
            T['drums'].add(D.snare(v, sample_mix=0.9), t0 + beat * b, 1.0, 0.1)
        for k in range(8):
            T['drums'].add(D.hat(0.35 if k % 2 else 0.5), t0 + k * 0.5 * b, 1.0, 0.3)
        if i % 4 == 0:
            T['drums'].add(D.crash(0.7), t0, 1.0, -0.25)
            T['timpani'].add(timpani().hit(n('D2') if root in ('D3', 'B2') else n('A2'), 0.95), t0)
        _bass_bar(s, T['bass'], bar, root)
        _gallop(s, T['ostinato'], bar, root, q, vel=0.62)
        brass(T['brass'], [tones[0], tones[1] + 12, tones[2] + 12], t0, 4 * b - 0.05, vel=0.68, sections=('horn', 'trombone', 'tuba'))
        strings(T['strings'], [tones[0] - 12, tones[0], tones[2]], t0, 4 * b, vel=0.55, sections=('celli', 'basses', 'violas'))
        if i >= 8:
            T['choir'].add(S.choir([t + 24 for t in tones], 4 * b, 'a', vel=0.5), t0)
    for rep in range(loop_repeats):
        base = rep * LOOP
        line(T['melody'], 'trumpet', notes(MEL), s.t(base), b, vel=0.82)
        line(T['melody'], 'horn', notes(MEL), s.t(base), b, vel=0.7, transpose=-12, gain=0.7)
        line(T['melody'], 'trumpet', notes(MEL), s.t(base + 8), b, vel=0.9)
        line(T['melody'], 'violins', notes(MEL), s.t(base + 8), b, vel=0.65, transpose=12, gain=0.6)
        line(T['sparkle'], 'glock', notes([('D6', 1), ('F#6', 1), ('A6', 1), ('D7', 1)]), s.t(base + 7), b, vel=0.4)
        T['sparkle'].add(D.triangles.get('triangle1_hit_mp.wav'), s.t(base + 8), 1.5, 0.5)
    return s

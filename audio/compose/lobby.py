"""
« Salon » — attente des joueurs.

96 BPM, fa majeur, groove souple et chaloupé. Piano électrique FM, basse ronde,
batterie feutrée. Le leitmotiv revient en majeur, joué au pizzicato synthétique et
au glockenspiel, comme un clin d'œil. Boucle de 16 mesures.
"""
from __future__ import annotations

from core import RNG, Session
from theory import n, chord
from orch import I, line, strings
import drums as D
import synth as S

BPM = 96
INTRO = 0
LOOP = 16

PROG = [('F3', 'maj9'), ('E3', 'min7'), ('D3', 'min9'), ('C3', 'maj9'),
        ('Bb2', 'maj9'), ('A2', 'min7'), ('G2', 'min9'), ('C3', '7')]

MOTIF = [('F4', 1), ('C5', 1), ('F5', 1.5), ('A5', 0.5), ('G5', 2), ('E5', 1), ('C5', 1),
         ('D5', 1.5), ('E5', 0.5), ('F5', 1), ('A5', 1), ('G5', 3), (None, 1),
         ('F5', 1), ('C5', 1), ('F5', 1.5), ('A5', 0.5), ('Bb5', 2), ('A5', 1), ('G5', 1),
         ('F5', 1), ('D5', 1), ('C5', 1), ('A4', 1), ('G4', 2), ('C5', 2)]

SWING = 0.09  # en temps, appliqué aux doubles-croches paires


def sw(k16: int) -> float:
    return k16 * 0.25 + (SWING if k16 % 2 == 1 else 0.0)


def build(loop_repeats: int = 2) -> Session:
    s = Session(BPM, LOOP * loop_repeats, tail=4.0)
    b = s.beat
    keys = s.track('keys', gain=-3, rev={'plate': 0.28}, eq=[('hp', 140), ('peak', 2500, 0.8, 3), ('highshelf', 6000, 0.7, 3)], width=1.3)
    bass = s.track('bass', gain=-14, duck=0.3, eq=[('hp', 35), ('lp', 1800)])
    kick = s.track('kick', gain=-13, eq=[('hp', 35), ('lp', 6000)])
    drums = s.track('drums', gain=-7, rev={'room': 0.18}, eq=[('hp', 70)])
    lead = s.track('lead', gain=-5, rev={'hall': 0.3}, delay=(0.75, 0.22), eq=[('hp', 200)])
    pad = s.track('pad', gain=-13, rev={'hall': 0.4}, eq=[('hp', 200), ('lp', 6000)], width=1.5)
    strg = s.track('strings', gain=-8, rev={'hall': 0.45}, eq=[('hp', 120), ('highshelf', 4000, 0.7, 3)])
    sparkle = s.track('sparkle', gain=-9, rev={'hall': 0.5}, delay=(0.5, 0.25))

    for rep in range(loop_repeats):
        for i in range(LOOP):
            bar = rep * LOOP + i
            root, q = PROG[i % 8]
            tones = chord(root, q)
            voic = [t + 12 for t in tones[1:]] + [tones[0] + 12]
            # comping du piano électrique (rythme chaloupé, deux variantes)
            hits = [(0, 1.4, 0.7), (1.75 + SWING, 0.4, 0.55), (2.5, 1.2, 0.62)] if i % 2 == 0 else \
                   [(0, 0.9, 0.62), (1.5, 0.4, 0.5), (2.25 + SWING, 0.5, 0.55), (3.5, 0.5, 0.5)]
            for beat, dur, v in hits:
                for k, m in enumerate(sorted(voic)):
                    keys.add(S.fm_keys(m, dur * b, v * (0.9 + 0.2 * RNG.random()), bright=0.8),
                             s.t(bar, beat) + k * 0.006, 0.55, -0.2 + 0.15 * k)
            # basse : fondamentale, rebond, quinte, note d'approche
            r = 28 + ((n(root) % 12) - 4) % 12 + 12
            nxt = 28 + ((n(PROG[(i + 1) % 8][0]) % 12) - 4) % 12 + 12
            for beat, m, d, v in [(0, r, 1.2, 0.95), (1.5 + SWING / 2, r, 0.4, 0.7), (2.5, r + 7, 0.8, 0.8),
                                  (3.5, nxt - 1 if (i % 2) else r + 12, 0.4, 0.65)]:
                bass.add(S.sub_bass(m, d * b, v, drive=1.2), s.t(bar, beat))
            # batterie feutrée
            for beat, v in [(0, 0.9), (2.5 + SWING, 0.55), (2.75 if i % 4 == 3 else 99, 0.5)]:
                if beat < 4:
                    kick.add(D.kick(v, tone=55, punch=0.6, click=0.2), s.t(bar, beat))
                    s.kicks.append(s.t(bar, beat))
            drums.add(D.snare(0.45, tone=210, snappy=0.5, sample_mix=0.85), s.t(bar, 1))
            drums.add(D.snare(0.5, tone=210, snappy=0.5, sample_mix=0.85), s.t(bar, 3))
            for k in range(16):
                v = (0.42 if k % 4 == 0 else 0.3 if k % 2 == 0 else 0.22) * (0.85 + 0.3 * RNG.random())
                drums.add(D.hat(v, open_=(k == 14 and i % 2 == 1)), s.t(bar, sw(k)), 1.0, 0.3)
                if k % 2 == 0:
                    drums.add(D.shaker(0.25 + 0.1 * RNG.random()), s.t(bar, sw(k) + 0.02), 1.0, -0.4)
            pad.add(S.pad([t + 12 for t in tones[:3]], 4 * b, vel=0.35, cutoff=1400, attack=1.0), s.t(bar))
            if i >= 8:
                strings(strg, [tones[0] + 12, tones[2] + 12, tones[1] + 24], s.t(bar), 4 * b, vel=0.35, attack=0.5,
                        sections=('violas', 'violins'))
        # leitmotiv en majeur (seconde moitié de la boucle)
        base = rep * LOOP + 8
        t = s.t(base)
        for m, d in MOTIF:
            if m:
                lead.add(S.pluck(n(m), 0.62, decay=0.45, bright=4500, length=1.6), t, 1.0, 0.15)
                lead.add(I('glock').note(n(m) + 24, 99, 0.25), t, 0.35, -0.2) if n(m) + 24 >= 79 else None
            t += d * b
        line(sparkle, 'harp', [(n('F5'), 0.5), (n('A5'), 0.5), (n('C6'), 0.5), (n('F6'), 2.5)], s.t(rep * LOOP + 3, 2), b, vel=0.4)
    return s

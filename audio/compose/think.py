"""
« Réflexion » — musique adaptative de la phase d'estimation et de contestation.

Deux couches parfaitement synchronisées, rendues séparément :
  - think_a « Concentration » : tic-tac d'horloge, pulsation filtrée, nappe, basse en pédale ;
  - think_b « Pression » : ostinato de violoncelles, trémolos de violons, cœur qui bat,
    toms et cors qui enflent.
Le jeu fait monter la couche B quand le temps presse et pendant la contestation.
120 BPM, ré mineur, boucle de 16 mesures (32 s).
"""
from __future__ import annotations

from core import Session
from theory import n, chord
from orch import I, timpani
import drums as D
import synth as S

BPM = 120
LOOP = 16
PROG = [('D3', 'madd9'), ('Bb2', 'maj7'), ('G2', 'min9'), ('A2', 'sus4')]  # 4 mesures chacun


def _harmony(i: int):
    root, q = PROG[(i // 4) % 4]
    if i % 16 == 15:
        q = '7' if root == 'A2' else q
    return root, q


def build_a(loop_repeats: int = 2) -> Session:
    s = Session(BPM, LOOP * loop_repeats, tail=4.0)
    b = s.beat
    clock = s.track('clock', gain=-12, rev={'room': 0.25}, eq=[('hp', 800)])
    pulse = s.track('pulse', gain=-8, rev={'hall': 0.18}, delay=(0.75, 0.15), eq=[('hp', 170), ('peak', 2200, 0.9, 3)])
    pad = s.track('pad', gain=-11, rev={'hall': 0.45}, eq=[('hp', 120), ('lp', 5000)], width=1.5)
    sub = s.track('sub', gain=-19, eq=[('hp', 38), ('lp', 320)])
    sparkle = s.track('sparkle', gain=-12, rev={'hall': 0.55}, delay=(0.75, 0.3))
    total = LOOP * loop_repeats
    for bar in range(total):
        i = bar % LOOP
        root, q = _harmony(i)
        tones = chord(root, q)
        # horloge : tic à chaque croche, tac plus grave sur les temps
        for k in range(8):
            clock.add(D.tick(0.35 if k % 2 else 0.5, f=2900 if k % 2 else 1900, length=0.04), s.t(bar, k * 0.5), 1.0,
                      0.35 if k % 2 else -0.35)
        # pulsation : croches sur la fondamentale, ouverture progressive du filtre sur 16 mesures
        r = n(root) if n(root) >= n('D3') else n(root) + 12
        seq = [r, r, r + 12, r, r + 7, r, r + 12, r + 10]
        for k, m in enumerate(seq):
            cut = 700 + 2600 * (i / LOOP) ** 1.5
            pulse.add(S.arp_voice(m, 0.45, 0.5 if k % 2 == 0 else 0.38, cutoff=cut), s.t(bar, k * 0.5), 1.0,
                      0.25 if k % 2 else -0.25)
        if i % 4 == 0:
            pad.add(S.pad([t + 12 for t in tones], 16 * b, vel=0.45, cutoff=1300, attack=2.0, release=2.0), s.t(bar))
            sub.add(S.sub_bass(28 + ((n(root) % 12) - 4) % 12, 16 * b - 0.1, 0.8, drive=1.1), s.t(bar))
        if i in (0, 8):
            for k, m in enumerate([n('D6'), n('A6'), n('F6') if i == 0 else n('E6')]):
                sparkle.add(I('glock').note(m, 99, 0.3), s.t(bar, 2 + k), 1.0, -0.3 + 0.3 * k)
    return s


def build_b(loop_repeats: int = 2) -> Session:
    s = Session(BPM, LOOP * loop_repeats, tail=4.0)
    b = s.beat
    ost = s.track('ostinato', gain=-5, rev={'hall': 0.22}, eq=[('hp', 70), ('peak', 280, 0.8, -3), ('highshelf', 3500, 0.7, 4)])
    trem = s.track('trem', gain=-10, rev={'hall': 0.4}, eq=[('hp', 300), ('highshelf', 5000, 0.7, 3)], width=1.4)
    heart = s.track('heart', gain=-14, eq=[('hp', 36), ('lp', 3000)])
    toms = s.track('toms', gain=-9, rev={'hall': 0.3})
    horns = s.track('horns', gain=-6, rev={'hall': 0.4}, eq=[('hp', 80), ('highshelf', 3000, 0.7, 3)])
    fx = s.track('fx', gain=-14, rev={'hall': 0.4})
    total = LOOP * loop_repeats
    for bar in range(total):
        i = bar % LOOP
        root, q = _harmony(i)
        tones = chord(root, q)
        r = n(root) if n(root) >= n('C3') else n(root) + 12
        # ostinato en doubles-croches, accents sur 1 et 3
        fig = [r, r, r + 7, r, r, r + 7, r + 12, r + 7] * 2
        for k, m in enumerate(fig):
            v = 0.72 if k % 4 == 0 else 0.5
            ost.add(I('celli_spic').note(m, 99, v), s.t(bar, k * 0.25), 1.0, 0.4)
            if k % 2 == 0:
                ost.add(I('violins_spic').note(m + 12 + (3 if k % 8 == 4 else 0), 99, v * 0.8), s.t(bar, k * 0.25), 0.6, -0.4)
        # cœur qui bat
        for beat in (0, 0.35):
            heart.add(D.kick(0.8 if beat == 0 else 0.6, tone=46, punch=0.5, click=0.05, length=0.5), s.t(bar, beat))
        toms.add(D.tom(95, 0.55), s.t(bar, 2.5), 1.0, 0.4)
        toms.add(D.tom(72, 0.65), s.t(bar, 3.0), 1.0, -0.3)
        if i % 4 == 3:
            for k, f in enumerate([180, 150, 125, 100]):
                toms.add(D.tom(f, 0.55 + 0.08 * k), s.t(bar, 3 + k * 0.25), 1.0, 0.4 - 0.25 * k)
        if i % 4 == 0:
            for m in [tones[0] + 12, tones[2] + 12]:
                trem.add(I('violins_trem').note(m + 12, 16 * b - 0.2, 0.5, attack=5.0), s.t(bar), 0.8, -0.35 if m == tones[0] + 12 else 0.35)
            for m in [tones[0], tones[1] + 12 if q != 'sus4' else tones[2]]:
                horns.add(I('horn').note(m + 12, 8 * b, 0.6, attack=3.5), s.t(bar), 0.8, -0.3)
            horns.add(I('horn').note(tones[2] + 12, 8 * b, 0.6, attack=3.5), s.t(bar + 2), 0.7, 0.3)
            ost.add(timpani().hit(n('D2') if root == 'D3' else n('A2') if root == 'A2' else n('G2'), 0.6), s.t(bar), 0.9)
        if i == LOOP - 1:
            fx.add(D.riser(4 * b, 0.4), s.t(bar))
            fx.add(D.cymbal_swell(4 * b, 0.4), s.t(bar))
    return s

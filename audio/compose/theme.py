"""
« Magnitude » — thème principal (menu).

120 BPM, ré mineur. Intro de 4 mesures puis boucle de 24 mesures :
  A (8) couplet : le leitmotiv aux cors et trompettes, ostinato de cordes au galop ;
  B (8) refrain : mélodie aux trompettes et violons à l'octave, chœur, cymbales ;
  C (8) pont : demi-tempo, harpe, glockenspiel et flûte, montée finale.
Le leitmotiv « Magnitude » : ré – la – ré – fa, quatre marches qui montent
comme des ordres de grandeur.
"""
from __future__ import annotations

from core import Session
from theory import n, chord
from orch import I, brass, line, play, strings, timpani, harp_gliss
import drums as D
import synth as S

BPM = 120
INTRO = 4
LOOP = 24

# Harmonie (une mesure par accord)
A_PROG = [('D3', 'min'), ('Bb2', 'maj'), ('F2', 'maj'), ('C3', 'maj'), ('D3', 'min'), ('Bb2', 'maj'), ('G2', 'min'), ('A2', 'maj')]
B_PROG = [('Bb2', 'maj'), ('F2', 'maj'), ('C3', 'maj'), ('D3', 'min'), ('Bb2', 'maj'), ('F2', 'maj'), ('G2', 'min'), ('A2', 'maj')]
C_PROG = [('G2', 'min'), ('D3', 'min'), ('Bb2', 'maj'), ('F2', 'maj'), ('G2', 'min'), ('D3', 'min'), ('Eb3', 'maj'), ('A2', 'maj')]

# Mélodies : (note, durée en temps)
MEL_A = [
    ('D4', 1), ('A4', 1), ('D5', 1.5), ('F5', 0.5),
    ('F5', 2), ('D5', 1), ('Bb4', 1),
    ('C5', 3), ('A4', 1),
    ('G4', 2), ('E4', 1), ('G4', 1),
    ('D4', 1), ('A4', 1), ('D5', 1.5), ('F5', 0.5),
    ('G5', 2), ('F5', 1), ('D5', 1),
    ('Bb5', 2), ('A5', 1), ('G5', 1),
    ('A5', 3), ('E5', 1),
]
MEL_B = [
    ('F5', 1.5), ('F5', 0.5), ('G5', 1), ('F5', 1),
    ('A5', 2), ('G5', 1), ('F5', 1),
    ('E5', 3), ('G5', 1),
    ('F5', 2), ('D5', 2),
    ('F5', 1.5), ('F5', 0.5), ('G5', 1), ('A5', 1),
    ('C6', 2), ('A5', 2),
    ('Bb5', 1), ('A5', 1), ('G5', 1), ('F5', 1),
    ('E5', 2), ('C#5', 2),
]
MEL_C = [
    ('Bb4', 2), ('D5', 2), ('A4', 4), ('F5', 2), ('D5', 2), ('C5', 4),
    ('Bb4', 2), ('D5', 2), ('F5', 2), ('A5', 2), ('G5', 4), ('A5', 2), (None, 2),
]


def notes(mel):
    return [(n(m) if m else None, d) for m, d in mel]


def chord_tones(root: str, q: str):
    return chord(root, q)


def build(loop_repeats: int = 2) -> Session:
    bars = INTRO + LOOP * loop_repeats
    s = Session(BPM, bars, tail=5.0)
    b = s.beat

    drums = s.track('drums', gain=-5.0, eq=[('hp', 30), ('peak', 4000, 1.0, 1.5)], comp=dict(threshold_db=-12, ratio=3, attack=0.004, release=0.09), rev={'room': 0.12})
    kick = s.track('kick', gain=-9.0, eq=[('hp', 32), ('peak', 62, 1.1, 1.5), ('peak', 300, 1.0, -3)])
    perc = s.track('perc', gain=-5, rev={'hall': 0.25})
    bass = s.track('bass', gain=-10.0, duck=0.55, eq=[('hp', 34), ('lp', 2500)])
    arp = s.track('arp', gain=-8, duck=0.5, delay=(0.75, 0.18), rev={'hall': 0.12}, eq=[('hp', 200)], width=1.4)
    pads = s.track('pads', gain=-10, duck=0.35, rev={'hall': 0.35}, eq=[('hp', 180), ('lp', 7000)], width=1.5)
    choir = s.track('choir', gain=-8, rev={'hall': 0.5}, eq=[('hp', 200)], width=1.3)
    br = s.track('brass', gain=-3.0, rev={'hall': 0.32}, eq=[('hp', 80), ('peak', 250, 0.8, -2), ('highshelf', 3200, 0.7, 4.5), ('peak', 1800, 0.9, 2)], comp=dict(threshold_db=-16, ratio=2, attack=0.02, release=0.2))
    mel = s.track('melody', gain=0.0, rev={'hall': 0.35}, eq=[('hp', 140), ('highshelf', 3000, 0.7, 5), ('peak', 1600, 1.0, 2)], sat=1.3)
    st = s.track('strings', gain=-3.5, rev={'hall': 0.38}, eq=[('hp', 50), ('peak', 300, 0.8, -2), ('highshelf', 4000, 0.7, 4)])
    ost = s.track('ostinato', gain=-4.5, rev={'hall': 0.22}, eq=[('hp', 90), ('peak', 280, 0.8, -3), ('highshelf', 3500, 0.7, 5)])
    timp = s.track('timpani', gain=2.0, rev={'hall': 0.35}, eq=[('hp', 45)])
    fx = s.track('fx', gain=-12, rev={'hall': 0.4}, eq=[('hp', 30)])
    sparkle = s.track('sparkle', gain=-4, rev={'hall': 0.5}, delay=(0.75, 0.25))

    # ---------------------------------------------------------------- INTRO
    for bar in range(INTRO):
        root, q = A_PROG[0]
        pads.add(S.pad([n('D3'), n('A3'), n('F4')], 4 * b, vel=0.5 + 0.1 * bar, cutoff=900 + 600 * bar, attack=1.2), s.t(bar))
    timp.add(timpani().roll(n('D2'), 4 * b * INTRO - 0.1, vel=0.75), s.t(0))
    st.add(I('violins_trem').note(n('A4'), INTRO * 4 * b, 0.4, attack=2.5), s.t(0), 0.8, -0.4)
    st.add(I('violins_trem').note(n('D5'), INTRO * 4 * b, 0.4, attack=3.0), s.t(0), 0.7, 0.3)
    st.add(I('celli').note(n('D3'), INTRO * 4 * b, 0.55, attack=2.0), s.t(0), 1.0, 0.4)
    st.add(I('basses').note(n('D2'), INTRO * 4 * b, 0.6, attack=2.0), s.t(0), 0.8, 0.3)
    # Annonce du motif aux cors, lointain
    line(br, 'horn', notes([('D4', 1), ('A4', 1), ('D5', 1.5), ('F5', 0.5), ('E5', 4)]), s.t(1), b, vel=0.55, attack=0.05)
    line(sparkle, 'glock', notes([('D6', 1), ('A6', 1), ('D7', 2)]), s.t(2, 2), b, vel=0.4)
    fx.add(D.cymbal_swell(4 * b), s.t(INTRO - 1))
    fx.add(D.riser(2 * b, 0.35), s.t(INTRO - 1, 2))
    perc.add(D.snare_roll(2 * b, 0.15, 0.8), s.t(INTRO - 1, 2), 0.7)

    for rep in range(loop_repeats):
        base = INTRO + rep * LOOP
        section_a(s, base, locals())
        section_b(s, base + 8, locals())
        section_c(s, base + 16, locals())
    return s


def _drum_bar(s, tr, kick_tr, bar, fill=False, crash=False, half=False, hats=True):
    b = s.beat
    t0 = s.t(bar)
    if half:
        kick_tr.add(D.kick(0.95), t0)
        s.kicks.append(t0)
        tr.add(D.snare(0.75), t0 + 2 * b)
        kick_tr.add(D.kick(0.6), t0 + 3.5 * b)
        s.kicks.append(t0 + 3.5 * b)
    else:
        for k in range(4):
            kick_tr.add(D.kick(0.95 if k % 2 == 0 else 0.88), t0 + k * b)
            s.kicks.append(t0 + k * b)
        tr.add(D.snare(0.85), t0 + 1 * b)
        tr.add(D.snare(0.9), t0 + 3 * b)
        tr.add(D.clap(0.5), t0 + 1 * b, 0.6)
        tr.add(D.clap(0.5), t0 + 3 * b, 0.6)
    if hats:
        for k in range(16 if not half else 8):
            step = 0.25 if not half else 0.5
            acc = 0.55 if k % 2 == 0 else 0.32
            tr.add(D.hat(acc, open_=(k % 8 == 6 and not half)), t0 + k * step * b, 1.0, 0.25 if k % 2 else -0.15)
    if fill:
        for k, f in enumerate([220, 180, 150, 120, 100, 85]):
            tr.add(D.tom(f, 0.8), t0 + (2.5 + k * 0.25) * b, 1.0, 0.5 - k * 0.2)
    if crash:
        tr.add(D.crash(0.75), t0, 1.0, -0.2)


def _bass_bar(s, tr, bar, root: str, octave_pulse=True, sustain=False):
    b = s.beat
    # fondamentale ramenée entre mi1 et ré#2 : registre homogène pour la sub-basse
    r = 28 + ((n(root) % 12) - 4) % 12
    if sustain:
        tr.add(S.sub_bass(r, 4 * b - 0.05, 0.85), s.t(bar))
        return
    for k in range(8):
        m = r + (12 if (octave_pulse and k % 2 == 1) else 0)
        tr.add(S.sub_bass(m, 0.5 * b - 0.03, 0.9 if k % 2 == 0 else 0.7), s.t(bar, k * 0.5))


def _arp_bar(s, tr, bar, root, q, pattern=(0, 1, 2, 3, 2, 1, 2, 3), oct_=5):
    b = s.beat
    tones = chord(root, q)
    pool = [t + 12 * (oct_ - 3) for t in tones] + [tones[0] + 12 * (oct_ - 2)]
    for k in range(16):
        m = pool[pattern[k % len(pattern)] % len(pool)]
        tr.add(S.arp_voice(m, 0.4, 0.55 if k % 4 == 0 else 0.42), s.t(bar, k * 0.25), 1.0, 0.3 if k % 2 else -0.3)


def _gallop(s, tr, bar, root, q, vel=0.6):
    """Ostinato « au galop » (croche + deux doubles) aux violons et violoncelles en spiccato."""
    b = s.beat
    tones = chord(root, q)
    low = tones[0] if tones[0] >= n('C3') else tones[0] + 12
    hi = [t + 12 for t in tones]
    for beat in range(4):
        t = s.t(bar, beat)
        for sub, v in ((0, 1.0), (0.5, 0.8), (0.75, 0.8)):
            tr.add(I('celli_spic').note(low, 99, vel * v), t + sub * b, 0.9, 0.45)
            tr.add(I('violins_spic').note(hi[(beat + (sub > 0)) % 3], 99, vel * v * 0.9), t + sub * b, 0.75, -0.4)


def section_a(s: Session, base: int, ctx) -> None:
    b = s.beat
    T = s.tracks
    timp = T['timpani']
    T['fx'].add(D.impact(0.7), s.t(base))
    T['drums'].add(D.crash(0.85), s.t(base), 1.0, 0.2)
    timp.add(timpani().hit(n('D2'), 1.0), s.t(base))
    for i, (root, q) in enumerate(A_PROG):
        bar = base + i
        _drum_bar(s, T['drums'], T['kick'], bar, fill=(i == 7), crash=(i == 4))
        _bass_bar(s, T['bass'], bar, root)
        _arp_bar(s, T['arp'], bar, root, q)
        _gallop(s, T['ostinato'], bar, root, q, vel=0.55)
        tones = chord(root, q)
        # cors en accords tenus
        brass(T['brass'], [t + 12 for t in tones], s.t(bar), 4 * b - 0.05, vel=0.55, sections=('horn', 'trombone'), attack=0.08)
        T['pads'].add(S.pad([t + 12 for t in tones], 4 * b, vel=0.45, cutoff=2200), s.t(bar))
        if i in (3, 7):
            timp.add(timpani().hit(n('A2'), 0.7), s.t(bar, 3))
            timp.add(timpani().hit(n('A2'), 0.8), s.t(bar, 3.5))
    # leitmotiv : cors (octave basse) + trompettes
    line(T['melody'], 'horn', notes(MEL_A), s.t(base), b, vel=0.78, transpose=-12, gain=0.9)
    line(T['melody'], 'trumpet', notes(MEL_A[12:]), s.t(base + 4), b, vel=0.72, gain=0.7)
    line(T['melody'], 'violins', notes(MEL_A), s.t(base), b, vel=0.5, gain=0.55)
    T['fx'].add(D.reverse_crash(1.4), s.t(base + 8) - 1.4)


def section_b(s: Session, base: int, ctx) -> None:
    b = s.beat
    T = s.tracks
    T['fx'].add(D.impact(0.9), s.t(base))
    T['timpani'].add(timpani().hit(n('F2'), 1.0), s.t(base))
    for i, (root, q) in enumerate(B_PROG):
        bar = base + i
        _drum_bar(s, T['drums'], T['kick'], bar, crash=(i % 2 == 0), fill=(i == 7))
        _bass_bar(s, T['bass'], bar, root)
        _arp_bar(s, T['arp'], bar, root, q, pattern=(0, 2, 1, 3, 0, 2, 3, 2))
        _gallop(s, T['ostinato'], bar, root, q, vel=0.68)
        tones = chord(root, q)
        brass(T['brass'], [tones[0], tones[1] + 12, tones[2] + 12, tones[0] + 24], s.t(bar), 4 * b - 0.05, vel=0.72,
              sections=('horn', 'trombone', 'tuba'))
        strings(T['strings'], [tones[0] - 12, tones[0], tones[2], tones[1] + 12], s.t(bar), 4 * b, vel=0.6,
                sections=('celli', 'basses', 'violas'))
        T['choir'].add(S.choir([t + 24 for t in tones], 4 * b, 'a', vel=0.45), s.t(bar))
        if i % 2 == 1:
            T['timpani'].add(timpani().hit(n(root) - 12 if n(root) - 12 >= n('D2') else n(root), 0.7), s.t(bar, 2))
    line(T['melody'], 'trumpet', notes(MEL_B), s.t(base), b, vel=0.85, gain=1.0)
    line(T['melody'], 'violins', notes(MEL_B), s.t(base), b, vel=0.62, gain=0.7)
    line(T['melody'], 'horn', notes(MEL_B), s.t(base), b, vel=0.7, transpose=-12, gain=0.55)
    line(T['sparkle'], 'glock', notes([('D6', 1), ('A6', 1), ('D7', 2)]), s.t(base + 3), b, vel=0.4)
    line(T['sparkle'], 'glock', notes([('F6', 1), ('C7', 1), ('F7', 2)]), s.t(base + 5), b, vel=0.35)


def section_c(s: Session, base: int, ctx) -> None:
    b = s.beat
    T = s.tracks
    T['drums'].add(D.crash(0.6, 'crash_hit_mp_loose.wav'), s.t(base))
    for i, (root, q) in enumerate(C_PROG):
        bar = base + i
        last = i >= 6
        _drum_bar(s, T['drums'], T['kick'], bar, half=not last, hats=(i >= 4))
        _bass_bar(s, T['bass'], bar, root, sustain=not last)
        tones = chord(root, q)
        T['pads'].add(S.pad([t + 12 for t in tones] + [tones[0] + 24], 4 * b, vel=0.38, cutoff=1500), s.t(bar))
        strings(T['strings'], [tones[0], tones[2], tones[1] + 12, tones[0] + 24], s.t(bar), 4 * b, vel=0.5,
                attack=0.25, sections=('celli', 'violas', 'violins'))
        T['choir'].add(S.choir([t + 24 for t in tones[:2]], 4 * b, 'o', vel=0.35), s.t(bar))
        # harpe en arpèges
        for k in range(8):
            m = (tones + [t + 12 for t in tones])[k % 6] + 12
            T['sparkle'].add(I('harp').note(m, 99, 0.55), s.t(bar, k * 0.5), 1.1, -0.3 + 0.08 * k)
        if last:
            _arp_bar(s, T['arp'], bar, root, q)
    line(T['melody'], 'flute', notes(MEL_C), s.t(base), b, vel=0.7, gain=0.9)
    line(T['sparkle'], 'glock', notes(MEL_C), s.t(base), b, vel=0.42, transpose=24)
    line(T['melody'], 'horn', notes(MEL_C[8:]), s.t(base + 4), b, vel=0.6, transpose=-12, gain=0.6)
    # montée vers le retour du couplet
    T['drums'].add(D.snare_roll(4 * b, 0.12, 0.85), s.t(base + 7), 0.8)
    T['fx'].add(D.riser(4 * b, 0.4), s.t(base + 7))
    T['fx'].add(D.cymbal_swell(4 * b, 0.6), s.t(base + 7))
    T['timpani'].add(timpani().roll(n('A2'), 4 * b, vel=0.7), s.t(base + 7))
    harp_gliss(T['sparkle'], n('A3'), n('A6'), chord('A3', 'maj') + [n('D4'), n('E4'), n('G4')], s.t(base + 7, 2), 1.8 * b, 0.5)

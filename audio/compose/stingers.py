"""
Jingles d'événements. Tous dérivent du leitmotiv (ré – la – ré – fa/fa#) et restent en ré,
pour se fondre avec la musique en cours (qui s'efface sous eux).

Chaque fonction renvoie (Session, sonie_cible_LUFS).
"""
from __future__ import annotations

from core import Session
from theory import n, chord
from orch import I, brass, harp_gliss, line, strings, timpani
import drums as D
import synth as S

BPM = 120

D_MAJ = [n('D3'), n('A3'), n('D4'), n('F#4'), n('A4'), n('D5')]
D_MIN = [n('D3'), n('A3'), n('D4'), n('F4'), n('A4'), n('D5')]
D_MAJ_SCALE = [n(x) for x in ('D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5')]
D_LYD = [n(x) for x in ('D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5')]


def _sess(seconds: float) -> Session:
    s = Session(BPM, seconds / 2.0, tail=0.0)
    s.track('brass', gain=-2, rev={'hall': 0.32}, eq=[('hp', 80), ('peak', 250, 0.8, -2), ('highshelf', 3200, 0.7, 4.5)])
    s.track('mel', gain=0, rev={'hall': 0.35}, eq=[('hp', 140), ('highshelf', 3000, 0.7, 5)], sat=1.25)
    s.track('strings', gain=-3, rev={'hall': 0.4}, eq=[('hp', 50), ('highshelf', 4000, 0.7, 4)])
    s.track('perc', gain=-4, rev={'hall': 0.3}, eq=[('hp', 35)])
    s.track('timp', gain=1, rev={'hall': 0.35}, eq=[('hp', 45)])
    s.track('choir', gain=-7, rev={'hall': 0.5}, eq=[('hp', 200)], width=1.3)
    s.track('sparkle', gain=-5, rev={'hall': 0.55}, delay=(0.375, 0.22))
    s.track('fx', gain=-9, rev={'hall': 0.35}, eq=[('hp', 30)])
    s.track('synth', gain=-6, rev={'plate': 0.3})
    return s


def gamestart():
    s = _sess(5.5)
    T = s.tracks
    T['perc'].add(D.snare_roll(1.5, 0.15, 0.9), 0.0, 0.8)
    T['timp'].add(timpani().roll(n('A2'), 1.5, 0.8), 0.0)
    T['fx'].add(D.cymbal_swell(1.5, 0.8), 0.0)
    T['fx'].add(D.riser(1.5, 0.4), 0.0)
    for k, m in enumerate(['D4', 'A4', 'D5', 'F5']):
        T['mel'].add(I('trumpet_stac').note(n(m), 99, 0.9), 1.0 + k * 0.125, 1.0, 0.2)
        T['mel'].add(I('violins_spic').note(n(m), 99, 0.8), 1.0 + k * 0.125, 0.6, -0.3)
    hit = 1.5
    T['fx'].add(D.impact(1.0), hit)
    T['perc'].add(D.crash(0.9), hit, 1.0, -0.2)
    T['perc'].add(D.gong(0.6), hit, 1.0, 0.3)
    T['timp'].add(timpani().hit(n('D2'), 1.0), hit)
    brass(T['brass'], D_MIN + [n('F5')], hit, 1.8, vel=0.95)
    strings(T['strings'], [n('D2'), n('D3'), n('A3'), n('F4'), n('D5'), n('A5')], hit, 2.0, vel=0.85)
    T['choir'].add(S.choir([n('D4'), n('F4'), n('A4'), n('D5')], 1.8, 'a', vel=0.6, attack=0.05), hit)
    line(T['sparkle'], 'glock', [(n('D6'), 0.25), (n('F6'), 0.25), (n('A6'), 0.25), (n('D7'), 1)], hit + 0.25, s.beat, vel=0.5)
    return s, -13.5


def round_start():
    s = _sess(2.8)
    T = s.tracks
    T['fx'].add(D.whoosh(0.5, 0.7), 0.0)
    hit = 0.45
    T['fx'].add(D.impact(0.55, sub=0.7), hit)
    T['timp'].add(timpani().hit(n('D2'), 0.85), hit)
    for m in [n('D3'), n('A3'), n('D4'), n('F4')]:
        T['brass'].add(I('horn_stac').note(m, 99, 0.85), hit, 0.7, -0.3)
    for m in [n('D4'), n('F4'), n('A4'), n('D5')]:
        T['brass'].add(I('trumpet_stac').note(m, 99, 0.8), hit, 0.6, 0.3)
    for m in [n('D3'), n('A3')]:
        T['brass'].add(I('trombone_stac').note(m, 99, 0.85), hit, 0.7, 0.4)
    for m in [n('D3'), n('D4'), n('A4')]:
        T['strings'].add(I('celli_spic' if m < 55 else 'violins_spic').note(m, 99, 0.85), hit, 0.8)
    T['perc'].add(D.crash(0.45, 'crash_hit_mp_loose.wav'), hit, 1.0, 0.25)
    T['sparkle'].add(I('glock').note(n('D7'), 99, 0.35), hit + 0.05, 1.0, 0.3)
    return s, -16.0


def prime():
    s = _sess(4.2)
    T = s.tracks
    steps = [(0.0, 'Bb2', 'maj', n('F2')), (0.5, 'C3', 'maj', n('G2')), (1.0, 'D3', 'maj', n('D2'))]
    for t, root, q, tp in steps:
        tones = chord(root, q)
        big = root == 'D3'
        T['timp'].add(timpani().hit(tp, 0.8 if not big else 1.0), t)
        voic = [tones[0], tones[1] + 12, tones[2] + 12, tones[0] + 24, tones[1] + 24]
        if big:
            brass(T['brass'], voic + [tones[2] + 24], t, 1.6, vel=0.95)
            strings(T['strings'], [tones[0] - 12] + voic + [tones[0] + 36], t, 1.8, vel=0.85)
            T['choir'].add(S.choir([x + 12 for x in voic[1:4]], 1.6, 'a', vel=0.6, attack=0.05), t)
            T['fx'].add(D.impact(0.9), t)
            T['perc'].add(D.crash(0.85), t, 1.0, -0.2)
            T['perc'].add(D.gong(0.45), t, 1.0, 0.3)
            line(T['sparkle'], 'glock', [(n('D6'), 0.2), (n('F#6'), 0.2), (n('A6'), 0.2), (n('D7'), 1)], t + 0.1, s.beat, vel=0.5)
        else:
            for m in voic:
                inst = 'trumpet_stac' if m >= 60 else 'trombone_stac' if m < 52 else 'horn_stac'
                T['brass'].add(I(inst).note(m, 99, 0.85), t, 0.65)
                T['strings'].add(I('violins_spic' if m >= 55 else 'celli_spic').note(m, 99, 0.8), t, 0.6)
    T['fx'].add(D.reverse_crash(0.95, 0.5), 0.05)
    return s, -14.0


def lock():
    s = _sess(1.2)
    T = s.tracks
    T['synth'].add(D.kick(0.9, tone=58, punch=1.2, length=0.4, click=1.0), 0.0)
    T['synth'].add(D.tom(85, 0.7, 0.35), 0.0)
    T['synth'].add(D.tick(0.55, f=3200, length=0.05), 0.0, 1.0, -0.2)
    T['synth'].add(D.tick(0.4, f=4600, length=0.04), 0.045, 1.0, 0.25)
    T['timp'].add(timpani().hit(n('D2'), 0.45), 0.0, 0.6)
    return s, -17.0


def contest():
    s = _sess(1.8)
    T = s.tracks
    for m in [n('D2') + 12, n('A2')]:
        T['brass'].add(I('trombone_stac').note(m, 99, 0.95), 0.0, 0.8, 0.3)
    T['brass'].add(I('horn_stac').note(n('D3'), 99, 0.9), 0.0, 0.7, -0.3)
    T['strings'].add(I('celli_spic').note(n('D3'), 99, 0.95), 0.0, 1.0, 0.4)
    T['strings'].add(I('basses').note(n('D2'), 0.35, 0.9), 0.0, 0.8, 0.3)
    T['timp'].add(timpani().hit(n('D2'), 0.95), 0.0)
    T['perc'].add(D.snare(0.7), 0.0, 0.8)
    T['fx'].add(D.impact(0.5, sub=0.8), 0.0)
    return s, -16.0


def suspense(seconds: float):
    """Crescendo de suspense qui se coupe net à la fin : la révélation enchaîne aussitôt."""
    s = _sess(seconds)
    T = s.tracks
    T['perc'].add(D.snare_roll(seconds - 0.02, 0.1, 1.0, rate=24), 0.0, 0.9)
    T['timp'].add(timpani().roll(n('A2'), seconds, 0.85), 0.0)
    T['fx'].add(D.riser(seconds, 0.45), 0.0)
    T['fx'].add(D.cymbal_swell(seconds, 0.6), 0.0)
    T['strings'].add(I('violins_trem').note(n('A4'), seconds * 0.55, 0.6, attack=seconds * 0.5), 0.0, 0.8, -0.35)
    T['strings'].add(I('violins_trem').note(n('D5'), seconds * 0.5, 0.65, attack=seconds * 0.4), seconds * 0.48, 0.8, 0.35)
    T['strings'].add(I('celli').note(n('A2') + 12, seconds, 0.6, attack=seconds * 0.6), 0.0, 0.8, 0.4)
    return s, -16.0


def pile():
    s = _sess(5.5)
    T = s.tracks
    T['fx'].add(D.impact(1.0), 0.0)
    T['perc'].add(D.crash(1.0, 'crash_hit_fff_loose.wav'), 0.0, 1.0, -0.2)
    T['perc'].add(D.gong(0.55, 'gong_hit_fff.wav'), 0.0, 1.0, 0.3)
    T['timp'].add(timpani().hit(n('D2'), 1.0), 0.0)
    T['timp'].add(timpani().hit(n('A2'), 0.8), 0.25)
    T['timp'].add(timpani().hit(n('D2'), 0.95), 0.5)
    # fanfare : « ta-ta-taaa »
    line(T['mel'], 'trumpet', [(n('A4'), 0.3), (n('D5'), 0.3), (n('F#5'), 0.4), (n('A5'), 4.0)], 0.0, s.beat, vel=0.95)
    line(T['mel'], 'trumpet', [(n('F#4'), 0.3), (n('A4'), 0.3), (n('D5'), 0.4), (n('F#5'), 4.0)], 0.0, s.beat, vel=0.85, gain=0.7)
    brass(T['brass'], D_MAJ + [n('F#5')], 0.5, 1.8, vel=0.92, sections=('horn', 'trombone', 'tuba'))
    strings(T['strings'], [n('D2'), n('D3'), n('A3'), n('F#4'), n('A4'), n('D5'), n('F#5'), n('A5')], 0.0, 2.2, vel=0.85)
    T['choir'].add(S.choir([n('F#4'), n('A4'), n('D5'), n('F#5')], 2.0, 'a', vel=0.7, attack=0.1), 0.15)
    line(T['sparkle'], 'glock', [(n('D6'), 0.17), (n('F#6'), 0.17), (n('A6'), 0.17), (n('D7'), 0.17), (n('F#7'), 0.17), (n('A7'), 2)], 0.12, s.beat, vel=0.55)
    harp_gliss(T['sparkle'], n('D4'), n('D7'), D_MAJ_SCALE, 0.25, 0.7, 0.55)
    for k, m in enumerate([n('A6'), n('D7'), n('F#7')]):
        T['synth'].add(S.bell(m, 0.35, length=2.5), 0.6 + k * 0.12, 1.0, -0.4 + 0.4 * k)
    return s, -13.0


def pile_shared():
    s = _sess(3.6)
    T = s.tracks
    T['timp'].add(timpani().hit(n('D2'), 0.75), 0.0)
    T['perc'].add(D.crash(0.55, 'crash_hit_mp_loose.wav'), 0.0, 1.0, 0.2)
    brass(T['brass'], [n('D3'), n('A3'), n('D4'), n('F#4'), n('A4')], 0.0, 1.5, vel=0.75, sections=('horn', 'trombone'))
    strings(T['strings'], [n('D3'), n('A3'), n('F#4'), n('D5'), n('A5')], 0.0, 1.8, vel=0.7)
    line(T['sparkle'], 'glock', [(n('D6'), 0.2), (n('F#6'), 0.2), (n('A6'), 0.2), (n('D7'), 1.5)], 0.05, s.beat, vel=0.45)
    T['synth'].add(S.bell(n('A6'), 0.3), 0.3, 1.0, 0.3)
    return s, -15.5


def good():
    s = _sess(2.6)
    T = s.tracks
    T['mel'].add(I('trumpet_stac').note(n('A4'), 99, 0.85), 0.0, 0.9, 0.2)
    T['mel'].add(I('trumpet').note(n('D5'), 1.0, 0.85), 0.16, 1.0, 0.2)
    brass(T['brass'], [n('D3'), n('A3'), n('F#4'), n('A4')], 0.16, 0.9, vel=0.7, sections=('horn', 'trombone'))
    strings(T['strings'], [n('D3'), n('A3'), n('F#4'), n('D5')], 0.16, 1.0, vel=0.65)
    T['timp'].add(timpani().hit(n('D2'), 0.65), 0.16)
    for k, m in enumerate([n('D5'), n('F#5'), n('A5'), n('D6')]):
        T['sparkle'].add(I('harp').note(m, 99, 0.6), 0.16 + k * 0.07, 1.0, -0.3 + 0.2 * k)
    T['perc'].add(D.triangles.get('triangle1_hit_mp.wav'), 0.2, 1.5, 0.5)
    return s, -16.0


def bad():
    s = _sess(2.8)
    T = s.tracks
    T['timp'].add(timpani().hit(n('D2'), 0.6), 0.0)
    T['strings'].add(I('celli').note(n('D3'), 1.6, 0.6), 0.0, 1.0, 0.4)
    T['strings'].add(I('basses').note(n('D2'), 1.6, 0.6), 0.0, 0.8, 0.3)
    line(T['mel'], 'horn', [(n('F4'), 0.5), (n('E4'), 0.5), (n('D4'), 2.2)], 0.0, s.beat, vel=0.72, gain=0.9)
    T['brass'].add(I('trombone').note(n('A2') + 12, 1.4, 0.55, attack=0.05), 0.0, 0.6, 0.3)
    for k, m in enumerate([n('A5'), n('F5'), n('D5'), n('A4'), n('F4')]):
        T['sparkle'].add(I('harp').note(m, 99, 0.45), 0.05 + k * 0.09, 1.0, 0.3 - 0.15 * k)
    return s, -17.0


def victory():
    s = _sess(10.0)
    T = s.tracks
    b = s.beat
    T['timp'].add(timpani().roll(n('D2'), 2 * b, 0.7), 0.0)
    T['perc'].add(D.snare_roll(2 * b, 0.15, 0.85), 0.0, 0.8)
    T['fx'].add(D.cymbal_swell(4 * b, 0.6), 0.0)
    line(T['mel'], 'trumpet', [(n('D4'), 0.5), (n('A4'), 0.5), (n('D5'), 0.5), (n('F#5'), 0.5)], 2 * b, b, vel=0.95)
    line(T['mel'], 'horn', [(n('D3'), 0.5), (n('A3'), 0.5), (n('D4'), 0.5), (n('F#4'), 0.5)], 2 * b, b, vel=0.85, gain=0.8)
    chords = [(4, 'D3', 'maj', 2), (6, 'G2', 'maj', 2), (8, 'A2', 'maj', 2), (10, 'D3', 'maj', 7)]
    for beat, root, q, dur in chords:
        t = beat * b
        tones = chord(root, q)
        voic = [tones[0], tones[1] + 12, tones[2] + 12, tones[0] + 24]
        brass(T['brass'], voic, t, dur * b - 0.05, vel=0.92, sections=('horn', 'trombone', 'tuba'))
        strings(T['strings'], [tones[0] - 12] + voic + [tones[1] + 24], t, dur * b, vel=0.82)
        T['choir'].add(S.choir([x + 12 for x in voic[1:]], dur * b, 'a', vel=0.6, attack=0.08), t)
        tp = n('D2') if root == 'D3' else n('A2') if root == 'A2' else n('G2')
        T['timp'].add(timpani().hit(tp, 0.95), t)
        T['fx'].add(D.impact(0.7 if beat < 10 else 1.0), t)
        if beat in (4, 10):
            T['perc'].add(D.crash(0.9), t, 1.0, -0.2)
    T['perc'].add(D.gong(0.5), 4 * b, 1.0, 0.3)
    line(T['mel'], 'trumpet', [(n('A5'), 1.5), (n('F#5'), 0.5), (n('B5'), 1.0), (n('A5'), 1.0), (n('G5'), 1.0), (n('E5'), 1.0), (n('F#5'), 6.0)],
         4 * b, b, vel=0.95)
    line(T['mel'], 'violins', [(n('A5'), 1.5), (n('F#5'), 0.5), (n('B5'), 1.0), (n('A5'), 1.0), (n('G5'), 1.0), (n('E5'), 1.0), (n('D6'), 6.0)],
         4 * b, b, vel=0.7, gain=0.7)
    T['timp'].add(timpani().roll(n('D2'), 3 * b, 0.75), 11 * b)
    T['timp'].add(timpani().hit(n('D2'), 1.0), 14 * b)
    T['perc'].add(D.crash(1.0, 'crash_hit_fff_loose.wav'), 14 * b, 1.0, 0.2)
    T['fx'].add(D.impact(1.0), 14 * b)
    line(T['sparkle'], 'glock', [(n('D6'), 0.25), (n('F#6'), 0.25), (n('A6'), 0.25), (n('D7'), 0.25)] * 2, 10 * b, b, vel=0.45)
    harp_gliss(T['sparkle'], n('D3'), n('D7'), D_MAJ_SCALE, 10 * b, 1.2, 0.5)
    return s, -13.0


def defeat():
    s = _sess(6.5)
    T = s.tracks
    b = s.beat
    T['strings'].add(I('celli').note(n('D3'), 9 * b, 0.55, attack=0.3), 0.0, 1.0, 0.4)
    T['strings'].add(I('basses').note(n('D2'), 9 * b, 0.55, attack=0.4), 0.0, 0.8, 0.3)
    T['strings'].add(I('violas').note(n('F3') + 12, 9 * b, 0.4, attack=0.8), 0.0, 0.8, 0.1)
    T['strings'].add(I('violins').note(n('A4'), 5 * b, 0.35, attack=1.2), 0.0, 0.7, -0.4)
    T['strings'].add(I('violins').note(n('E5'), 5 * b, 0.3, attack=1.0), 5 * b, 0.6, -0.4)
    line(T['mel'], 'horn', [(n('A4'), 1.5), (n('G4'), 0.5), (n('F4'), 1.0), (n('E4'), 1.0), (n('D4'), 5.0)], 0.2, b, vel=0.68)
    T['timp'].add(timpani().hit(n('D2'), 0.45), 0.0)
    T['timp'].add(timpani().hit(n('A2'), 0.35), 4 * b)
    for k, m in enumerate([n('A5'), n('E5'), n('D5'), n('A4'), n('F4'), n('D4')]):
        T['sparkle'].add(I('harp').note(m, 99, 0.4), 4.2 * b + k * 0.12, 1.0, 0.3 - 0.1 * k)
    return s, -18.0


def draw():
    s = _sess(4.5)
    T = s.tracks
    b = s.beat
    strings(T['strings'], [n('D3'), n('A3'), n('E4'), n('A4')], 0.0, 6 * b, vel=0.5, attack=0.4)
    T['timp'].add(timpani().hit(n('D2'), 0.5), 0.0)
    line(T['sparkle'], 'glock', [(n('A6'), 1), (n('E7'), 1), (n('D7'), 3)], 0.1, b, vel=0.4)
    T['mel'].add(I('horn').note(n('A4'), 4 * b, 0.55, attack=0.4), 0.3, 0.8)
    T['mel'].add(I('horn').note(n('E4'), 4 * b, 0.5, attack=0.4), 0.3, 0.6)
    return s, -17.0


def timeup():
    s = _sess(1.8)
    T = s.tracks
    for m in [n('D3'), n('Ab3'), n('D4')]:
        T['brass'].add(I('trombone_stac' if m < 55 else 'horn_stac').note(m, 99, 1.0), 0.0, 0.8, 0.2)
    T['brass'].add(I('trumpet_stac').note(n('Ab4'), 99, 0.95), 0.0, 0.6, -0.2)
    T['timp'].add(timpani().hit(n('D2'), 1.0), 0.0)
    T['fx'].add(D.impact(0.7), 0.0)
    T['perc'].add(D.crash(0.6, 'crash_hit_ff_verytight.wav'), 0.0, 1.0, 0.3)
    return s, -15.0


def joker():
    s = _sess(2.0)
    T = s.tracks
    T['fx'].add(D.whoosh(0.6, 0.6), 0.0)
    harp_gliss(T['sparkle'], n('D4'), n('D7'), D_LYD, 0.0, 0.55, 0.55)
    for k, m in enumerate([n('A6'), n('D7'), n('G#6'), n('C#7')]):
        T['synth'].add(S.bell(m, 0.32, length=1.8), 0.45 + k * 0.08, 1.0, -0.5 + 0.33 * k)
    T['sparkle'].add(I('glock').note(n('D7'), 99, 0.5), 0.55, 1.0, 0.2)
    return s, -17.0


def bet():
    s = _sess(1.8)
    T = s.tracks
    for m in [n('D3'), n('A3'), n('D4'), n('F#4')]:
        T['brass'].add(I('horn_stac').note(m, 99, 0.95), 0.0, 0.7, -0.2)
        T['brass'].add(I('trumpet_stac').note(m + 12, 99, 0.85), 0.0, 0.5, 0.3) if m + 12 >= 55 else None
    T['timp'].add(timpani().hit(n('D2'), 0.9), 0.0)
    T['synth'].add(S.bell(n('A6'), 0.35, 1.5), 0.08, 1.0, 0.3)
    T['perc'].add(D.crash(0.4, 'crash_hit_ff_tight.wav'), 0.0, 1.0, -0.3)
    return s, -16.0


def double():
    s = _sess(1.8)
    T = s.tracks
    for t, oct_ in ((0.0, 0), (0.25, 12)):
        for m in [n('D3') + oct_, n('A3') + oct_, n('D4') + oct_]:
            inst = 'trombone_stac' if m < 52 else 'horn_stac' if m < 62 else 'trumpet_stac'
            T['brass'].add(I(inst).note(m, 99, 0.95), t, 0.75)
        T['timp'].add(timpani().hit(n('D2') if oct_ == 0 else n('A2'), 0.9), t)
    T['perc'].add(D.crash(0.6), 0.25, 1.0, 0.2)
    T['fx'].add(D.impact(0.5), 0.25)
    return s, -15.5


def tiebreak():
    s = _sess(3.5)
    T = s.tracks
    T['timp'].add(timpani().roll(n('A2'), 1.5, 0.8), 0.0)
    T['perc'].add(D.gong(0.5, 'gong_hit_ff.wav'), 1.5, 1.0, 0.2)
    T['fx'].add(D.impact(0.85), 1.5)
    for m in [n('D3'), n('Eb3') + 12, n('A3')]:
        T['brass'].add(I('trombone' if m < 55 else 'horn').note(m, 1.6, 0.85, attack=0.02), 1.5, 0.7)
    T['strings'].add(I('violins_trem').note(n('D5'), 1.8, 0.7), 1.5, 0.8, -0.3)
    T['strings'].add(I('violins_trem').note(n('Eb5'), 1.8, 0.6), 1.5, 0.7, 0.3)
    return s, -15.0


def streak():
    s = _sess(1.6)
    T = s.tracks
    for k, m in enumerate([n('D5'), n('F#5'), n('A5'), n('D6'), n('F#6')]):
        T['synth'].add(S.pluck(m, 0.6, decay=0.3, bright=6000), k * 0.065, 1.0, -0.4 + 0.2 * k)
    T['sparkle'].add(I('glock').note(n('A6'), 99, 0.45), 5 * 0.065, 1.0, 0.3)
    T['perc'].add(D.crash(0.25, 'crash_hit_pp_loose.wav'), 0.3, 1.0, 0.3)
    return s, -18.0


def join():
    s = _sess(1.2)
    T = s.tracks
    T['synth'].add(S.bell(n('A5'), 0.4, 1.0), 0.0, 1.0, -0.2)
    T['synth'].add(S.bell(n('D6'), 0.45, 1.0), 0.11, 1.0, 0.2)
    T['sparkle'].add(I('harp').note(n('D5'), 99, 0.35), 0.11, 1.0)
    return s, -20.0


def leave():
    s = _sess(1.2)
    T = s.tracks
    T['synth'].add(S.bell(n('D6'), 0.4, 1.0), 0.0, 1.0, 0.2)
    T['synth'].add(S.bell(n('A5'), 0.38, 1.0), 0.12, 1.0, -0.2)
    return s, -21.0


def hint():
    s = _sess(1.4)
    T = s.tracks
    for k, m in enumerate([n('A5'), n('E6'), n('A6')]):
        T['sparkle'].add(I('harp').note(m, 99, 0.5), k * 0.08, 1.0, -0.3 + 0.3 * k)
    T['synth'].add(S.bell(n('E7'), 0.3, 1.2), 0.22, 1.0, 0.3)
    T['fx'].add(D.whoosh(0.35, 0.35), 0.0)
    return s, -18.5


def swap():
    s = _sess(1.4)
    T = s.tracks
    T['fx'].add(D.reverse_crash(0.45, 0.6), 0.0)
    T['fx'].add(D.whoosh(0.5, 0.6, up=False), 0.35)
    T['synth'].add(S.pluck(n('A5'), 0.55, decay=0.25), 0.45, 1.0, 0.2)
    T['synth'].add(S.pluck(n('D6'), 0.5, decay=0.25), 0.53, 1.0, -0.2)
    return s, -18.0


ALL = {
    'st_gamestart': gamestart, 'st_round': round_start, 'st_prime': prime, 'st_lock': lock, 'st_contest': contest,
    'st_suspense': lambda: suspense(2.6), 'st_suspense_short': lambda: suspense(1.4),
    'st_pile': pile, 'st_pile_shared': pile_shared, 'st_good': good, 'st_bad': bad,
    'st_victory': victory, 'st_defeat': defeat, 'st_draw': draw, 'st_timeup': timeup, 'st_joker': joker,
    'st_bet': bet, 'st_double': double, 'st_tiebreak': tiebreak, 'st_streak': streak, 'st_join': join,
    'st_leave': leave, 'st_hint': hint, 'st_swap': swap,
}

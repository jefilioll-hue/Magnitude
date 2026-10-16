"""Orchestre : instruments VSCO chargés une seule fois et écriture par registre."""
from __future__ import annotations

from functools import lru_cache

import numpy as np

from core import Track
from sampler import Instrument, Timpani


@lru_cache(maxsize=None)
def I(name: str) -> Instrument:
    table = {
        'trumpet': ('Brass/Trumpet/sus', dict(release=0.3, gain=0.9)),
        'trumpet_stac': ('Brass/Trumpet/stac', dict(oneshot=True, release=0.12, gain=0.9)),
        'horn': ('Brass/F Horn/sus', dict(release=0.45, gain=1.0)),
        'horn_stac': ('Brass/F Horn/stac', dict(oneshot=True, release=0.15, gain=1.0)),
        'trombone': ('Brass/Tenor Trombone/sus', dict(release=0.35, gain=0.95)),
        'trombone_stac': ('Brass/Tenor Trombone/stac', dict(oneshot=True, release=0.15, gain=0.95)),
        'tuba': ('Brass/Tuba/sus', dict(release=0.4, gain=0.9)),
        'violins': ('Strings/Violin Section/susVib', dict(release=0.5, gain=0.9)),
        'violins_spic': ('Strings/Violin Section/Spic', dict(oneshot=True, release=0.1, gain=0.9, max_len=1.2)),
        'violins_trem': ('Strings/Violin Section/Trem', dict(release=0.4, gain=0.8)),
        'violas': ('Strings/Viola Section/susvib', dict(release=0.5, gain=0.9)),
        'celli': ('Strings/Cello Section/susvib', dict(release=0.5, gain=1.0)),
        'celli_spic': ('Strings/Cello Section/spic', dict(oneshot=True, release=0.1, gain=1.0, max_len=1.2)),
        'basses': ('Strings/Solo Contrabass/SusVib', dict(release=0.5, gain=1.0)),
        'harp': ('Strings/Harp', dict(oneshot=True, release=0.6, gain=0.9, offset=0, max_len=5.0)),
        'glock': ('Percussion/Glock', dict(oneshot=True, release=0.5, gain=0.7, max_len=4.0)),
        'flute': ('Woodwinds/Flute/susvib', dict(release=0.35, gain=0.8)),
    }
    folder, kw = table[name]
    offset = kw.pop('offset', 12)
    return Instrument(folder, offset=offset, **kw)


@lru_cache(maxsize=None)
def timpani() -> Timpani:
    return Timpani()


def play(track: Track, inst: str, midi: float, t: float, dur: float, vel: float = 0.8, p: float = 0.0,
         attack: float = 0.0, gain: float = 1.0) -> None:
    track.add(I(inst).note(midi, dur, vel, attack=attack), t, gain, p)


def line(track: Track, inst: str, notes: list[tuple], t0: float, beat: float, vel: float = 0.8, p: float = 0.0,
         legato: float = 0.04, gain: float = 1.0, transpose: int = 0, attack: float = 0.0) -> None:
    """notes = [(midi | None, durée_en_temps, [vélocité])…] jouées à la suite."""
    t = t0
    for item in notes:
        m, d = item[0], item[1]
        v = item[2] if len(item) > 2 else vel
        if m is not None:
            track.add(I(inst).note(m + transpose, d * beat + legato, v, attack=attack), t, gain, p)
        t += d * beat


BRASS_RANGES = {'trumpet': (55, 82), 'horn': (43, 72), 'trombone': (40, 65), 'tuba': (28, 50)}
STRING_RANGES = {'violins': (55, 88), 'violas': (48, 74), 'celli': (36, 62), 'basses': (28, 50)}
PANS = {'trumpet': 0.25, 'horn': -0.35, 'trombone': 0.4, 'tuba': 0.1,
        'violins': -0.45, 'violas': 0.2, 'celli': 0.45, 'basses': 0.3}


def ensemble(track: Track, notes: list[int], t: float, dur: float, vel: float, ranges: dict,
             attack: float = 0.0, gain: float = 1.0, sections: tuple | None = None) -> None:
    """Distribue un accord sur les pupitres dont la tessiture convient."""
    for sec, (lo, hi) in ranges.items():
        if sections and sec not in sections:
            continue
        mine = [m for m in notes if lo <= m <= hi]
        for m in mine:
            track.add(I(sec).note(m, dur, vel, attack=attack), t, gain / max(1, len(mine)) ** 0.35, PANS[sec])


def brass(track: Track, notes: list[int], t: float, dur: float, vel: float = 0.8, **kw) -> None:
    ensemble(track, notes, t, dur, vel, BRASS_RANGES, **kw)


def strings(track: Track, notes: list[int], t: float, dur: float, vel: float = 0.7, **kw) -> None:
    ensemble(track, notes, t, dur, vel, STRING_RANGES, **kw)


def harp_gliss(track: Track, low: int, high: int, scale: list[int], t: float, dur: float, vel: float = 0.6,
               p: float = -0.2, up: bool = True) -> None:
    pcs = set(x % 12 for x in scale)
    notes = [m for m in range(low, high + 1) if m % 12 in pcs]
    if not up:
        notes = notes[::-1]
    step = dur / max(1, len(notes))
    for k, m in enumerate(notes):
        track.add(I('harp').note(m, 99, vel * (0.75 + 0.25 * k / len(notes))), t + k * step, 1.0, p + 0.4 * k / len(notes))


def silence(n: int) -> np.ndarray:
    return np.zeros((2, n))

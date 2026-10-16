"""Outils harmoniques : noms de notes, accords, gammes."""
from __future__ import annotations

import re

_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def n(name: str) -> int:
    """'D4' → 62, 'F#3' → 54, 'Bb2' → 46 (do central = C4 = 60)."""
    m = re.fullmatch(r'([A-G])(#|b)?(-?\d)', name)
    if not m:
        raise ValueError(name)
    pc = _PC[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
    return (int(m.group(3)) + 1) * 12 + pc


QUALITIES = {
    'maj': [0, 4, 7], 'min': [0, 3, 7], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'dim': [0, 3, 6],
    'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'add9': [0, 4, 7, 14],
    'madd9': [0, 3, 7, 14], 'min9': [0, 3, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14], '5': [0, 7],
}


def chord(root: str | int, quality: str = 'maj', inversion: int = 0) -> list[int]:
    r = n(root) if isinstance(root, str) else root
    notes = [r + i for i in QUALITIES[quality]]
    for _ in range(inversion):
        notes = notes[1:] + [notes[0] + 12]
    return notes


def voice(chord_notes: list[int], low: int, high: int) -> list[int]:
    """Ramène les notes d'un accord dans une tessiture."""
    out = []
    for x in chord_notes:
        while x < low:
            x += 12
        while x > high:
            x -= 12
        out.append(x)
    return sorted(set(out))

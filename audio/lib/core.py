"""
Noyau du moteur de production audio de Magnitude.

Conventions :
  - fréquence d'échantillonnage SR = 48 000 Hz ;
  - tout signal est un tableau numpy float64 de forme (2, n) (stéréo) ou (n,) (mono) ;
  - les temps sont en secondes, les hauteurs en numéros MIDI (60 = do central).
"""
from __future__ import annotations

import numpy as np

SR = 48000
RNG = np.random.default_rng(20261013)


def db(x: float) -> float:
    return 10.0 ** (x / 20.0)


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


def secs(n: int) -> float:
    return n / SR


def samples(t: float) -> int:
    return int(round(t * SR))


def to_stereo(x: np.ndarray) -> np.ndarray:
    if x.ndim == 1:
        return np.vstack([x, x])
    return x


def pan(x: np.ndarray, p: float) -> np.ndarray:
    """Panoramique à puissance constante, p ∈ [-1, 1]."""
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    gl, gr = np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)
    if x.ndim == 1:
        return np.vstack([x * gl, x * gr])
    return np.vstack([x[0] * gl, x[1] * gr])


def width(x: np.ndarray, w: float) -> np.ndarray:
    """Largeur stéréo (0 = mono, 1 = inchangé, >1 = élargi) en mid/side."""
    x = to_stereo(x)
    m = (x[0] + x[1]) * 0.5
    s = (x[0] - x[1]) * 0.5 * w
    return np.vstack([m + s, m - s])


def fade(x: np.ndarray, fin: float = 0.0, fout: float = 0.0) -> np.ndarray:
    x = x.copy()
    n = x.shape[-1]
    a = min(samples(fin), n)
    b = min(samples(fout), n)
    if a > 0:
        x[..., :a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if b > 0:
        x[..., n - b:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
    return x


class Track:
    """Piste de mixage : un tampon stéréo, des réglages d'insert et de départs."""

    def __init__(self, name: str, n: int, **opts):
        self.name = name
        self.buf = np.zeros((2, n), dtype=np.float32)
        self.opts = opts  # gain, eq, comp, reverb, delay, sidechain, width, sat

    def add(self, x: np.ndarray, t: float, gain: float = 1.0, p: float = 0.0) -> None:
        if x is None or x.shape[-1] == 0:
            return
        x = pan(x, p) if (p != 0.0 or x.ndim == 1) else x
        i = samples(t)
        if i < 0:
            x = x[:, -i:]
            i = 0
        n = min(x.shape[1], self.buf.shape[1] - i)
        if n <= 0:
            return
        self.buf[:, i:i + n] += x[:, :n] * gain


class Session:
    """Une pièce musicale : tempo, mesures et pistes."""

    def __init__(self, bpm: float, bars: float, beats_per_bar: int = 4, tail: float = 4.0, offset_bars: float = 0.0):
        self.bpm = bpm
        self.beat = 60.0 / bpm
        self.bpb = beats_per_bar
        self.bars = bars
        self.offset = offset_bars
        self.length = (bars * beats_per_bar) * self.beat + tail
        self.n = samples(self.length)
        self.tracks: dict[str, Track] = {}
        self.kicks: list[float] = []  # instants des grosses caisses, pour le sidechain

    def t(self, bar: float, beat: float = 0.0) -> float:
        """Instant (s) d'un temps donné. Les mesures commencent à 0."""
        return ((bar + self.offset) * self.bpb + beat) * self.beat

    def track(self, name: str, **opts) -> Track:
        if name not in self.tracks:
            self.tracks[name] = Track(name, self.n, **opts)
        return self.tracks[name]

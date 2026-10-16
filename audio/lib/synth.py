"""Synthétiseurs : oscillateurs anti-repliement, supersaw, basses, nappes, FM, arpèges, chœur synthétique."""
from __future__ import annotations

import numpy as np

from core import SR, RNG, mtof, samples
from fx import butter, filt, sweep_lp


def adsr(n: int, a: float, d: float, s: float, r: float, hold: float | None = None) -> np.ndarray:
    """Enveloppe ADSR ; `hold` = durée avant relâchement (sinon n − r)."""
    A, D, R = samples(a), samples(d), samples(r)
    H = samples(hold) if hold is not None else max(0, n - R)
    env = np.zeros(n)
    i = 0
    seg = min(A, n)
    if seg:
        env[:seg] = np.linspace(0, 1, seg, endpoint=False) ** 1.2
    i = seg
    seg = min(D, max(0, H - i))
    if seg:
        env[i:i + seg] = 1 - (1 - s) * (1 - np.exp(-5 * np.linspace(0, 1, seg)))
        i += seg
    if H > i:
        env[i:H] = env[i - 1] if i > 0 else s
        i = H
    level = env[i - 1] if i > 0 else s
    seg = n - i
    if seg > 0:
        env[i:] = level * np.exp(-5 * np.linspace(0, 1, seg))
    return env


def _polyblep(t: np.ndarray, dt: np.ndarray) -> np.ndarray:
    y = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    y[m] = x + x - x * x - 1
    m2 = t > 1 - dt
    x = (t[m2] - 1) / dt[m2]
    y[m2] = x * x + x + x + 1
    return y


def saw(freq, n: int, phase: float = 0.0) -> np.ndarray:
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    dt = f / SR
    ph = (phase + np.cumsum(dt)) % 1.0
    return 2 * ph - 1 - _polyblep(ph, dt)


def square(freq, n: int, phase: float = 0.0, pw: float = 0.5) -> np.ndarray:
    return 0.5 * (saw(freq, n, phase) - saw(freq, n, phase + pw))


def sine(freq, n: int, phase: float = 0.0) -> np.ndarray:
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    return np.sin(2 * np.pi * (phase + np.cumsum(f / SR)))


def tri(freq, n: int) -> np.ndarray:
    s = saw(freq, n)
    return 2 * np.abs(s) - 1


def vibrato(n: int, rate: float = 5.2, depth: float = 0.12, delay: float = 0.3) -> np.ndarray:
    """Rapport de fréquence (multiplicatif) pour un vibrato qui s'installe progressivement."""
    t = np.arange(n) / SR
    ramp = np.clip((t - delay) / 0.4, 0, 1)
    return 2 ** (depth * ramp * np.sin(2 * np.pi * rate * t) / 12)


def supersaw(midi: float, dur: float, voices: int = 7, detune: float = 0.22, spread: float = 0.9,
             cutoff: float | np.ndarray = 6000, env=(0.02, 0.3, 0.8, 0.4), vel: float = 0.8,
             vib: float = 0.0) -> np.ndarray:
    n = samples(dur + env[3])
    f0 = mtof(midi)
    out = np.zeros((2, n))
    vb = vibrato(n, depth=vib) if vib else 1.0
    for k in range(voices):
        off = (k - (voices - 1) / 2) / max(1, (voices - 1) / 2)
        f = f0 * 2 ** (off * detune / 12) * vb
        v = saw(f, n, RNG.random())
        p = off * spread
        out[0] += v * np.sqrt((1 - p) / 2)
        out[1] += v * np.sqrt((1 + p) / 2)
    out /= np.sqrt(voices)
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), (n,)) if np.ndim(cutoff) else np.full(n, float(cutoff))
    out = sweep_lp(out, c, 0.8) if np.ndim(cutoff) else filt(out, 'lp', float(cutoff), 0.7)
    e = adsr(n, env[0], env[1], env[2], env[3], hold=dur)
    return out * e * vel


def sub_bass(midi: float, dur: float, vel: float = 0.9, drive: float = 1.6, glide_from: float | None = None) -> np.ndarray:
    n = samples(dur + 0.08)
    f = np.full(n, mtof(midi))
    if glide_from is not None:
        g = min(n, samples(0.06))
        f[:g] = mtof(np.linspace(glide_from, midi, g))
    x = sine(f, n) + 0.25 * sine(f * 2, n) + 0.08 * saw(f, n)
    x = np.tanh(x * drive) / np.tanh(drive)
    x = filt(x, 'lp', 900, 0.7)
    e = adsr(n, 0.004, 0.2, 0.85, 0.08, hold=dur)
    return x * e * vel


def reese(midi: float, dur: float, vel: float = 0.8, cutoff: float = 1400) -> np.ndarray:
    """Basse épaisse (deux saws désaccordées + sub)."""
    n = samples(dur + 0.1)
    f = mtof(midi)
    x = saw(f * 2 ** (0.12 / 12), n, 0.1) + saw(f * 2 ** (-0.12 / 12), n, 0.6)
    x = filt(x, 'lp', cutoff, 1.1) * 0.5 + sine(f, n) * 0.8
    x = np.tanh(x * 1.4)
    return x * adsr(n, 0.005, 0.3, 0.8, 0.1, hold=dur) * vel


def pluck(midi: float, vel: float = 0.8, decay: float = 0.35, bright: float = 7000, length: float = 1.2) -> np.ndarray:
    n = samples(length)
    f = mtof(midi)
    x = 0.6 * saw(f, n, RNG.random()) + 0.4 * square(f * 1.002, n, RNG.random(), 0.3)
    t = np.arange(n) / SR
    cut = 300 + bright * np.exp(-t / (decay * 0.6))
    x = sweep_lp(x, cut, 1.2)
    env = np.exp(-t / decay) * (1 - np.exp(-t / 0.002))
    return x * env * vel


def fm_keys(midi: float, dur: float, vel: float = 0.7, bright: float = 1.0) -> np.ndarray:
    """Piano électrique FM (type « tine ») : porteuse 1:1 + composante métallique 14:1."""
    n = samples(dur + 1.2)
    f = mtof(midi)
    t = np.arange(n) / SR
    idx = (1.6 * bright * vel) * np.exp(-t / 0.5) + 0.25
    mod = np.sin(2 * np.pi * f * t) * idx
    tine = 0.12 * vel * np.exp(-t / 0.08) * np.sin(2 * np.pi * f * 14 * t)
    car = np.sin(2 * np.pi * f * t + mod) + tine
    env = adsr(n, 0.002, 1.6, 0.35, 0.6, hold=dur) * (1 + 0.15 * np.sin(2 * np.pi * 4.5 * t))  # léger trémolo
    return car * env * vel * 0.6


def bell(midi: float, vel: float = 0.7, length: float = 3.0) -> np.ndarray:
    """Cloche FM inharmonique (ratio 3,5) pour les scintillements."""
    n = samples(length)
    f = mtof(midi)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t / 0.6)
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 1.1)
    x += 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.4)
    return x * vel * 0.5


def pad(midis: list[float], dur: float, vel: float = 0.5, cutoff: float = 2400, attack: float = 0.8,
        release: float = 1.5, detune: float = 0.12) -> np.ndarray:
    n = samples(dur + release)
    out = np.zeros((2, n))
    for m in midis:
        out += supersaw(m, dur, voices=5, detune=detune, spread=1.0, cutoff=cutoff,
                        env=(attack, 0.5, 0.9, release), vel=1.0)[:, :n]
    out /= max(1, len(midis)) ** 0.5
    return out * vel


VOWELS = {'a': (800, 1150, 2900), 'o': (450, 800, 2830), 'u': (325, 700, 2530), 'e': (400, 1600, 2700)}


def choir(midis: list[float], dur: float, vowel: str = 'a', vel: float = 0.5, attack: float = 0.5,
          release: float = 1.6) -> np.ndarray:
    """Chœur synthétique : sources vocales filtrées par formants, ensemble désaccordé."""
    n = samples(dur + release)
    out = np.zeros((2, n))
    f1, f2, f3 = VOWELS[vowel]
    for m in midis:
        for k in range(4):
            vb = vibrato(n, rate=4.8 + RNG.random() * 0.8, depth=0.18, delay=0.1)
            src = saw(mtof(m) * 2 ** ((RNG.random() - 0.5) * 0.18 / 12) * vb, n, RNG.random())
            v = (butter(src, 'bandpass', [f1 * 0.8, f1 * 1.25], 2) * 1.0
                 + butter(src, 'bandpass', [f2 * 0.85, f2 * 1.2], 2) * 0.5
                 + butter(src, 'bandpass', [f3 * 0.9, f3 * 1.1], 2) * 0.25)
            p = (k / 3) * 2 - 1
            out[0] += v * np.sqrt((1 - p * 0.7) / 2)
            out[1] += v * np.sqrt((1 + p * 0.7) / 2)
    out /= np.sqrt(len(midis) * 4)
    return out * adsr(n, attack, 0.4, 0.9, release, hold=dur) * vel * 2.2


def arp_voice(midi: float, length: float, vel: float = 0.7, cutoff: float = 3200) -> np.ndarray:
    n = samples(length)
    f = mtof(midi)
    x = 0.55 * saw(f, n) + 0.45 * square(f * 0.5, n, 0.0, 0.5)
    t = np.arange(n) / SR
    x = sweep_lp(x, 200 + cutoff * np.exp(-t / 0.09), 1.4)
    return x * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.001)) * vel

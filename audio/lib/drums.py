"""Percussions : grosse caisse, caisses claires (synthèse + échantillons), charleys, claps, toms, effets de transition."""
from __future__ import annotations

import numpy as np

from core import SR, RNG, samples, to_stereo
from fx import butter, filt, noise, sweep_lp
from sampler import OneShots, load
from synth import saw, sine

snares = OneShots('VSCO 1 Percussion/drums/snare/drum1')
snares2 = OneShots('VSCO 1 Percussion/drums/snare/drum2')
bass_drums = OneShots('VSCO 1 Percussion/drums/bass')
crashes = OneShots('VSCO 1 Percussion/varMetal/Cymbals/clash')
susp = OneShots('VSCO 1 Percussion/varMetal/Cymbals/susp')
gongs = OneShots('VSCO 1 Percussion/varMetal/Gong')
triangles = OneShots('VSCO 1 Percussion/varMetal/triangle/1')


def kick(vel: float = 1.0, tone: float = 50.0, punch: float = 1.0, length: float = 0.55, click: float = 0.6) -> np.ndarray:
    n = samples(length)
    t = np.arange(n) / SR
    f = tone + (tone * 3.4) * np.exp(-t / 0.032) * punch
    body = sine(f, n) * np.exp(-t / (length * 0.38))
    body = np.tanh(body * 2.2) / np.tanh(2.2)
    cl = butter(noise(n), 'highpass', 2500, 2) * np.exp(-t / 0.004) * 0.35 * click
    cl += sine(np.full(n, 1800.0), n) * np.exp(-t / 0.006) * 0.25 * click
    x = body + cl
    return to_stereo(x * vel)


def snare(vel: float = 0.9, tone: float = 190.0, snappy: float = 0.8, length: float = 0.35, sample_mix: float = 0.7) -> np.ndarray:
    n = samples(length)
    t = np.arange(n) / SR
    body = (sine(tone * (1 + 0.6 * np.exp(-t / 0.01)), n) * 0.6 + sine(tone * 1.6, n) * 0.25) * np.exp(-t / 0.07)
    nz = butter(noise(n), 'bandpass', [1500, 9000], 2) * np.exp(-t / (0.12 * snappy + 0.02)) * snappy
    synth = to_stereo(np.tanh((body + nz) * 1.5))
    names = ['snare1_ff_1.wav', 'snare1_ff_2.wav', 'snare1_f_1.wav', 'snare1_f_2.wav', 'snare1_f_3.wav']
    smp = snares.get(names[RNG.integers(len(names))])
    y = synth * (1 - sample_mix) * 0.8
    m = min(n, smp.shape[1])
    y[:, :m] += smp[:, :m] * sample_mix * 3.2
    y[:, -samples(0.03):] *= np.linspace(1, 0, samples(0.03))
    return y * vel


def clap(vel: float = 0.8) -> np.ndarray:
    n = samples(0.4)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for k, d in enumerate([0.0, 0.011, 0.022, 0.031]):
        i = samples(d)
        env[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 3 else 0.16)) * (0.8 if k < 3 else 1.0)
    x = butter(noise(n), 'bandpass', [900, 4500], 2) * env
    stereo = np.vstack([x, np.roll(x, 37)])
    return stereo * vel * 0.9


def hat(vel: float = 0.6, open_: bool = False, length: float | None = None) -> np.ndarray:
    L = length or (0.42 if open_ else 0.07)
    n = samples(L)
    t = np.arange(n) / SR
    # timbre métallique : six carrés inharmoniques (à la 808) + bruit
    ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]
    metal = sum(np.sign(np.sin(2 * np.pi * 205 * r * t + RNG.random() * 6)) for r in ratios) / 6
    x = butter(metal * 0.6 + noise(n) * 0.7, 'highpass', 7200, 4)
    x = filt(x, 'peak', 10500, 1.0, 4)
    x *= np.exp(-t / (L * 0.32))
    return to_stereo(x * vel * 0.5)


def shaker(vel: float = 0.4) -> np.ndarray:
    n = samples(0.12)
    t = np.arange(n) / SR
    env = (1 - np.exp(-t / 0.012)) * np.exp(-t / 0.03)
    return to_stereo(butter(noise(n), 'bandpass', [4500, 11000], 2) * env * vel)


def tom(midi_hz: float = 110.0, vel: float = 0.8, length: float = 0.6) -> np.ndarray:
    n = samples(length)
    t = np.arange(n) / SR
    f = midi_hz * (1 + 0.5 * np.exp(-t / 0.03))
    x = np.tanh(sine(f, n) * 1.8) * np.exp(-t / (length * 0.35))
    x += butter(noise(n), 'bandpass', [300, 3000], 2) * np.exp(-t / 0.02) * 0.2
    return to_stereo(x * vel)


def crash(vel: float = 0.8, which: str = 'crash_hit_ff_loose.wav') -> np.ndarray:
    return crashes.get(which) * vel * 2.0


def cymbal_swell(dur: float, vel: float = 0.8) -> np.ndarray:
    """Roulement de cymbale suspendue en crescendo, calé pour culminer à `dur`."""
    x = susp.get('susp_hit_softmall_roll2_cresc.wav')
    # le pic d'énergie de l'échantillon
    env = np.max(np.abs(x), axis=0)
    k = samples(0.05)
    sm = np.convolve(env, np.ones(k) / k, mode='same')
    pk = int(np.argmax(sm))
    start = max(0, pk - samples(dur))
    y = x[:, start:pk + samples(0.04)].copy()
    y[:, -samples(0.04):] *= np.linspace(1, 0, samples(0.04))
    if y.shape[1] < samples(dur):
        y = np.pad(y, ((0, 0), (samples(dur) - y.shape[1], 0)))
    return y * vel * 2.5


def reverse_crash(dur: float = 1.5, vel: float = 0.7) -> np.ndarray:
    x = crash(1.0, 'crash_hit_fff_loose.wav')[:, : samples(dur)]
    x = x[:, ::-1].copy()
    x[:, : samples(0.2)] *= np.linspace(0, 1, samples(0.2))
    return x * vel


def riser(dur: float, vel: float = 0.6, f0: float = 300, f1: float = 9000) -> np.ndarray:
    n = samples(dur)
    t = np.linspace(0, 1, n)
    cut = f0 * (f1 / f0) ** (t ** 1.6)
    nz = np.vstack([noise(n), noise(n)])
    x = sweep_lp(nz, cut, 3.0) * 0.6
    pitch = 52 * 2 ** (t * 3)  # montée de trois octaves
    tone = (saw(pitch, n) + saw(pitch * 1.01, n)) * 0.15
    x += np.vstack([tone, tone]) * t
    env = t ** 2.2
    return x * env * vel


def whoosh(dur: float = 0.7, vel: float = 0.6, up: bool = True) -> np.ndarray:
    n = samples(dur)
    t = np.linspace(0, 1, n)
    curve = t if up else 1 - t
    cut = 400 * (12000 / 400) ** curve
    x = sweep_lp(noise(n, 'pink'), cut, 2.0)
    env = np.sin(np.pi * t) ** 1.5
    p = (t - 0.5) * 1.6
    return np.vstack([x * env * np.sqrt((1 - p) / 2), x * env * np.sqrt((1 + p) / 2)]) * vel


def impact(vel: float = 1.0, sub: float = 1.0) -> np.ndarray:
    """Impact cinématographique : grosse caisse orchestrale + sub qui chute + bruit filtré."""
    n = samples(3.0)
    t = np.arange(n) / SR
    boom = sine(38 + 60 * np.exp(-t / 0.06), n) * np.exp(-t / 0.9) * sub
    boom = np.tanh(boom * 1.6)
    nz = butter(noise(n), 'lowpass', 1800, 2) * np.exp(-t / 0.18) * 0.4
    y = to_stereo(boom + nz)
    bd = bass_drums.get('bdrum3_fff_1.wav') * 3.0
    m = min(n, bd.shape[1])
    y[:, :m] += bd[:, :m]
    return y * vel


def gong(vel: float = 0.8, name: str = 'gong_hit_ff.wav') -> np.ndarray:
    return gongs.get(name) * vel * 2.0


def snare_roll(dur: float, vel0: float = 0.25, vel1: float = 0.9, rate: float = 22.0) -> np.ndarray:
    """Roulement de caisse claire (coups rapides alternés, crescendo)."""
    n = samples(dur + 0.4)
    out = np.zeros((2, n))
    names = ['snare1_mp_1.wav', 'snare1_mp_2.wav', 'snare1_f_1.wav', 'snare1_f_2.wav', 'snare1_f_3.wav',
             'snare1_ff_1.wav', 'snare1_ff_2.wav']
    k = 0
    t = 0.0
    while t < dur:
        u = t / dur
        v = vel0 + (vel1 - vel0) * u ** 1.4
        layer = min(len(names) - 1, int(u * len(names)))
        name = names[max(0, layer - (k % 2))]
        x = snares.get(name)[:, : samples(0.25)] * (0.9 + 0.2 * RNG.random()) * v
        i = samples(t + RNG.normal(0, 0.0015))
        m = min(x.shape[1], n - i)
        if m > 0 and i >= 0:
            out[:, i:i + m] += x[:, :m] * (1.0 if k % 2 == 0 else 0.85)
        k += 1
        t += 1 / rate
    return out * 2.4


def tick(vel: float = 0.6, f: float = 2400, length: float = 0.05) -> np.ndarray:
    n = samples(length)
    t = np.arange(n) / SR
    x = sine(np.full(n, f), n) * np.exp(-t / 0.008) + butter(noise(n), 'highpass', 4000, 2) * np.exp(-t / 0.003) * 0.4
    return to_stereo(x * vel)


__all__ = ['kick', 'snare', 'clap', 'hat', 'shaker', 'tom', 'crash', 'cymbal_swell', 'reverse_crash', 'riser',
           'whoosh', 'impact', 'gong', 'snare_roll', 'tick', 'triangles', 'load']

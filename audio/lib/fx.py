"""Effets : égaliseurs, réverbération à convolution, délais, compression, sidechain, limiteur, sonie."""
from __future__ import annotations

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

from core import SR, RNG, db, samples, to_stereo

# ------------------------------------------------------------------ biquads (RBJ)


def _biquad(kind: str, f: float, q: float = 0.707, gain_db: float = 0.0):
    f = float(np.clip(f, 10, SR * 0.49))
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    cw, sw = np.cos(w), np.sin(w)
    alpha = sw / (2 * q)
    if kind == 'lp':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'hp':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'bp':
        b = [alpha, 0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'peak':
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == 'lowshelf':
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sa)]
        a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sa]
    elif kind == 'highshelf':
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sa)]
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return np.concatenate([b, a])[None, :]


def filt(x: np.ndarray, kind: str, f: float, q: float = 0.707, gain_db: float = 0.0) -> np.ndarray:
    sos = _biquad(kind, f, q, gain_db)
    return signal.sosfilt(sos, x, axis=-1)


def eq(x: np.ndarray, bands: list[tuple]) -> np.ndarray:
    """bands = [('hp', 80), ('peak', 300, 1.0, -3), ('highshelf', 8000, 0.7, 2), …]"""
    for b in bands:
        kind, f = b[0], b[1]
        q = b[2] if len(b) > 2 else 0.707
        g = b[3] if len(b) > 3 else 0.0
        x = filt(x, kind, f, q, g)
    return x


def butter(x: np.ndarray, kind: str, f, order: int = 4) -> np.ndarray:
    sos = signal.butter(order, np.clip(np.asarray(f, dtype=float), 10, SR * 0.49), btype=kind, fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def sweep_lp(x: np.ndarray, cutoff: np.ndarray, q: float = 0.9, block: int = 64) -> np.ndarray:
    """Passe-bas résonant à fréquence variable (traitement par blocs avec état continu)."""
    mono = x.ndim == 1
    xs = x[None, :] if mono else x
    out = np.zeros_like(xs)
    n = xs.shape[1]
    zi = np.zeros((xs.shape[0], 2))
    for i in range(0, n, block):
        j = min(n, i + block)
        c = float(cutoff[min(i + block // 2, len(cutoff) - 1)])
        sos = _biquad('lp', c, q)
        b, a = sos[0, :3], sos[0, 3:]
        for ch in range(xs.shape[0]):
            out[ch, i:j], zi[ch] = signal.lfilter(b, a, xs[ch, i:j], zi=zi[ch])
    return out[0] if mono else out


# ------------------------------------------------------------------ dynamique


def follower(x: np.ndarray, attack: float, release: float) -> np.ndarray:
    """Suiveur d'enveloppe (asymétrie approchée par deux lissages)."""
    env = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=0)
    a_rel = np.exp(-1.0 / (release * SR))
    a_att = np.exp(-1.0 / (attack * SR))
    slow = signal.lfilter([1 - a_rel], [1, -a_rel], env)
    fast = signal.lfilter([1 - a_att], [1, -a_att], env)
    return np.maximum(slow, fast)


def compress(x: np.ndarray, threshold_db: float = -18, ratio: float = 3, attack: float = 0.01,
             release: float = 0.12, makeup_db: float = 0.0, knee_db: float = 6.0) -> np.ndarray:
    env = follower(x, attack, release) + 1e-9
    lvl = 20 * np.log10(env)
    over = lvl - threshold_db
    # coude doux
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    g = 10 ** ((-gr + makeup_db) / 20)
    a = np.exp(-1.0 / (0.004 * SR))
    g = signal.lfilter([1 - a], [1, -a], g, zi=[g[0] * a])[0]
    return x * g


def sidechain_curve(n: int, times: list[float], depth: float = 0.6, release: float = 0.16, attack: float = 0.004) -> np.ndarray:
    g = np.ones(n)
    L = samples(release * 5)
    A = max(1, samples(attack))
    tt = np.arange(L) / SR
    shape = 1 - depth * np.exp(-tt / release)
    ramp = 1 - depth * np.linspace(0, 1, A)
    for t0 in times:
        i = samples(t0)
        if i >= n:
            continue
        a0 = max(0, i - A)
        seg = ramp[A - (i - a0):]
        g[a0:i] = np.minimum(g[a0:i], seg[: i - a0])
        j = min(n, i + L)
        g[i:j] = np.minimum(g[i:j], shape[: j - i])
    return g


def saturate(x: np.ndarray, drive: float = 1.5, mix: float = 1.0) -> np.ndarray:
    y = np.tanh(x * drive) / np.tanh(drive)
    return x * (1 - mix) + y * mix


def limiter(x: np.ndarray, ceiling_db: float = -1.0, lookahead: float = 0.005, release: float = 0.08) -> np.ndarray:
    x = to_stereo(x)
    ceil = db(ceiling_db)
    peak = np.max(np.abs(x), axis=0) + 1e-12
    g = np.minimum(1.0, ceil / peak)
    L = max(2, samples(lookahead))
    g = minimum_filter1d(g, size=2 * L + 1, mode='nearest')
    # lissage : moyenne glissante (ne dépasse jamais le minimum local) puis relâchement lent
    k = np.ones(L) / L
    g = np.convolve(g, k, mode='same')
    a = np.exp(-1.0 / (release * SR))
    # relâchement : le gain ne remonte que lentement
    rel = signal.lfilter([1 - a], [1, -a], g, zi=[g[0] * a])[0]
    g = np.minimum(g, rel)
    y = x * g
    # garde-fou final (pics inter-échantillons approximés)
    m = np.max(np.abs(y))
    if m > ceil:
        y *= ceil / m
    return y


# ------------------------------------------------------------------ espace


def make_ir(seconds: float = 2.4, predelay: float = 0.012, damping: float = 5500, brightness: float = 1.0,
            seed: int = 1, early: int = 14) -> np.ndarray:
    """Réponse impulsionnelle stéréo synthétique (hall) : réflexions précoces + queue diffuse amortie."""
    rng = np.random.default_rng(seed)
    n = samples(seconds + predelay)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    # queue diffuse : bandes à décroissance différenciée (les aigus s'éteignent plus vite)
    bands = [(20, 300, 1.15), (300, 1500, 1.0), (1500, 5000, 0.8), (5000, 16000, 0.55 * brightness)]
    p0 = samples(predelay)
    for lo, hi, rt in bands:
        for ch in range(2):
            nz = rng.standard_normal(n)
            nz = butter(nz, 'bandpass', [lo, hi], order=2)
            env = np.exp(-6.9 * t / (seconds * rt))
            env[:p0] = 0
            # montée de diffusion
            env *= 1 - np.exp(-(t - predelay).clip(0) / 0.025)
            ir[ch] += nz * env
    ir = butter(ir, 'lowpass', damping, order=2)
    # réflexions précoces
    for k in range(early):
        d = predelay * 0.4 + rng.uniform(0.004, 0.07)
        i = samples(d)
        if i < n:
            ir[k % 2, i] += rng.uniform(0.25, 0.6) * (1 if rng.random() > 0.3 else -1) * np.exp(-d * 18)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


_IR_CACHE: dict = {}


def reverb(x: np.ndarray, kind: str = 'hall') -> np.ndarray:
    presets = {
        'hall': dict(seconds=2.8, predelay=0.022, damping=7000, seed=11),
        'stage': dict(seconds=1.9, predelay=0.016, damping=8000, seed=12),
        'room': dict(seconds=0.75, predelay=0.006, damping=9000, seed=13, early=20),
        'plate': dict(seconds=1.6, predelay=0.004, damping=11000, brightness=1.4, seed=14, early=4),
        'cathedral': dict(seconds=5.0, predelay=0.04, damping=5000, seed=15),
    }
    if kind not in _IR_CACHE:
        _IR_CACHE[kind] = make_ir(**presets[kind])
    ir = _IR_CACHE[kind]
    x = to_stereo(x)
    wet = np.vstack([
        signal.oaconvolve(x[0], ir[0])[: x.shape[1]] * 0.7 + signal.oaconvolve(x[1], ir[0])[: x.shape[1]] * 0.3,
        signal.oaconvolve(x[1], ir[1])[: x.shape[1]] * 0.7 + signal.oaconvolve(x[0], ir[1])[: x.shape[1]] * 0.3,
    ])
    return wet


def pingpong(x: np.ndarray, delay: float, feedback: float = 0.4, taps: int = 6, lp: float = 5000) -> np.ndarray:
    x = to_stereo(x)
    n = x.shape[1]
    out = np.zeros_like(x)
    src = (x[0] + x[1]) * 0.5
    cur = src
    for k in range(1, taps + 1):
        cur = filt(cur, 'lp', lp, 0.6)
        d = samples(delay * k)
        if d >= n:
            break
        ch = (k - 1) % 2
        out[ch, d:] += cur[: n - d] * (feedback ** (k - 1))
    return out


def chorus(x: np.ndarray, depth_ms: float = 6.0, rate: float = 0.6, mix: float = 0.5) -> np.ndarray:
    x = to_stereo(x)
    n = x.shape[1]
    t = np.arange(n) / SR
    out = np.empty_like(x)
    for ch in range(2):
        lfo = (np.sin(2 * np.pi * rate * t + ch * np.pi / 2) * 0.5 + 0.5) * depth_ms / 1000 + 0.008
        idx = np.arange(n) - lfo * SR
        out[ch] = np.interp(idx, np.arange(n), x[ch], left=0.0)
    return x * (1 - mix) + out * mix


# ------------------------------------------------------------------ sonie (ITU-R BS.1770-4)


def _k_weight(x: np.ndarray) -> np.ndarray:
    # Coefficients de pondération K pour 48 kHz (BS.1770).
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=-1), axis=-1)


def lufs(x: np.ndarray) -> float:
    x = to_stereo(x)
    y = _k_weight(x)
    blk = samples(0.4)
    hop = samples(0.1)
    if y.shape[1] < blk:
        return float(-70)
    powers = []
    for i in range(0, y.shape[1] - blk + 1, hop):
        powers.append(np.mean(y[:, i:i + blk] ** 2, axis=1).sum())
    p = np.array(powers)
    L = -0.691 + 10 * np.log10(p + 1e-15)
    p = p[L > -70]
    if p.size == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(p)) - 10
    L2 = -0.691 + 10 * np.log10(p + 1e-15)
    p = p[L2 > rel]
    return float(-0.691 + 10 * np.log10(np.mean(p)))


def true_peak_db(x: np.ndarray) -> float:
    x = to_stereo(x)
    up = signal.resample_poly(x, 4, 1, axis=-1)
    return float(20 * np.log10(np.max(np.abs(up)) + 1e-12))


def noise(n: int, color: str = 'white') -> np.ndarray:
    w = RNG.standard_normal(n)
    if color == 'pink':
        # filtre de Voss-McCartney approché (Paul Kellet)
        b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
        a = [1, -2.494956002, 2.017265875, -0.522189400]
        w = signal.lfilter(b, a, w)
        w /= np.std(w) + 1e-12
    return w

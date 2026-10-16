"""Sons d'interface : courts, doux, accordés en ré pour rester cohérents avec la musique."""
from __future__ import annotations

import numpy as np

from core import SR, samples, to_stereo
from fx import butter, noise, reverb
from theory import n
from core import mtof
import synth as S


def _env(n_: int, a: float, d: float) -> np.ndarray:
    t = np.arange(n_) / SR
    return (1 - np.exp(-t / max(a, 1e-4))) * np.exp(-t / d)


def _tone(f: float, length: float, a: float, d: float, harm: float = 0.0) -> np.ndarray:
    k = samples(length)
    t = np.arange(k) / SR
    x = np.sin(2 * np.pi * f * t) + harm * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / (d * 0.5))
    return x * _env(k, a, d)


def _space(x: np.ndarray, amt: float = 0.12, kind: str = 'plate') -> np.ndarray:
    x = to_stereo(x)
    tail = np.zeros((2, x.shape[1] + samples(0.6)))
    tail[:, : x.shape[1]] = x
    return tail + reverb(tail, kind) * amt


def click():
    k = samples(0.09)
    t = np.arange(k) / SR
    f = 880 * (1 + 0.6 * np.exp(-t / 0.004))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(k, 0.0005, 0.018)
    x += butter(noise(k), 'highpass', 3500, 2) * _env(k, 0.0002, 0.002) * 0.25
    return _space(x * 0.7, 0.06), -20


def hover():
    return _space(_tone(mtof(n('A6')), 0.05, 0.001, 0.008) * 0.25, 0.04), -30


def back():
    a = _tone(mtof(n('A5')), 0.09, 0.001, 0.02, 0.2)
    b = _tone(mtof(n('D5')), 0.12, 0.001, 0.03, 0.2)
    x = np.zeros(samples(0.2))
    x[: len(a)] += a
    i = samples(0.05)
    x[i:i + len(b)] += b
    return _space(x * 0.55, 0.08), -21


def toggle_on():
    a = _tone(mtof(n('D6')), 0.08, 0.001, 0.02, 0.3)
    b = _tone(mtof(n('A6')), 0.12, 0.001, 0.03, 0.3)
    x = np.zeros(samples(0.2))
    x[: len(a)] += a
    x[samples(0.045): samples(0.045) + len(b)] += b
    return _space(x * 0.5, 0.08), -22


def toggle_off():
    a = _tone(mtof(n('A6')), 0.08, 0.001, 0.02, 0.3)
    b = _tone(mtof(n('D6')), 0.12, 0.001, 0.03, 0.3)
    x = np.zeros(samples(0.2))
    x[: len(a)] += a
    x[samples(0.045): samples(0.045) + len(b)] += b
    return _space(x * 0.45, 0.08), -23


def error():
    k = samples(0.28)
    t = np.arange(k) / SR
    x = (S.square(np.full(k, 155.0), k) * 0.6 + S.square(np.full(k, 164.0), k) * 0.4)
    x = butter(x, 'lowpass', 1400, 2)
    gate = ((t < 0.1) | ((t > 0.14) & (t < 0.24))).astype(float)
    gate = np.convolve(gate, np.ones(80) / 80, mode='same')
    return _space(x * gate * 0.45, 0.05, 'room'), -21


def key():
    k = samples(0.05)
    t = np.arange(k) / SR
    x = butter(noise(k), 'bandpass', [1800, 6000], 2) * _env(k, 0.0003, 0.006)
    x += np.sin(2 * np.pi * 1450 * t) * _env(k, 0.0005, 0.01) * 0.4
    return _space(x * 0.6, 0.03, 'room'), -25


def whoosh():
    import drums as D
    return D.whoosh(0.42, 0.5), -24


def score():
    x = _tone(mtof(n('D7')), 0.12, 0.0005, 0.03, 0.4) + _tone(mtof(n('A7')), 0.12, 0.0005, 0.02) * 0.4
    return _space(x * 0.4, 0.06), -24


def copy():
    a = _tone(mtof(n('D6')), 0.15, 0.001, 0.05, 0.3)
    b = _tone(mtof(n('F#6')), 0.15, 0.001, 0.05, 0.3)
    c = _tone(mtof(n('A6')), 0.3, 0.001, 0.09, 0.3)
    x = np.zeros(samples(0.5))
    for i, y in enumerate((a, b, c)):
        j = samples(0.06 * i)
        x[j:j + len(y)] += y
    return _space(x * 0.4, 0.12), -21


def select():
    import drums as D
    x = D.tom(130, 0.7, 0.25)
    bl = to_stereo(S.bell(n('D6'), 0.4, 0.6))
    out = np.zeros((2, max(x.shape[1], bl.shape[1])))
    out[:, : x.shape[1]] += x
    out[:, : bl.shape[1]] += bl * 0.5
    return _space(out, 0.1), -19


def open_():
    import drums as D
    return D.whoosh(0.3, 0.35, up=True), -26


def tick():
    k = samples(0.06)
    t = np.arange(k) / SR
    x = np.sin(2 * np.pi * 2100 * t) * _env(k, 0.0003, 0.01) + butter(noise(k), 'highpass', 5000, 2) * _env(k, 0.0001, 0.002) * 0.3
    return _space(x * 0.5, 0.04, 'room'), -24


def tick_urgent():
    k = samples(0.16)
    t = np.arange(k) / SR
    x = np.sin(2 * np.pi * 1320 * t) * _env(k, 0.0003, 0.03) * 0.7
    x += np.sin(2 * np.pi * np.cumsum(90 * (1 + 2 * np.exp(-t / 0.01))) / SR) * _env(k, 0.001, 0.05)
    return _space(x * 0.6, 0.05, 'room'), -19


ALL = {
    'ui_click': click, 'ui_hover': hover, 'ui_back': back, 'ui_toggle_on': toggle_on, 'ui_toggle_off': toggle_off,
    'ui_error': error, 'ui_key': key, 'ui_whoosh': whoosh, 'ui_score': score, 'ui_copy': copy, 'ui_select': select,
    'ui_open': open_, 'ui_tick': tick, 'ui_tick_urgent': tick_urgent,
}

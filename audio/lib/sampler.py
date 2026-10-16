"""
Échantillonneur pour la bibliothèque orchestrale VSCO 2 Community Edition (licence CC0).

Les hauteurs de chaque instrument ont été vérifiées par analyse (YIN) : les noms
de fichiers des cuivres, cordes, bois et du glockenspiel suivent la convention
« C3 = do central » (décalage +12 par rapport à la notation scientifique),
la harpe suit la notation scientifique.
"""
from __future__ import annotations

import glob
import os
import re
from fractions import Fraction
from functools import lru_cache

import numpy as np
from scipy import signal
from scipy.io import wavfile

from core import SR, samples, to_stereo

VSCO = os.environ.get('VSCO_DIR', '/tmp/claude-0/-home-claude/f72b0db0-aabd-5742-bc32-1eaf62671627/scratchpad/vsco')

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
_RE_NOTE = re.compile(r'_([A-G])(#|b)?(-?\d)(?=[_.])')
_RE_VEL = re.compile(r'_v(\d)')
_RE_RR = re.compile(r'(?:rr|RR)(\d)')


@lru_cache(maxsize=600)
def load(path: str) -> np.ndarray:
    """Charge un WAV en float64 stéréo à 48 kHz."""
    sr, x = wavfile.read(path)
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float64) / 2147483648.0
    else:
        x = x.astype(np.float64)
    x = x.T if x.ndim == 2 else x[None, :]
    x = to_stereo(x[0]) if x.shape[0] == 1 else x[:2]
    if sr != SR:
        f = Fraction(SR, sr).limit_denominator(1000)
        x = signal.resample_poly(x, f.numerator, f.denominator, axis=-1)
    return x.astype(np.float32)


def onset(x: np.ndarray, rel: float = 0.015) -> int:
    env = np.max(np.abs(x), axis=0)
    thr = env.max() * rel
    idx = int(np.argmax(env > thr))
    return max(0, idx - samples(0.003))


@lru_cache(maxsize=1200)
def trimmed(path: str) -> np.ndarray:
    x = load(path)
    return x[:, onset(x):]


def _shift(x: np.ndarray, semis: float) -> np.ndarray:
    if abs(semis) < 1e-6:
        return x
    r = Fraction(2 ** (semis / 12)).limit_denominator(400)
    # monter la hauteur = raccourcir
    return signal.resample_poly(x, r.denominator, r.numerator, axis=-1)


class Instrument:
    def __init__(self, folder: str, offset: int = 12, oneshot: bool = False, release: float = 0.35,
                 gain: float = 1.0, exclude: tuple = (), max_len: float = 12.0):
        self.folder = folder
        self.oneshot = oneshot
        self.release = release
        self.gain = gain
        self.max_len = max_len
        self.zones: list[tuple[int, int, int, str]] = []  # (midi, vel, rr, path)
        for p in sorted(glob.glob(os.path.join(VSCO, folder, '*.wav'))):
            b = os.path.basename(p)
            if any(e in b for e in exclude):
                continue
            m = _RE_NOTE.search(b)
            if not m:
                continue
            pc = NOTE[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
            midi = (int(m.group(3)) + 1) * 12 + pc + offset
            v = _RE_VEL.search(b)
            rr = _RE_RR.search(b)
            self.zones.append((midi, int(v.group(1)) if v else 1, int(rr.group(1)) if rr else 1, p))
        if not self.zones:
            raise FileNotFoundError(f'Aucun échantillon dans {folder} (VSCO_DIR={VSCO})')
        self.layers = sorted({z[1] for z in self.zones})
        self._rr: dict = {}
        self._norm: dict[int, float] = {}
        self.range = (min(z[0] for z in self.zones), max(z[0] for z in self.zones))

    def _note_norm(self, midi: int) -> float:
        """Égalise le niveau d'une note à l'autre (référence : couche la plus forte)."""
        if midi not in self._norm:
            loud = [z for z in self.zones if z[0] == midi and z[1] == self.layers[-1]] or [z for z in self.zones if z[0] == midi]
            x = trimmed(loud[0][3])
            seg = x[:, : samples(0.6)]
            rms = np.sqrt(np.mean(seg ** 2)) + 1e-9
            self._norm[midi] = 0.12 / rms
        return self._norm[midi]

    def _pick(self, midi: int, vel: float):
        notes = sorted({z[0] for z in self.zones}, key=lambda m: (abs(m - midi), -m))
        src = notes[0]
        layer_idx = min(len(self.layers) - 1, int(vel * len(self.layers) - 1e-9))
        want = self.layers[max(0, layer_idx)]
        cands = [z for z in self.zones if z[0] == src and z[1] == want] or [z for z in self.zones if z[0] == src]
        key = (src, want)
        k = self._rr.get(key, 0)
        self._rr[key] = k + 1
        return cands[k % len(cands)], src

    def note(self, midi: float, dur: float = 1.0, vel: float = 0.8, release: float | None = None,
             attack: float = 0.0) -> np.ndarray:
        z, src = self._pick(int(round(midi)), vel)
        x = _shift_cached(z[3], round(midi - src, 3))
        rel = self.release if release is None else release
        if self.oneshot:
            n = min(x.shape[1], samples(self.max_len))
            y = x[:, :n].copy()
            if dur < 99:  # étouffement éventuel
                cut = samples(dur + rel)
                if cut < n:
                    y = y[:, :cut]
                    r = samples(rel)
                    y[:, -r:] *= np.linspace(1, 0, r) ** 2
        else:
            body = samples(dur)
            r = samples(rel)
            n = body + r
            y = np.zeros((2, n))
            m = min(n, x.shape[1])
            y[:, :m] = x[:, :m]
            env = np.ones(n)
            env[body:] = np.cos(np.linspace(0, np.pi / 2, n - body)) ** 2
            y *= env
        if attack > 0:
            a = min(samples(attack), y.shape[1])
            y[:, :a] *= np.linspace(0, 1, a) ** 1.5
        # courbe de vélocité douce + égalisation de niveau entre notes
        g = self.gain * self._note_norm(src) * (0.25 + 0.75 * vel ** 1.4)
        return y * g


@lru_cache(maxsize=700)
def _shift_cached(path: str, semis: float) -> np.ndarray:
    return _shift(trimmed(path), semis).astype(np.float32)


class OneShots:
    """Échantillons nommés (percussions) : renvoie le fichier, avec variation de hauteur éventuelle."""

    def __init__(self, folder: str):
        self.folder = os.path.join(VSCO, folder)

    def get(self, name: str, gain: float = 1.0, semis: float = 0.0, trim: bool = True) -> np.ndarray:
        p = os.path.join(self.folder, name)
        x = _shift_cached(p, semis) if trim else _shift(load(p), semis)
        return x * gain


def measure_pitch(path: str, fmin: float = 60, fmax: float = 400) -> float:
    """Hauteur dominante (pic spectral) d'un son percussif accordé, en MIDI."""
    x = trimmed(path)
    m = x.mean(axis=0)
    seg = m[samples(0.05): samples(0.9)]
    seg = seg * np.hanning(len(seg))
    S = np.abs(np.fft.rfft(seg, 1 << 18))
    f = np.fft.rfftfreq(1 << 18, 1 / SR)
    S[(f < fmin) | (f > fmax)] = 0
    # Timbales : modes (1,1) : (2,1) : (3,1) ≈ 1 : 1,5 : 2. La hauteur perçue est le mode (1,1),
    # c'est-à-dire le plus grave des pics significatifs (pas forcément le plus fort).
    from scipy.signal import find_peaks
    peaks, _ = find_peaks(S, distance=200, height=S.max() * 0.3)
    pk = f[int(min(peaks))] if len(peaks) else f[int(np.argmax(S))]
    return 69 + 12 * np.log2(pk / 440)


class Timpani:
    """Cinq timbales accordées : on choisit celle dont la hauteur est la plus proche, puis on l'ajuste."""

    def __init__(self):
        base = os.path.join(VSCO, 'Percussion/Timpani')
        self.hits = {}
        for d in range(1, 6):
            files = sorted(glob.glob(os.path.join(base, f'Timpani{d}_Hit_v*_rr*_Sum.wav')))
            if files:
                self.hits[d] = (measure_pitch(files[-1]), files)
        self.rolls = {}
        for p in glob.glob(os.path.join(base, 'Rolls', '*.wav')):
            d = int(re.search(r'Timpani(\d)', os.path.basename(p)).group(1))
            self.rolls.setdefault(d, []).append(p)
        self._rr = 0

    def _nearest(self, midi: float):
        return min(self.hits.items(), key=lambda kv: abs(kv[1][0] - midi))

    def hit(self, midi: float, vel: float = 0.8) -> np.ndarray:
        d, (pm, files) = self._nearest(midi)
        layers = sorted({re.search(r'_v(\d)', f).group(1) for f in files})
        want = layers[min(len(layers) - 1, int(vel * len(layers) - 1e-9))]
        cands = [f for f in files if f'_v{want}_' in f]
        self._rr += 1
        f = cands[self._rr % len(cands)]
        return _shift_cached(f, round(midi - pm, 3)) * (0.35 + 0.65 * vel)

    def roll(self, midi: float, dur: float, vel: float = 0.8, cresc: bool = True) -> np.ndarray:
        d, (pm, _) = self._nearest(midi)
        files = sorted(self.rolls.get(d) or next(iter(self.rolls.values())))
        f = files[-1] if vel > 0.6 else files[0]
        x = _shift_cached(f, round(midi - pm, 3))
        n = samples(dur)
        y = np.zeros((2, n))
        m = min(n, x.shape[1])
        y[:, :m] = x[:, :m]
        if n > m:  # prolongation par boucle croisée
            seg = x[:, samples(0.5): m]
            pos = m
            while pos < n:
                k = min(seg.shape[1], n - pos)
                xf = min(samples(0.15), k)
                y[:, pos - xf:pos] *= np.linspace(1, 0, xf)
                part = seg[:, :k].copy()
                part[:, :xf] *= np.linspace(0, 1, xf)
                y[:, pos - xf:pos - xf + k] += part
                pos += k - xf
        env = np.linspace(0.25, 1.0, n) ** 1.6 if cresc else np.ones(n)
        env[-samples(0.05):] *= np.linspace(1, 0, samples(0.05))
        return y * env * vel

"""Mixage et mastering d'une Session."""
from __future__ import annotations

import numpy as np

from core import SR, Session, db, samples, width
from fx import compress, eq, limiter, lufs, pingpong, reverb, saturate, sidechain_curve


def render_tracks(s: Session) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    mix = np.zeros((2, s.n))
    sends: dict[str, np.ndarray] = {}
    delays: dict[float, np.ndarray] = {}
    sc = sidechain_curve(s.n, s.kicks, depth=0.55, release=0.17) if s.kicks else None
    stems: dict[str, np.ndarray] = {}
    for name, tr in s.tracks.items():
        o = tr.opts
        x = tr.buf * db(o.get('gain', 0.0))
        if not np.any(x):
            continue
        if 'eq' in o:
            x = eq(x, o['eq'])
        if 'comp' in o:
            x = compress(x, **o['comp'])
        if 'sat' in o:
            x = saturate(x, o['sat'])
        if 'width' in o:
            x = width(x, o['width'])
        if sc is not None and o.get('duck', 0) > 0:
            d = o['duck']
            x = x * (1 - d + d * sc)
        for kind, amt in (o.get('rev') or {}).items():
            sends[kind] = sends.get(kind, np.zeros((2, s.n))) + x * amt
        if 'delay' in o:
            beats, amt = o['delay']
            key = beats
            delays[key] = delays.get(key, np.zeros((2, s.n))) + x * amt
        stems[name] = x
        mix += x
    for beats, buf in delays.items():
        wet = pingpong(buf, beats * s.beat, feedback=0.42, taps=6, lp=4500)
        mix += wet
        sends['hall'] = sends.get('hall', np.zeros((2, s.n))) + wet * 0.3
    for kind, buf in sends.items():
        wet = reverb(buf, kind)
        wet = eq(wet, [('hp', 220), ('lp', 9500), ('peak', 450, 0.8, -2.5)])
        if sc is not None:
            wet = wet * (0.75 + 0.25 * sc)
        mix += wet
    return mix, stems


def master(x: np.ndarray, target_lufs: float = -16.0, ceiling: float = -1.0, glue: bool = True,
           tone: list | None = None) -> np.ndarray:
    x = eq(x, tone or [('hp', 30), ('lowshelf', 90, 0.7, -0.5), ('peak', 320, 0.9, -1.5), ('highshelf', 8000, 0.7, 2.5)])
    if glue:
        x = compress(x, threshold_db=-14, ratio=1.8, attack=0.02, release=0.2, knee_db=8)
    # normalisation itérative de la sonie avant limitation
    for _ in range(3):
        cur = lufs(x)
        if cur <= -69:
            break
        x = x * db(target_lufs - cur)
        x = limiter(x, ceiling)
    return x


def render(s: Session, target_lufs: float = -16.0, **kw) -> np.ndarray:
    mix, _ = render_tracks(s)
    return master(mix, target_lufs, **kw)


def write_wav(path: str, x: np.ndarray) -> None:
    from scipy.io import wavfile
    y = np.clip(x, -1, 1)
    wavfile.write(path, SR, (y.T * 32767).astype(np.int16))


def loop_region(full: np.ndarray, s: Session, intro_bars: float, loop_bars: float) -> tuple[np.ndarray, float, float]:
    """
    Construit un fichier « intro + boucle parfaite ».
    La session doit contenir l'intro puis DEUX fois la boucle : on garde l'intro, puis la
    seconde occurrence de la boucle (qui contient déjà les queues de réverbération de la
    première), si bien que le saut fin → début de boucle est inaudible.
    """
    a = samples(s.t(intro_bars))
    L = samples(s.t(intro_bars + loop_bars)) - a
    # Aucun fondu au point de bouclage : la seconde occurrence est déjà continue avec elle-même.
    out = np.concatenate([full[:, :a], full[:, a + L: a + 2 * L]], axis=1)
    return out, a / SR, (a + L) / SR

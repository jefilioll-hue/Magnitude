"""Détection de hauteur (YIN simplifié) pour cartographier les échantillons."""
import numpy as np

def yin_f0(x, sr, fmin=40.0, fmax=2000.0, threshold=0.12):
    x = x - np.mean(x)
    n = len(x)
    max_tau = min(int(sr / fmin), n // 2)
    min_tau = max(2, int(sr / fmax))
    w = n - max_tau
    if w <= 64:
        return None
    # Différence via FFT (autocorrélation)
    xf = np.fft.rfft(x, 2 * n)
    acf = np.fft.irfft(xf * np.conj(xf))[:max_tau + 1]
    cs = np.concatenate([[0.0], np.cumsum(x * x)])
    e0 = cs[w] - cs[0]
    taus = np.arange(max_tau + 1)
    et = cs[taus + w] - cs[taus]
    d = e0 + et - 2 * acf
    d[0] = 0
    cmnd = np.ones_like(d)
    run = np.cumsum(d[1:])
    cmnd[1:] = d[1:] * np.arange(1, max_tau + 1) / np.maximum(run, 1e-12)
    tau = None
    for t in range(min_tau, max_tau):
        if cmnd[t] < threshold:
            while t + 1 < max_tau and cmnd[t + 1] < cmnd[t]:
                t += 1
            tau = t
            break
    if tau is None:
        tau = int(np.argmin(cmnd[min_tau:max_tau]) + min_tau)
        if cmnd[tau] > 0.35:
            return None
    # interpolation parabolique
    if 1 <= tau < max_tau:
        a, b, c = cmnd[tau - 1], cmnd[tau], cmnd[tau + 1]
        den = a - 2 * b + c
        if abs(den) > 1e-12:
            tau = tau + 0.5 * (a - c) / den
    return sr / tau

def midi_of(f):
    return 69 + 12 * np.log2(f / 440.0)

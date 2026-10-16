"""Analyse objective d'un rendu : sonie, crête vraie, équilibre spectral, spectrogramme PNG."""
import sys
import numpy as np
from scipy import signal
sys.path.insert(0, 'lib')
from core import SR
from fx import lufs, true_peak_db


def report(name, x, png=None):
    m = x.mean(axis=0)
    f, P = signal.welch(m, SR, nperseg=8192)
    bands = [(20, 60, 'sub'), (60, 250, 'basses'), (250, 2000, 'médiums'), (2000, 6000, 'haut-méd.'), (6000, 20000, 'aigus')]
    tot = P.sum()
    shares = {lab: round(100 * P[(f >= lo) & (f < hi)].sum() / tot, 1) for lo, hi, lab in bands}
    corr = np.corrcoef(x[0], x[1])[0, 1]
    print(f'{name:22s} {x.shape[1]/SR:6.2f}s  LUFS {lufs(x):6.1f}  TP {true_peak_db(x):5.1f} dB  corr L/R {corr:4.2f}  {shares}')
    if png:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(14, 6), gridspec_kw={'height_ratios': [1, 3]})
        t = np.arange(len(m)) / SR
        ax[0].plot(t[::200], m[::200], lw=0.4)
        ax[0].set_xlim(0, t[-1])
        ax[1].specgram(m, NFFT=4096, Fs=SR, noverlap=3072, cmap='magma', vmin=-120)
        ax[1].set_yscale('symlog', linthresh=500)
        ax[1].set_ylim(30, 16000)
        ax[1].set_title(name)
        fig.tight_layout()
        fig.savefig(png, dpi=80)
        plt.close(fig)

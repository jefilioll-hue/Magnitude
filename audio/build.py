"""
Production de toute la bande-son de Magnitude.

    VSCO_DIR=/chemin/vers/VSCO-2-CE python3 build.py            # tout
    VSCO_DIR=… python3 build.py theme st_pile ui_click          # sélection

Sortie : public/audio/<nom>.webm (Opus) + <nom>.m4a (AAC) + manifest.json.
Les WAV intermédiaires et les spectrogrammes vont dans AUDIO_WORK (par défaut ./.work).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
sys.path.insert(0, os.path.join(HERE, 'compose'))

import warnings  # noqa: E402

warnings.filterwarnings('ignore')

import numpy as np  # noqa: E402

from core import SR, fade, samples  # noqa: E402
from fx import limiter, lufs, true_peak_db  # noqa: E402
from mix import loop_region, master, render_tracks, write_wav  # noqa: E402

OUT = os.path.abspath(os.path.join(HERE, '..', 'public', 'audio'))
WORK = os.environ.get('AUDIO_WORK', os.path.join(HERE, '.work'))


def _music(name: str):
    import lobby
    import results
    import theme
    import think
    if name == 'theme':
        s = theme.build()
        mix, _ = render_tracks(s)
        x = master(mix, -16.5)
        out, a, b = loop_region(x, s, theme.INTRO, theme.LOOP)
        return out, dict(kind='music', bpm=theme.BPM, loopStart=a, loopEnd=b)
    if name == 'lobby':
        s = lobby.build()
        mix, _ = render_tracks(s)
        x = master(mix, -18.0)
        out, a, b = loop_region(x, s, 0, lobby.LOOP)
        return out, dict(kind='music', bpm=lobby.BPM, loopStart=a, loopEnd=b)
    if name == 'results':
        s = results.build()
        mix, _ = render_tracks(s)
        x = master(mix, -16.5)
        out, a, b = loop_region(x, s, 0, results.LOOP)
        return out, dict(kind='music', bpm=results.BPM, loopStart=a, loopEnd=b)
    if name in ('think_a', 'think_b'):
        s = think.build_a() if name == 'think_a' else think.build_b()
        mix, _ = render_tracks(s)
        # Couches sommées par le jeu : mastering sans compression de bus, plafond bas.
        x = master(mix, -19.5 if name == 'think_a' else -19.0, ceiling=-4.0, glue=False)
        out, a, b = loop_region(x, s, 0, think.LOOP)
        return out, dict(kind='layer', group='think', bpm=think.BPM, loopStart=a, loopEnd=b)
    raise KeyError(name)


def _stinger(name: str):
    import stingers
    s, target = stingers.ALL[name]()
    mix, _ = render_tracks(s)
    x = master(mix, target, ceiling=-1.0, glue=True)
    if name.startswith('st_suspense'):
        x = fade(x, 0.0, 0.006)
    else:
        x = fade(x, 0.0, min(0.5, x.shape[1] / SR * 0.2))
    return x, dict(kind='sfx')


def _ui(name: str):
    import ui
    x, target = ui.ALL[name]()
    x = np.asarray(x, dtype=float)
    x = x if x.ndim == 2 else np.vstack([x, x])
    cur = lufs(x) if x.shape[1] > samples(0.45) else None
    if cur is None or cur < -69:
        # sons très courts : normalisation par la crête
        x = x / (np.max(np.abs(x)) + 1e-9) * (10 ** ((target + 14) / 20))
    else:
        x = x * 10 ** ((target - cur) / 20)
    x = limiter(x, -3.0)
    x = fade(x, 0.0, 0.01)
    return x, dict(kind='ui')


def names_all():
    import stingers
    import ui
    return ['theme', 'lobby', 'think_a', 'think_b', 'results'] + list(stingers.ALL) + list(ui.ALL)


def render_one(name: str):
    t0 = time.time()
    if name.startswith('st_'):
        x, meta = _stinger(name)
    elif name.startswith('ui_'):
        x, meta = _ui(name)
    else:
        x, meta = _music(name)
    os.makedirs(WORK, exist_ok=True)
    wav = os.path.join(WORK, f'{name}.wav')
    write_wav(wav, x)
    meta.update(duration=round(x.shape[1] / SR, 4), lufs=round(lufs(x), 1) if x.shape[1] > samples(0.45) else None,
                truePeak=round(true_peak_db(x), 1))
    for k in ('loopStart', 'loopEnd'):
        if k in meta:
            meta[k] = round(meta[k], 6)
    encode(wav, name, meta['kind'])
    meta['renderSeconds'] = round(time.time() - t0, 1)
    if meta['kind'] in ('music', 'layer'):
        try:
            from analyze import report
            report(name, x, os.path.join(WORK, f'{name}.png'))
        except Exception as e:  # analyse facultative
            print('analyse impossible', name, e)
    return name, meta


def encode(wav: str, name: str, kind: str) -> None:
    os.makedirs(OUT, exist_ok=True)
    br_opus = {'music': '128k', 'layer': '112k', 'sfx': '112k', 'ui': '64k'}[kind]
    br_aac = {'music': '160k', 'layer': '128k', 'sfx': '128k', 'ui': '96k'}[kind]
    base = os.path.join(OUT, name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libopus', '-b:a', br_opus, '-vbr', 'on',
                    '-application', 'audio', base + '.webm'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', br_aac, '-movflags', '+faststart',
                    base + '.m4a'], check=True)


def main(argv: list[str]) -> None:
    wanted = argv or names_all()
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path) as f:
            manifest = json.load(f).get('sounds', {})
    heavy = any(not (w.startswith('st_') or w.startswith('ui_')) for w in wanted)
    workers = 1 if heavy else max(1, min(len(wanted), (os.cpu_count() or 2)))
    t0 = time.time()
    # les morceaux longs d'abord pour équilibrer la charge
    order = sorted(wanted, key=lambda x: (x.startswith('ui_'), x.startswith('st_')))
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for name, meta in ex.map(render_one, order):
            manifest[name] = meta
            print(f'✓ {name:20s} {meta["duration"]:7.2f}s  LUFS {meta["lufs"]}  TP {meta["truePeak"]}  ({meta["renderSeconds"]}s)', flush=True)
    with open(manifest_path, 'w') as f:
        json.dump({'version': int(time.time()), 'sampleRate': SR, 'sounds': dict(sorted(manifest.items()))}, f, indent=1)
    print(f'Terminé en {time.time() - t0:.0f} s → {OUT}')


if __name__ == '__main__':
    main(sys.argv[1:])

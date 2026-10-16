/**
 * Moteur audio (Web Audio API).
 *
 *  - Aucun son avant un geste de l'utilisateur (politique des navigateurs et respect du joueur).
 *  - Bus séparés : musique, effets (jingles), interface ; volume global et sourdine.
 *  - Musique en boucle sans couture (points de bouclage au sample près, issus du manifeste).
 *  - Musique adaptative : couches « réflexion » A et B démarrées au même instant ; le jeu
 *    règle l'intensité de B (pression du chrono, contestation).
 *  - Les jingles atténuent automatiquement la musique pendant leur durée.
 */

export interface SoundMeta {
  kind: 'music' | 'layer' | 'sfx' | 'ui';
  duration: number;
  loopStart?: number;
  loopEnd?: number;
  bpm?: number;
  group?: string;
}

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
  ui: number;
  muted: boolean;
}

type MusicId = 'theme' | 'lobby' | 'think' | 'results' | null;

const UI_THROTTLE_MS: Record<string, number> = { ui_hover: 70, ui_key: 25, ui_score: 45, ui_tick: 120 };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private musicBus!: GainNode;
  private duckGain!: GainNode;
  private sfxBus!: GainNode;
  private uiBus!: GainNode;
  private manifest: Record<string, SoundMeta> = {};
  private manifestVersion = 0;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private ext: string = __AAC_EXT__;
  private current: { id: MusicId; nodes: { src: AudioBufferSourceNode; gain: GainNode }[] } = { id: null, nodes: [] };
  private wanted: MusicId = null;
  private thinkB: GainNode | null = null;
  private lastPlayed = new Map<string, number>();
  private duckUntil = 0;
  private volumes: Volumes = { master: 0.85, music: 0.7, sfx: 0.9, ui: 0.6, muted: false };
  private failed = false;
  private hidden = false;
  readonly ready: Promise<void>;
  private resolveReady!: () => void;

  constructor() {
    this.ready = new Promise((r) => (this.resolveReady = r));
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.hidden = document.hidden;
        this.applyVolumes(0.3);
      });
    }
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  get unavailable(): boolean {
    return this.failed;
  }

  private setup: Promise<void> | null = null;

  /**
   * À appeler depuis un geste utilisateur (clic, touche). La reprise du contexte est faite
   * de façon synchrone, sans attente préalable : Safari (iOS) n'autorise le son que pendant le geste.
   */
  unlock(): Promise<void> {
    if (this.failed) return Promise.resolve();
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) throw new Error('Web Audio indisponible');
        // iOS : jouer même quand le téléphone est en mode silencieux (Safari 17+).
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session) this.safe(() => (session.type = 'playback'));
        this.ctx = new Ctx({ latencyHint: 'interactive' });
        this.build();
        const probe = document.createElement('audio');
        this.ext = probe.canPlayType('audio/webm; codecs="opus"') ? 'webm' : __AAC_EXT__;
      }
      const ctx = this.ctx;
      if (ctx.state !== 'running') {
        void ctx.resume().catch(() => undefined);
        // Son muet d'un échantillon : achève le déverrouillage sur les anciens Safari.
        this.safe(() => {
          const src = ctx.createBufferSource();
          src.buffer = ctx.createBuffer(1, 1, 22050);
          src.connect(ctx.destination);
          src.start(0);
        });
      }
      if (!this.setup) {
        this.setup = this.loadManifest()
          .then(() => {
            this.resolveReady();
            // Musique d'accueil et sons d'interface en premier, le reste en arrière-plan.
            const first = Object.keys(this.manifest).filter((k) => k.startsWith('ui_') || k === 'theme' || k === this.wanted);
            void Promise.all(first.map((k) => this.load(k))).then(() => this.preloadRest());
            this.restartWanted();
          })
          .catch((e) => {
            console.warn('[audio]', e);
            this.failed = true;
            this.resolveReady();
          });
      } else {
        this.restartWanted();
      }
      return this.setup;
    } catch (e) {
      console.warn('[audio]', e);
      this.failed = true;
      this.resolveReady();
      return Promise.resolve();
    }
  }

  private restartWanted(): void {
    if (this.wanted && this.current.id !== this.wanted && Object.keys(this.manifest).length) void this.music(this.wanted);
  }

  private build(): void {
    const ctx = this.ctx as AudioContext;
    this.masterGain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    this.masterGain.connect(limiter).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.duckGain = ctx.createGain();
    this.musicBus.connect(this.duckGain).connect(this.masterGain);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.masterGain);
    this.uiBus = ctx.createGain();
    this.uiBus.connect(this.masterGain);
    this.applyVolumes(0);
  }

  private async loadManifest(): Promise<void> {
    const res = await fetch(`${__AUDIO_BASE__}manifest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`manifeste audio : HTTP ${res.status}`);
    const data = (await res.json()) as { version: number; sounds: Record<string, SoundMeta> };
    this.manifest = data.sounds;
    this.manifestVersion = data.version;
  }

  private preloadRest(): void {
    const order = ['theme', 'st_round', 'st_lock', 'st_suspense', 'st_suspense_short', 'st_pile', 'st_good', 'st_bad', 'think_a', 'think_b', 'lobby', 'results'];
    const rest = Object.keys(this.manifest).filter((k) => !order.includes(k) && !k.startsWith('ui_'));
    let chain = Promise.resolve();
    for (const k of [...order, ...rest]) chain = chain.then(() => this.load(k).then(() => undefined));
  }

  load(name: string): Promise<AudioBuffer | null> {
    const have = this.buffers.get(name);
    if (have) return Promise.resolve(have);
    const pending = this.loading.get(name);
    if (pending) return pending;
    if (!this.ctx || !this.manifest[name]) return Promise.resolve(null);
    const ctx = this.ctx;
    const p = fetch(`${__AUDIO_BASE__}${name}.${this.ext}?v=${this.manifestVersion}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        this.buffers.set(name, buf);
        return buf;
      })
      .catch((e) => {
        console.warn('[audio] chargement impossible', name, e);
        this.loading.delete(name);
        return null;
      });
    this.loading.set(name, p);
    return p;
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    this.applyVolumes(0.15);
  }

  private applyVolumes(ramp: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = this.volumes;
    const on = v.muted || this.hidden ? 0 : 1;
    const curve = (x: number) => Math.pow(Math.max(0, Math.min(1, x)), 1.6); // perception plus naturelle
    const set = (g: GainNode, value: number) =>
      this.safe(() => {
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(Number.isFinite(value) ? value : 0, t, Math.max(0.005, ramp / 3));
      });
    set(this.masterGain, curve(v.master) * on);
    set(this.musicBus, curve(v.music) * 0.8);
    set(this.sfxBus, curve(v.sfx));
    set(this.uiBus, curve(v.ui) * 0.9);
  }

  /* ----------------------------------------------------------------- musique */

  async music(id: MusicId, fade = 1.2): Promise<void> {
    this.wanted = id;
    if (!this.ctx || this.failed || !Object.keys(this.manifest).length) return;
    if (this.current.id === id) return;
    const ctx = this.ctx;
    const old = this.current;
    this.current = { id, nodes: [] };
    const t = ctx.currentTime;
    for (const n of old.nodes) {
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(0, t + fade);
      n.src.stop(t + fade + 0.05);
    }
    if (id === null) return;
    const names = id === 'think' ? ['think_a', 'think_b'] : [id];
    const bufs = await Promise.all(names.map((n) => this.load(n)));
    if (this.current.id !== id || bufs.some((b) => !b)) return;
    const start = ctx.currentTime + 0.06;
    names.forEach((name, i) => {
      const buf = bufs[i] as AudioBuffer;
      const meta = this.manifest[name] as SoundMeta;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = meta.loopStart ?? 0;
      src.loopEnd = Math.min(meta.loopEnd ?? buf.duration, buf.duration);
      const g = ctx.createGain();
      const target = name === 'think_b' ? 0 : 1;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(target, start + Math.min(fade, 0.8));
      src.connect(g).connect(this.musicBus);
      src.start(start);
      this.current.nodes.push({ src, gain: g });
      if (name === 'think_b') this.thinkB = g;
    });
  }

  /** Intensité de la couche « pression » (0 à 1). */
  tension(level: number, seconds = 1.5): void {
    if (!this.ctx || !this.thinkB || this.current.id !== 'think') return;
    if (!Number.isFinite(level) || !Number.isFinite(seconds)) return;
    const t = this.ctx.currentTime;
    this.safe(() => {
      this.thinkB?.gain.cancelScheduledValues(t);
      this.thinkB?.gain.setTargetAtTime(Math.max(0, Math.min(1, level)), t, Math.max(0.01, seconds / 3));
    });
  }

  /** Une erreur audio ne doit jamais interrompre le jeu. */
  private safe(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      console.warn('[audio]', e);
    }
  }

  private duck(seconds: number, depthDb = -12): void {
    if (!this.ctx || !Number.isFinite(seconds)) return;
    const t = this.ctx.currentTime;
    const g = this.duckGain.gain;
    const low = Math.pow(10, depthDb / 20);
    this.duckUntil = Math.max(this.duckUntil, t + seconds);
    g.cancelScheduledValues(t);
    g.setTargetAtTime(low, t, 0.04);
    g.setTargetAtTime(1, this.duckUntil, 0.5);
  }

  /* ----------------------------------------------------------------- effets */

  /** Joue un jingle ou un son d'interface. Renvoie sa durée (s), 0 si indisponible. */
  play(name: string, opts: { duck?: boolean; gain?: number; rate?: number } = {}): number {
    if (!this.ctx || this.failed || this.ctx.state !== 'running') return 0;
    const meta = this.manifest[name];
    if (!meta) return 0;
    const now = performance.now();
    const throttle = UI_THROTTLE_MS[name];
    if (throttle && now - (this.lastPlayed.get(name) ?? 0) < throttle) return 0;
    this.lastPlayed.set(name, now);
    const buf = this.buffers.get(name);
    if (!buf) {
      // Premier usage : on le joue s'il arrive très vite, sinon on l'ignore (pas de son en retard).
      void this.load(name).then((b) => {
        if (b && performance.now() - now < 400) {
          this.lastPlayed.delete(name);
          this.play(name, opts);
        }
      });
      return meta.duration;
    }
    const ctx = this.ctx;
    let ok = false;
    this.safe(() => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (opts.rate) src.playbackRate.value = opts.rate;
      const g = ctx.createGain();
      g.gain.value = Number.isFinite(opts.gain) ? (opts.gain as number) : 1;
      src.connect(g).connect(meta.kind === 'ui' ? this.uiBus : this.sfxBus);
      src.start();
      if (meta.kind === 'sfx' && opts.duck !== false && meta.duration > 0.9) this.duck(Math.min(meta.duration * 0.8, 6));
      ok = true;
    });
    return ok ? meta.duration : 0;
  }

  duration(name: string): number {
    return this.manifest[name]?.duration ?? 0;
  }
}

export const audio = new AudioEngine();

/** Raccourci pour les sons d'interface. */
export const ui = (name: 'click' | 'hover' | 'back' | 'toggle_on' | 'toggle_off' | 'error' | 'key' | 'whoosh' | 'score' | 'copy' | 'select' | 'open' | 'tick' | 'tick_urgent') =>
  audio.play(`ui_${name}`);

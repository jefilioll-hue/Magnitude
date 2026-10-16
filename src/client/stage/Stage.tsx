/**
 * Scène de plateau en WebGL : deux projecteurs (ambre « Solaire », cyan « Abysse »)
 * qui balaient une brume légère, un mur de LED en fond et un sol réfléchissant.
 *
 * Le jeu pilote l'éclairage via `stage.set()` : la lumière de l'équipe qui joue
 * s'intensifie, la révélation déclenche un flash, la victoire inonde la scène de
 * la couleur gagnante. Rendu en demi-résolution, 30 i/s au plus, gelé si les
 * animations sont réduites ; repli CSS si WebGL est indisponible.
 */
import { useEffect, useRef } from 'react';

interface Lights {
  a: number;
  b: number;
  flash: number;
  flashColor: [number, number, number];
  energy: number;
}

const target: Lights = { a: 0.8, b: 0.8, flash: 0, flashColor: [1, 0.95, 0.8], energy: 0.4 };
const current: Lights = { ...target, flashColor: [...target.flashColor] as [number, number, number] };

export const stage = {
  set(p: Partial<Omit<Lights, 'flash'>>) {
    Object.assign(target, p);
  },
  flash(color: 'a' | 'b' | 'gold' | 'red' = 'gold', amount = 1) {
    const colors = { a: [1, 0.72, 0.3], b: [0.3, 0.9, 1], gold: [1, 0.93, 0.7], red: [1, 0.35, 0.42] } as const;
    current.flashColor = [...colors[color]] as [number, number, number];
    current.flash = Math.max(current.flash, amount);
  },
  /** Ambiance par défaut des menus. */
  calm() {
    Object.assign(target, { a: 0.75, b: 0.75, energy: 0.35 });
  },
};

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uA;
uniform float uB;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform float uEnergy;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// Faisceau conique partant de 'o', orienté selon l'angle 'ang' (0 = vers le bas).
float beam(vec2 uv, vec2 o, float ang, float width) {
  vec2 d = uv - o;
  float a = atan(d.x, -d.y);
  float spread = abs(a - ang);
  float len = length(d);
  float core = smoothstep(width, 0.0, spread);
  return core * smoothstep(1.6, 0.0, len) * smoothstep(0.0, 0.05, len);
}

void main() {
  vec2 frag = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 uv = vec2((frag.x - 0.5) * aspect, frag.y);
  float t = uTime;

  // Fond : dégradé encre, plus clair vers le haut
  vec3 ink = mix(vec3(0.031, 0.047, 0.165), vec3(0.075, 0.1, 0.32), smoothstep(0.0, 1.0, frag.y));

  // Mur de LED (points discrets qui scintillent)
  vec2 g = uv * vec2(46.0, 46.0);
  vec2 cell = floor(g);
  float dotMask = smoothstep(0.32, 0.1, length(fract(g) - 0.5));
  float tw = 0.5 + 0.5 * sin(t * (0.6 + hash(cell) * 1.4) + hash(cell + 3.1) * 6.28);
  float wall = dotMask * smoothstep(0.32, 0.95, frag.y) * (0.05 + 0.07 * tw);
  vec3 col = ink + vec3(0.45, 0.5, 0.95) * wall;

  // Brume en mouvement
  float haze = fbm(uv * 2.2 + vec2(t * 0.03, -t * 0.02));

  // Projecteurs : légère oscillation, orientés vers le centre
  float sway = sin(t * 0.25) * 0.08;
  float bA = beam(uv, vec2(-0.55 * aspect, 1.08), 0.55 + sway, 0.2 + 0.05 * uEnergy);
  float bB = beam(uv, vec2(0.55 * aspect, 1.08), -0.55 - sway, 0.2 + 0.05 * uEnergy);
  float bC = beam(uv, vec2(0.0, 1.12), sin(t * 0.17) * 0.12, 0.09);
  vec3 solaire = vec3(1.0, 0.66, 0.26);
  vec3 abysse = vec3(0.24, 0.85, 0.95);
  float hz = 0.55 + 0.75 * haze;
  col += solaire * bA * hz * 0.55 * uA;
  col += abysse * bB * hz * 0.55 * uB;
  col += vec3(0.75, 0.75, 1.0) * bC * hz * 0.12 * (0.6 + uEnergy);

  // Sol : grille en perspective et reflets
  float horizon = 0.3;
  if (frag.y < horizon) {
    float depth = (horizon - frag.y) / horizon;
    float z = 1.0 / max(depth, 0.02);
    vec2 floorUv = vec2(uv.x * z * 0.9, z * 0.6 - t * 0.05);
    vec2 gl = abs(fract(floorUv * 1.2) - 0.5);
    float lines = smoothstep(0.035 * z * 0.25, 0.0, min(gl.x, gl.y));
    float fade = smoothstep(0.0, 0.85, depth) * smoothstep(1.0, 0.35, depth);
    col += vec3(0.36, 0.42, 0.95) * lines * fade * 0.12;
    // reflets des projecteurs sur le sol brillant
    float rA = exp(-pow((uv.x + 0.32 * aspect) * 2.4, 2.0)) * depth;
    float rB = exp(-pow((uv.x - 0.32 * aspect) * 2.4, 2.0)) * depth;
    col += solaire * rA * 0.16 * uA + abysse * rB * 0.16 * uB;
    col *= 0.78 + 0.22 * (1.0 - depth);
  }

  // Halo central (la place du « plateau »)
  col += vec3(0.32, 0.36, 0.85) * exp(-pow(length(uv - vec2(0.0, 0.42)) * 1.8, 2.0)) * 0.18;

  // Flash de révélation
  col += uFlashColor * uFlash * (0.35 + 0.65 * exp(-pow(length(uv - vec2(0.0, 0.5)) * 1.4, 2.0)));

  // Vignettage
  float vig = smoothstep(1.35, 0.35, length((frag - 0.5) * vec2(aspect * 0.9, 1.2)));
  col *= 0.55 + 0.45 * vig;

  // Tramage pour éviter les bandes de dégradé
  col += (hash(gl_FragCoord.xy + t) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[stage] shader', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function Stage({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) {
      canvas.style.display = 'none';
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.style.display = 'none';
      return;
    }
    const prog = gl.createProgram() as WebGLProgram;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u('uRes');
    const uTime = u('uTime');
    const uA = u('uA');
    const uB = u('uB');
    const uFlash = u('uFlash');
    const uFlashColor = u('uFlashColor');
    const uEnergy = u('uEnergy');

    const small = window.matchMedia('(max-width: 720px)').matches;
    const scale = small ? 0.42 : 0.55;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (now - last < 33) return; // ~30 i/s
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 3);
      current.a += (target.a - current.a) * k;
      current.b += (target.b - current.b) * k;
      current.energy += (target.energy - current.energy) * k;
      current.flash *= Math.exp(-dt * 2.6);
      const time = reduced ? 12.0 : (now - t0) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uA, current.a);
      gl.uniform1f(uB, current.b);
      gl.uniform1f(uFlash, reduced ? current.flash * 0.4 : current.flash);
      gl.uniform3f(uFlashColor, ...current.flashColor);
      gl.uniform1f(uEnergy, current.energy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [reduced]);

  return (
    <div className="stage" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}

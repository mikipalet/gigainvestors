import type { HeadGeometry } from "./head-geometry";
import type { Pose } from "./head-cases";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HeadDraw {
  tex: WebGLTexture;
  geom: HeadGeometry;
  rect: Box;
  clip: Box;
  pose: Pose;
  outline: number;
}

const VERT = `
attribute vec2 a_uv;
uniform vec4 u_head;
uniform vec2 u_size;
uniform float u_side;
uniform float u_hull;
uniform mat3 u_rot;
uniform vec2 u_origin;
uniform vec2 u_pivot;
uniform vec2 u_canvas;
uniform float u_scale;
uniform float u_lift;
varying vec2 v_uv;
varying float v_relief;

float skullE(vec2 uv) {
  vec2 d = (uv - u_head.xy) / u_head.zw;
  return 1.0 - dot(d, d);
}

// Depth in units of the skull's half width. A head is deeper than it is wide and the
// drawn outline sits nearer the face than the crown, so the back half is the deep one.
float relief(vec2 uv) {
  float e = skullE(uv);
  float skull = (e > 0.0 ? sqrt(e) : 0.0) * (u_side > 0.0 ? 0.95 : 1.35);
  vec2 n = (uv - vec2(u_head.x, u_head.y + 0.2 * u_head.w)) / (u_head.zw * vec2(0.16, 0.26));
  float nose = 0.32 * exp(-dot(n, n) * 1.5) * smoothstep(0.0, 0.1, e) * step(0.0, u_side);
  float below = smoothstep(u_head.y + u_head.w * 0.7, u_head.y + u_head.w * 1.25, uv.y);
  float cx = (uv.x - 0.5) * 2.05;
  // The sheet must close along the bottom edge or the hull pass paints the inside.
  float body = 0.45 * below * sqrt(max(0.0, 1.0 - cx * cx)) * smoothstep(1.0, 0.88, uv.y);
  return max(skull + nose, body);
}

vec3 surface(vec2 uv) {
  float z = relief(uv) * u_head.z * u_size.x * u_side;
  return vec3(uv.x * u_size.x - u_pivot.x, u_pivot.y - uv.y * u_size.y, z);
}

void main() {
  vec3 p = surface(a_uv);
  float r = relief(a_uv);
  if (u_hull > 0.0) {
    vec3 tx = surface(a_uv + vec2(0.004, 0.0)) - surface(a_uv - vec2(0.004, 0.0));
    vec3 ty = surface(a_uv + vec2(0.0, 0.004)) - surface(a_uv - vec2(0.0, 0.004));
    vec3 n = normalize(cross(ty, tx)) * u_side;
    p += n * u_hull * smoothstep(0.03, 0.2, r);
  }
  vec3 q = u_rot * p * u_scale;
  vec2 s = vec2(u_origin.x + u_pivot.x + q.x, u_origin.y + u_pivot.y - q.y + u_lift);
  gl_Position = vec4(s.x / u_canvas.x * 2.0 - 1.0, 1.0 - s.y / u_canvas.y * 2.0, -q.z / 4000.0, 1.0);
  v_uv = a_uv;
  v_relief = r;
}`;

const FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform vec4 u_head;
uniform float u_side;
uniform float u_pass;
uniform float u_dpr;
uniform vec3 u_ink;
uniform float u_alpha;
varying vec2 v_uv;
varying float v_relief;

void main() {
  float a;
  if (u_pass > 1.5) {
    a = 1.0;
  } else if (u_side > 0.0) {
    a = texture2D(u_tex, v_uv).a;
  } else {
    vec2 d = (v_uv - u_head.xy) / u_head.zw;
    float e = 1.0 - dot(d, d);
    float stripes = step(0.7, fract((gl_FragCoord.x * 0.7 + gl_FragCoord.y) / (4.5 * u_dpr)));
    float crown = 1.0 - smoothstep(0.15, 0.6, d.y);
    a = stripes * smoothstep(0.0, 0.3, e) * crown * 0.55;
  }
  a *= u_alpha;
  gl_FragColor = vec4(u_ink * a, a);
}`;

const GRIDS = [40, 14];
const FINE_FROM = 120;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

function rotation({ yaw, pitch, roll }: Pose) {
  const y = (yaw * Math.PI) / 180;
  const x = (-pitch * Math.PI) / 180;
  const z = (roll * Math.PI) / 180;
  const cy = Math.cos(y), sy = Math.sin(y), cx = Math.cos(x), sx = Math.sin(x), cz = Math.cos(z), sz = Math.sin(z);
  // Rz * Rx * Ry, column-major for uniformMatrix3fv.
  const ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
  const rx = [1, 0, 0, 0, cx, sx, 0, -sx, cx];
  const rz = [cz, sz, 0, -sz, cz, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]) => {
    const o = new Array(9).fill(0);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) o[c * 3 + r] += a[k * 3 + r] * b[c * 3 + k];
    return o;
  };
  return new Float32Array(mul(rz, mul(rx, ry)));
}

export function parseInk(css: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (!m) return [0.07, 0.07, 0.07];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class HeadRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private meshes: { index: WebGLBuffer; count: number; uv: WebGLBuffer }[] = [];
  private uvLoc = 0;
  private count = 0;
  private dpr = 1;
  private ink: [number, number, number];
  private size = { w: 0, h: 0 };

  constructor(private canvas: HTMLCanvasElement, ink: string) {
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: true });
    if (!gl) throw new Error("webgl");
    this.gl = gl;
    this.ink = parseInk(ink);
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
    this.program = program;
    gl.useProgram(program);
    for (const name of ["u_head", "u_size", "u_side", "u_hull", "u_rot", "u_origin", "u_pivot", "u_canvas", "u_scale", "u_lift", "u_tex", "u_pass", "u_dpr", "u_ink", "u_alpha"]) {
      this.u[name] = gl.getUniformLocation(program, name);
    }
    this.uvLoc = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(this.uvLoc);
    this.meshes = GRIDS.map((g) => this.mesh(g));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.CULL_FACE);
  }

  private mesh(cols: number) {
    const gl = this.gl;
    const uv: number[] = [];
    const idx: number[] = [];
    const rows = Math.round(cols * 1.25);
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) uv.push(c / cols, r / rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * (cols + 1) + c;
        idx.push(i, i + cols + 1, i + 1, i + 1, i + cols + 1, i + cols + 2);
      }
    }
    const uvBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    const index = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    return { index, count: idx.length, uv: uvBuf };
  }

  private bind(width: number) {
    const gl = this.gl;
    const m = this.meshes[width >= FINE_FROM ? 0 : 1];
    gl.bindBuffer(gl.ARRAY_BUFFER, m.uv);
    gl.vertexAttribPointer(this.uvLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.index);
    return m.count;
  }

  texture(img: HTMLImageElement | HTMLCanvasElement) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  resize(w: number, h: number, dpr: number) {
    this.dpr = dpr;
    this.size = { w, h };
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  draw(heads: HeadDraw[]) {
    const gl = this.gl;
    const { w, h } = this.size;
    gl.scissor(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(this.u.u_canvas, w, h);
    gl.uniform1f(this.u.u_dpr, this.dpr);
    gl.uniform3f(this.u.u_ink, ...this.ink);
    gl.uniform1i(this.u.u_tex, 0);
    for (const head of heads) this.drawHead(head);
  }

  private drawHead({ tex, geom, rect, clip, pose, outline }: HeadDraw) {
    const gl = this.gl;
    const d = this.dpr;
    this.count = this.bind(rect.w);
    gl.scissor(Math.round(clip.x * d), Math.round((this.size.h - clip.y - clip.h) * d), Math.round(clip.w * d), Math.round(clip.h * d));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform4f(this.u.u_head, geom.cx, geom.cy, geom.rx, geom.ry);
    gl.uniform2f(this.u.u_size, rect.w, rect.h);
    gl.uniformMatrix3fv(this.u.u_rot, false, rotation(pose));
    gl.uniform2f(this.u.u_origin, rect.x, rect.y);
    gl.uniform2f(this.u.u_pivot, geom.cx * rect.w, geom.cy * rect.h);
    gl.uniform1f(this.u.u_scale, pose.scale);
    gl.uniform1f(this.u.u_lift, pose.lift);
    gl.uniform1f(this.u.u_hull, 0);

    // Depth first for both sides, then ink only where a fragment is the nearest surface:
    // with paper showing through, that is what stops the face bleeding through the skull.
    gl.colorMask(false, false, false, false);
    gl.depthFunc(gl.LESS);
    gl.uniform1f(this.u.u_pass, 0);
    this.bothSides(gl.BACK);
    gl.colorMask(true, true, true, true);
    gl.depthFunc(gl.LEQUAL);
    gl.uniform1f(this.u.u_pass, 1);
    gl.uniform1f(this.u.u_alpha, 1);
    this.bothSides(gl.BACK);

    if (outline > 0.01) {
      gl.depthFunc(gl.LESS);
      gl.uniform1f(this.u.u_pass, 2);
      gl.uniform1f(this.u.u_alpha, outline);
      gl.uniform1f(this.u.u_hull, 1.1);
      this.bothSides(gl.FRONT);
      gl.uniform1f(this.u.u_hull, 0);
    }
  }

  // The back sheet is the front mirrored through the sketch plane, which reverses its
  // winding, so its front face is declared clockwise to keep culling meaningful.
  private bothSides(cull: number) {
    const gl = this.gl;
    gl.cullFace(cull);
    for (const sign of [1, -1]) {
      gl.uniform1f(this.u.u_side, sign);
      gl.frontFace(sign > 0 ? gl.CCW : gl.CW);
      gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
  }
}

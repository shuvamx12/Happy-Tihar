"use strict";
const $ = s => document.querySelector(s);
const pick = a => a[Math.random() * a.length | 0];
const rnd = (a, b) => a + Math.random() * (b - a);
const GOLD = ["#ffd36b", "#ffb347", "#fff0b8", "#ff8a1f"];

/* ---------- UI helpers ---------- */
let tt;
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400); };
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: .12 });
document.querySelectorAll(".rv").forEach(e => io.observe(e));
for (let i = 0; i < 14; i++) { // floating marigold petals
  const p = document.createElement("i");
  p.style.cssText = `left:${rnd(0, 100)}%;--dx:${rnd(-120, 120)}px;animation-duration:${rnd(11, 20)}s;animation-delay:${-rnd(0, 18)}s`;
  $("#petals").append(p);
}

/* ---------- Canvas particle engine ---------- */
const cv = $("#fx"), cx = cv.getContext("2d");
let W, H, P = [], E = [], run = false, lt = 0;
function size() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
size(); addEventListener("resize", size);
const add = (x, y, vx, vy, l, c, s, g = .05, t = 0, f = .99, d = .014) => { if (P.length < 700) P.push({ x, y, vx, vy, l, c, s, g, t, f, d }); };
function wake() { if (!run) { run = true; lt = performance.now(); requestAnimationFrame(tick); } }
function flash(x, y, h, r, a = .55) {
  E.push({ u: (e, k) => {
    a -= .045 * k; if (a <= 0) return false;
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${h},100%,80%,${a})`); g.addColorStop(1, "hsla(0,0%,0%,0)");
    cx.globalAlpha = 1; cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(x - r, y - r, 2 * r, 2 * r);
    return true;
  } });
  wake();
}
function burst(x, y, n, o = {}) { // realistic shell: velocity + drag + gravity + streaking trails + glitter
  if (typeof o === "number") o = { h: o };
  const h = o.h ?? rnd(0, 360), st = o.st || pick(["peony", "dual", "willow", "ring"]), sp = o.sp || 1, w = st === "willow";
  flash(x, y, w ? 40 : h, 40 + 150 * sp);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + rnd(-.05, .05), V = (st === "ring" ? 5 : rnd(1.5, 7.5)) * sp;
    add(x, y, Math.cos(a) * V, Math.sin(a) * V, rnd(1, 1.5) * (w ? 1.7 : 1), w ? rnd(34, 46) : st === "dual" && i % 2 ? h + 60 : h, w ? 1.1 : rnd(1.3, 2.1), w ? .05 : .035, o.glit || w ? 1 : 0, w ? .975 : .965, w ? .008 : .012);
  }
  if (o.glit) for (let i = 0; i < n / 3; i++) { const a = rnd(0, 6.28), V = rnd(.5, 3); add(x, y, Math.cos(a) * V, Math.sin(a) * V, rnd(1.2, 2), 50, 1, .03, 1, .97, .008); }
  wake();
}
function confetti(x, y) {
  const C = ["#ff9a2e", "#ffd36b", "#c1272d", "#f6ecd2"];
  for (let i = 0; i < 70; i++) add(x, y, rnd(-5, 5), rnd(-11, -3), rnd(1.4, 2), pick(C), rnd(3, 6), .2, 2);
  wake();
}
function tick(now) {
  const k = Math.min(2.5, (now - lt) / 16.7 || 1); lt = now;
  cx.clearRect(0, 0, W, H); cx.lineCap = "round";
  E = E.filter(e => e.u(e, k, now));
  P = P.filter(p => {
    const f = Math.pow(p.f, k);
    p.x += p.vx * k; p.y += p.vy * k; p.vy += p.g * k; p.vx *= f; p.vy *= f; p.l -= p.d * k;
    if (p.l <= 0) return false;
    cx.globalAlpha = p.t === 1 && Math.random() < .35 ? .15 : Math.min(1, p.l * 1.4);
    if (p.t === 2) { cx.globalCompositeOperation = "source-over"; cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s * .6); return true; }
    cx.globalCompositeOperation = "lighter";
    cx.strokeStyle = typeof p.c === "number" ? `hsl(${p.c},100%,${p.l > .9 ? 92 : 52 + p.l * 14}%)` : p.c;
    cx.lineWidth = p.s; cx.beginPath(); cx.moveTo(p.x - p.vx * 2.6, p.y - p.vy * 2.6); cx.lineTo(p.x, p.y); cx.stroke();
    return true;
  });
  cx.globalAlpha = 1;
  if (P.length || E.length) requestAnimationFrame(tick); else { run = false; cx.clearRect(0, 0, W, H); }
}

/* ---------- Web Audio (created only after a user tap; reverb gives outdoor "boom" realism) ---------- */
let ac, mg, nb, on = true, voices = 0;
const LT = [...Array(18)].map((_, i) => i < 8 ? i * 150 : 1200 + (i - 8) * 70); // ladi bang timings (ms)
function A() {
  if (!on) return null;
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); mg = ac.createGain(); mg.gain.value = .45; mg.connect(ac.destination);
    nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.sampleRate * 2.2 | 0, ib = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ib.getChannelData(c); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3; }
    const cv2 = ac.createConvolver(), rg = ac.createGain(); cv2.buffer = ib; rg.gain.value = .4; mg.connect(rg).connect(cv2).connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
function noise(t, d, f, type, v, f2) {
  if (voices > 40) return;
  const o = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  o.buffer = nb; o.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(fl).connect(g).connect(mg); o.start(t); o.stop(t + d + .05); voices++; o.onended = () => voices--;
}
function tone(t, d, f1, f2, type, v) {
  if (voices > 40) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(mg); o.start(t); o.stop(t + d + .05); voices++; o.onended = () => voices--;
}
function sizzle(t, d, v) { // random-amplitude hiss, like a real sparkler
  const o = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  o.buffer = nb; o.loop = true; fl.type = "highpass"; fl.frequency.value = 5000;
  for (let s = 0; s < d; s += .03) g.gain.setValueAtTime(v * Math.random() ** 2, t + s);
  g.gain.linearRampToValueAtTime(0, t + d);
  o.connect(fl).connect(g).connect(mg); o.start(t); o.stop(t + d + .05);
}
const crackle = (t, n, span, v) => { for (let i = 0; i < n; i++) noise(t + rnd(0, span), .012, rnd(3500, 7000), "highpass", v * rnd(.3, 1)); };
const bang = (t, v) => { noise(t, .05, 4500, "highpass", v); tone(t, .12, 180, 50, "sine", v * .8); noise(t, .25, 1500, "lowpass", v * .5, 200); };
const boom = (t, v) => { noise(t, .04, 3000, "bandpass", v); tone(t, .5, 95, 32, "sine", v); noise(t, 1.6, 350, "lowpass", v * .7, 50); };
const whoosh = (t, d, v) => noise(t, d, 700, "bandpass", v, 2800);
const SFX = {
  fuljhadi: t => { sizzle(t, 4.5, .09); crackle(t, 40, 4.5, .08); },
  anar: t => { noise(t, .4, 300, "lowpass", .15); noise(t + .1, 3.4, 2200, "bandpass", .1, 1200); crackle(t, 50, 3.4, .12); },
  chakri: t => { tone(t, 2.6, 200, 1300, "sawtooth", .03); noise(t, 3.6, 1500, "bandpass", .09, 3500); crackle(t + .3, 25, 3, .07); },
  rocket: t => { whoosh(t, 1.4, .14); tone(t, 1.4, 700, 2800, "sine", .05); boom(t + 1.4, .7); crackle(t + 1.5, 45, 1.6, .09); },
  ladi: t => LT.forEach(d => bang(t + d / 1000, rnd(.25, .4))),
  sky: t => { whoosh(t, .8, .15); boom(t + .75, 1); boom(t + 1.02, .5); crackle(t + 1.1, 70, 2.2, .1); }
};
$("#snd").onclick = e => {
  on = !on; e.target.textContent = "♪ Sound: " + (on ? "On" : "Off"); e.target.setAttribute("aria-pressed", on);
  if (ac) mg.gain.setTargetAtTime(on ? .45 : 0, ac.currentTime, .05);
  song.muted = !on;
  if (on) A();
};

/* ---------- Pataka Zone (virtual fireworks) ---------- */
const FW = [
  ["fuljhadi", "FULJHADI", "फुलझरी", "Handheld sparkler"],
  ["anar", "ANAR", "अनार", "Fountain of sparks"],
  ["chakri", "CHAKRI", "चक्र", "Spinning wheel"],
  ["rocket", "ROCKET", "रकेट", "Whistling sky climber"],
  ["ladi", "LADI", "पटाका माला", "Rapid-fire string"],
  ["sky", "SKY SHOT", "स्काई सट", "Grand aerial burst"]
];
const rise = (x, y, ty, D, done) => {
  const t0 = performance.now();
  E.push({ u: (e, k, n) => {
    const p = Math.min(1, (n - t0) / D), yy = y + (ty - y) * (1 - (1 - p) ** 2), xx = x + Math.sin(p * 9) * 3;
    add(xx, yy, rnd(-.5, .5), rnd(.5, 1.6), rnd(.4, .7), 30, 1.8, .03, 0, .95); add(xx, yy, 0, 0, .2, "#fff", 3, 0);
    if (p >= 1) { done(xx, yy); return false; } return true;
  } });
  wake();
};
const FX = {
  fuljhadi(x, y) {
    let l = 300; const ty = y - 48;
    E.push({ u: (e, k) => {
      l -= k;
      for (let i = 0; i < 4 * k; i++) { const a = rnd(0, 6.28), v = rnd(1, 5); add(x, ty, Math.cos(a) * v, Math.sin(a) * v - 1, rnd(.3, .6), rnd(30, 52), rnd(.8, 1.5), .1, 0, .95, .02); }
      add(x, ty, 0, 0, .12, "#fff", 4, 0);
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over"; cx.strokeStyle = "#c9a24b"; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, ty); cx.stroke();
      return l > 0;
    } });
  },
  anar(x, y) {
    let l = 210;
    E.push({ u: (e, k) => {
      l -= k;
      for (let i = 0; i < 6 * k; i++) { const a = -1.57 + rnd(-.3, .3), v = rnd(5, 10); add(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(.8, 1.2), Math.random() < .6 ? rnd(30, 50) : rnd(0, 360), rnd(1, 2), .14, 0, .985); }
      if (Math.random() < .1 * k) flash(x, y - 30, 40, 80, .25);
      return l > 0;
    } });
  },
  chakri(x, y) {
    let l = 270, a = 0, h = rnd(0, 360);
    E.push({ u: (e, k) => {
      l -= k; a += .33 * k; h += 6 * k;
      for (let j = 0; j < 3; j++) {
        const b = a + j * 2.09, px = x + Math.cos(b) * 26, py = y - 34 + Math.sin(b) * 26;
        add(px, py, -Math.sin(b) * 3 + rnd(-1, 1), Math.cos(b) * 3 + rnd(-1, 1), rnd(.5, .8), j ? h : rnd(30, 50), rnd(1, 1.9), .03, 0, .97);
      }
      if (Math.random() < .08 * k) flash(x, y - 34, h, 70, .25);
      return l > 0;
    } });
  },
  rocket(x, y) { rise(x, y, Math.max(90, y - H * .6), 1400, (a, b) => { burst(a, b, 110); setTimeout(() => burst(a, b, 70, { glit: true }), 200); }); },
  ladi(x, y) { LT.forEach((d, i) => setTimeout(() => { const bx = x + rnd(-100, 100); flash(bx, y, 40, 60, .7); burst(bx, y - rnd(0, 15), i > 15 ? 40 : 14, { h: rnd(25, 45), st: "peony", sp: i > 15 ? .55 : .35 }); }, d)); },
  sky(x, y) { rise(x, y, H * .25, 700, (a, b) => { burst(a, b, 170, { glit: true, st: "peony" }); setTimeout(() => burst(a + rnd(-60, 60), b + rnd(-30, 30), 110, { st: "willow" }), 260); }); }
};
let last = null, lit = 0;
FW.forEach((f, i) => {
  const d = document.createElement("div"); d.className = "card";
  d.innerHTML = `<h3>${f[1]}</h3><div class="n">${f[2]}</div><p>${f[3]}</p><div class="fuse"><i></i></div><button class="btn sm">Light it</button>`;
  d.querySelector("button").onclick = () => light(i);
  $("#fwg").append(d);
});
function ground(i) { const r = $("#stage").getBoundingClientRect(); return { x: r.left + r.width * (i + .5) / 6, y: r.bottom - 12 }; }
function fire(i) {
  const id = FW[i][0], g = ground(i);
  FX[id](g.x, g.y); const c = A(); if (c) SFX[id](c.currentTime + .02);
  $("#fc").textContent = ++lit; wake();
}
function light(i) {
  last = i; const card = $("#fwg").children[i];
  card.classList.remove("burn"); void card.offsetWidth; card.classList.add("burn");
  A(); setTimeout(() => fire(i), 1100);
}
$("#rep").onclick = () => last === null ? toast("Light a firework first") : light(last);
$("#fin").onclick = () => { FW.forEach((f, i) => setTimeout(() => light(i), i * 450)); toast("Grand finale!"); };

/* ---------- Sweet shop (detailed SVG sweets + on-screen eating) ---------- */
const F1 = (n, d = 1) => n.toFixed(d);
const pearls = (x0, y0, r, n, cols, op = .8) => { let s = ""; for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * r; s += `<circle cx="${F1(x0 + Math.cos(a) * d)}" cy="${F1(y0 + Math.sin(a) * d)}" r="${F1(rnd(1.6, 3))}" fill="${pick(cols)}" opacity="${op}"/>`; } return s; };
const rg = (id, a, b, c) => `<radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
const lg = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const hi = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".45" transform="rotate(-30 ${x} ${y})"/>`;
const SH = '<ellipse cx="50" cy="91" rx="36" ry="6" fill="#000" opacity=".4"/>';
const bowl = (a, b) => `<defs>${lg("bw", "#f0d792", "#8a5f1c")}${lg("sy" + a.slice(1), a, b)}</defs>${SH}<path d="M6 52Q50 48 94 52Q92 86 50 88Q8 86 6 52Z" fill="url(#bw)"/><ellipse cx="50" cy="54" rx="43" ry="12" fill="url(#sy${a.slice(1)})"/><ellipse cx="36" cy="52" rx="14" ry="2.5" fill="#fff" opacity=".35"/>`;
const balls = id => [[49, 36, 13], [35, 49, 14], [63, 50, 14]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>${hi(x - 4, y - 5, 5, 3)}`).join("");
let th = "", tp = ""; for (let i = 0; i < 52; i += 1.6) th += `<line x1="${14 + i}" y1="38" x2="${14 + i}" y2="74" stroke="#7a4a10" stroke-opacity="${F1(rnd(.1, .35), 2)}" stroke-width=".7"/>`;
for (let i = 0; i < 52; i += 2.2) tp += `<line x1="${14 + i}" y1="38" x2="${36 + i}" y2="22" stroke="#9a6418" stroke-opacity="${F1(rnd(.1, .35), 2)}" stroke-width=".7"/>`;
const SWEETS = [
  ["Soan Papdi", `<defs>${lg("s1", "#fff0c0", "#ecc070")}${lg("s2", "#ebbd66", "#a8741c")}${lg("s3", "#d49a3a", "#8a5810")}</defs>${SH}<polygon points="14,38 66,38 66,74 14,74" fill="url(#s2)"/>${th}<polygon points="14,38 36,22 88,22 66,38" fill="url(#s1)"/>${tp}<polygon points="66,38 88,22 88,58 66,74" fill="url(#s3)"/><rect x="40" y="27" width="8" height="2.5" rx="1.2" fill="#7fae3a" transform="rotate(-25 44 28)"/><rect x="58" y="29" width="7" height="2.5" rx="1.2" fill="#8fbf45" transform="rotate(-25 61 30)"/>`, ["#f3cf7a", "#e0a94a", "#fff0c0"]],
  ["Motichoor Laddu", `<defs>${rg("ld", "#ffcf5c", "#f09a1c", "#8c4a05")}</defs>${SH}<circle cx="50" cy="52" r="37" fill="url(#ld)"/>${pearls(50, 52, 34, 110, ["#ffb13b", "#e8851a", "#ffd978", "#c46d10"], .7)}<rect x="44" y="28" width="8" height="3" rx="1.5" fill="#7fae3a" transform="rotate(30 48 29)"/><rect x="58" y="36" width="7" height="3" rx="1.5" fill="#8fbf45" transform="rotate(-20 61 37)"/>${hi(36, 34, 11, 6)}`, ["#ff9a1f", "#ffcf5c", "#c46d10"]],
  ["Kaju Katli", `<defs>${lg("kk", "#fff8e2", "#e8cd94")}${lg("sv", "#ffffff", "#b9bfcc")}</defs>${SH}<path d="M50 10L90 50L50 90L10 50Z" fill="url(#kk)" stroke="#b9955a" stroke-width="1.5"/><path d="M50 20L80 50L50 80L20 50Z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>${pearls(50, 50, 26, 40, ["#e5c88a"], .5)}<path d="M50 14L72 36L56 44L40 30Z" fill="url(#sv)" opacity=".8"/><path d="M62 62L78 56L68 76Z" fill="url(#sv)" opacity=".7"/>`, ["#fff3d3", "#e8cd94", "#d9dce4"]],
  ["Gulab Jamun", `${bowl("#e0a030", "#7a3a08")}<defs>${rg("gj", "#b0541f", "#5a200a", "#240a02")}</defs>${balls("gj")}`, ["#6b2a12", "#e0a030", "#8a3a1a"]],
  ["Rasgulla", `${bowl("#f6e7b8", "#cfae5e")}<defs>${rg("rl", "#ffffff", "#f4ead2", "#d8c9a0")}</defs>${balls("rl")}${pearls(49, 46, 22, 25, ["#c9b78a"], .35)}`, ["#fffaf0", "#f4ead2", "#e8d9a8"]],
  ["Sel Roti", `<defs>${rg("sl", "#e9a54a", "#b8641a", "#6a3008")}</defs>${SH}<circle cx="50" cy="52" r="37" fill="url(#sl)"/><circle cx="50" cy="52" r="30" fill="none" stroke="#ffdc96" stroke-opacity=".35" stroke-width="3"/><circle cx="50" cy="52" r="24" fill="none" stroke="#501e00" stroke-opacity=".3" stroke-width="3"/>${pearls(50, 52, 34, 40, ["#7a3a0a"], .35)}<circle cx="50" cy="52" r="13" fill="#1b0710"/><circle cx="50" cy="52" r="13" fill="none" stroke="#6a3008" stroke-width="2"/>${hi(34, 34, 12, 4)}`, ["#e9a54a", "#b8641a", "#f2c27a"]],
  ["Chocolate Box", `<defs>${lg("bx", "#6a3418", "#2a1208")}${rg("ch", "#9a6040", "#4a2210", "#1e0c04")}${rg("gw", "#fff0b0", "#d9a93a", "#7a5410")}</defs>${SH}<rect x="8" y="22" width="84" height="64" rx="4" fill="url(#bx)" stroke="#c9a24b" stroke-width="2"/><rect x="14" y="28" width="72" height="52" rx="3" fill="#1e0c04"/>${[[30, 42], [50, 42], [70, 42], [30, 64], [50, 64], [70, 64]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="8.5" fill="url(#${i % 3 === 1 ? "gw" : "ch"})"/>${hi(x - 2, y - 3, 3.5, 2)}`).join("")}`, ["#6a3418", "#9a6040", "#d9a93a"]]
];
let sc = 0, eating = false;
function chomp() { const c = A(); if (c) { const t = c.currentTime; noise(t, .07, 1400, "bandpass", .25); tone(t, .09, 220, 90, "triangle", .2); } }
function eat(n, svg, cr) {
  if (eating) return; eating = true;
  const o = $("#eat"); o.innerHTML = `<svg viewBox="0 0 100 100"><defs><mask id="mk"><rect width="100" height="100" fill="#fff"/><g id="mb"></g></mask></defs><g mask="url(#mk)">${svg}</g></svg><p>Nom nom nom… enjoy!</p>`;
  o.classList.add("on");
  const B = [[78, 34], [22, 42], [72, 74], [28, 72], [50, 52]];
  B.forEach((p, i) => setTimeout(() => {
    const m = i === 4 ? 2.3 : 1;
    [[0, 0, 17], [-10, 9, 11], [10, -9, 11]].forEach(([dx, dy, r]) => { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("cx", p[0] + dx * m); c.setAttribute("cy", p[1] + dy * m); c.setAttribute("r", r * m); c.setAttribute("fill", "#000"); c.setAttribute("class", "bt"); $("#mb").append(c); });
    const r = $("#eat svg").getBoundingClientRect(), X = r.left + r.width * p[0] / 100, Y = r.top + r.height * p[1] / 100;
    for (let j = 0; j < 16; j++) add(X, Y, rnd(-3, 3), rnd(-4, -1), rnd(.8, 1.2), pick(cr), rnd(2.5, 4.5), .2, 2);
    wake(); chomp();
  }, 300 + i * 480));
  setTimeout(() => { o.classList.remove("on"); eating = false; }, 300 + 5 * 480 + 500);
}
$("#eat").onclick = () => { $("#eat").classList.remove("on"); eating = false; };
SWEETS.forEach(([n, svg, cr]) => {
  const d = document.createElement("div"); d.className = "card sw";
  d.innerHTML = `<svg viewBox="0 0 100 100">${svg}</svg><h3>${n}</h3>`;
  d.onclick = () => {
    if (eating) return;
    d.classList.remove("pop"); void d.offsetWidth; d.classList.add("pop");
    toast("🎁 Shuvam gifted you " + n + "!"); $("#sc").textContent = ++sc; eat(n, svg, cr);
  };
  $("#sg").append(d);
});

/* ---------- Diyas ---------- */
let dl = 0;
for (let i = 0; i < 6; i++) {
  const d = document.createElement("div"); d.className = "diya";
  d.innerHTML = `<svg viewBox="0 0 100 90"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d792"/><stop offset=".5" stop-color="#c9a24b"/><stop offset="1" stop-color="#7a5418"/></linearGradient></defs><path d="M6 44Q50 40 94 44Q92 82 50 84Q8 82 6 44Z" fill="url(#g${i})"/><path d="M2 40Q8 34 18 42M98 40Q92 34 82 42" stroke="#f0d792" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#7a1a24"><circle cx="30" cy="62" r="3"/><circle cx="50" cy="68" r="3"/><circle cx="70" cy="62" r="3"/></g><path class="fl" d="M50 40C34 28 44 14 50 2C58 14 66 28 50 40Z" fill="#ffa21f"/><path class="fl" d="M50 40C43 33 47 25 50 18C54 25 57 33 50 40Z" fill="#fff3b0"/></svg>`;
  d.onclick = () => {
    if (d.classList.contains("lit")) return;
    d.classList.add("lit"); $("#dc").textContent = ++dl;
    const r = d.getBoundingClientRect();
    for (let j = 0; j < 14; j++) { add(r.left + r.width / 2, r.top + r.height * .3, rnd(-1.2, 1.2), rnd(-3, -.5), rnd(.6, .9), pick(GOLD), rnd(1, 2), .02); } wake();
    if (dl === 6) { toast("All diyas lit. Shubh Tihar!"); for (let j = 0; j < 7; j++) setTimeout(() => burst(rnd(W * .15, W * .85), rnd(H * .15, H * .5), 60), j * 280); }
  };
  $("#dg").append(d);
}

/* ---------- Deusi-Bhailo (original synthesized tune) ---------- */
let bh = false, bt;
const SC = [293.7, 329.6, 370, 440, 493.9, 587.3], MEL = [0, 2, 3, 2, 4, 3, 2, 0], WD = ["देउसिरे!", "भैलो रे!"];
function bhLoop() {
  if (!bh) return;
  const c = A();
  if (c) { const t = c.currentTime + .05; MEL.forEach((m, i) => { tone(t + i * .36, .5, SC[m], SC[m] * .998, "triangle", .1); if (i % 2 === 0) tone(t + i * .36, .16, 130, 55, "sine", .35); else noise(t + i * .36, .05, 5000, "highpass", .06); }); }
  for (let j = 0; j < 4; j++) setTimeout(() => { if (!bh) return; const el = $("#dbw"); el.textContent = WD[j % 2]; el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit"); }, j * 720);
  bt = setTimeout(bhLoop, 2880);
}
$("#db").onclick = e => {
  bh = !bh; e.target.textContent = bh ? "Stop singing" : "Sing Deusi-Bhailo";
  if (bh) { if (!on) toast("Turn sound on to hear the tune"); bhLoop(); } else clearTimeout(bt);
};

/* ---------- Mystery gift ---------- */
const GIFTS = [["🍬", "A bag of Kaju Katli, all yours and no sharing required!"], ["🪔", "A golden diya blessing: may the year ahead glow with good luck."], ["🌼", "A marigold garland for your door. Shubh Tihar!"], ["💰", "Lakshmi’s blessing: wealth, health and endless chai-time."], ["🍩", "A fresh, warm Sel Roti, delivered with extra love."], ["🤗", "A giant virtual hug from Shuvam. Happy Tihar!"], ["🎶", "You’ve been invited to sing Deusi-Bhailo, and the village wants an encore."], ["🧿", "Surprise! A lifetime supply of Gulab Jamun (digital edition)."]];
const box = $("#box");
box.onclick = () => {
  if (box.classList.contains("open")) return; box.classList.add("open");
  const g = pick(GIFTS), r = box.getBoundingClientRect();
  setTimeout(() => { $("#rv").innerHTML = `<span class="em">${g[0]}</span>${g[1]}`; $("#again").hidden = false; confetti(r.left + r.width / 2, r.top + 20); burst(r.left + r.width / 2, r.top, 40, rnd(20, 50)); }, 350);
};
$("#again").onclick = () => { box.classList.remove("open"); $("#rv").textContent = "Tap to open"; $("#again").hidden = true; };

/* ---------- Wishes ---------- */
const WISHES = [
  "तपाईंलाई शुभ तिहार! यो तिहारले जीवनमा उज्यालो, खुशी र मिठास ल्याओस्।",
  "May the glow of a thousand diyas light every corner of your life. Happy Tihar!",
  "सेल रोटी खाऔं, देउसी भैलो गाऔं। शुभ तिहार!",
  "Tihar rule number one: diet is cancelled, Sel Roti is doubled. Shubh Tihar!",
  "भाइटीकाको हार्दिक शुभकामना! दिदीभाइको माया सधैं यसरी नै रहोस्।",
  "May Goddess Lakshmi fill your home with joy, health and prosperity. 🙏",
  "लक्ष्मी माताको कृपाले तपाईंको घर सुख, शान्ति र समृद्धिले भरिइरहोस्।",
  "May all your worries pop like a Ladi and leave only sparkle behind.",
  "सबै आफन्त र साथीभाइलाई दीपावली तथा तिहारको शुभकामना! ❤️",
  "Warm wishes to you and your family from Shuvam: more lights, more laughter, more mithai."
];
let lw = -1;
$("#wg").onclick = () => {
  let i; do i = Math.random() * WISHES.length | 0; while (i === lw); lw = i;
  $("#wt").textContent = WISHES[i]; const r = $("#wt").getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 20, 18, rnd(20, 50));
};
$("#wc").onclick = async () => {
  const t = $("#wt").textContent;
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const a = document.createElement("textarea"); a.value = t; document.body.append(a); a.select(); try { document.execCommand("copy"); } catch (_) {} a.remove(); }
  toast("Wish copied. Share the light!");
};

/* ---------- Navigation & replay ---------- */
$("#enter").onclick = () => { fire(3); setTimeout(() => $("#pataka").scrollIntoView({ behavior: "smooth" }), 700); };
$("#replay").onclick = () => {
  scrollTo({ top: 0, behavior: "smooth" });
  document.querySelectorAll(".diya").forEach(d => d.classList.remove("lit")); dl = 0; $("#dc").textContent = 0;
  $("#again").onclick(); sc = 0; $("#sc").textContent = 0; lit = 0; $("#fc").textContent = 0;
  setTimeout(() => { for (let j = 0; j < 8; j++) setTimeout(() => burst(rnd(W * .15, W * .85), rnd(H * .15, H * .5), 60), j * 300); confetti(W / 2, H * .6); }, 500);
  toast("Celebration restarted!");
};

/* ---------- Background song (starts only when the button is tapped) ---------- */
const SONG_URL = "https://raw.githubusercontent.com/shuvamx12/Audio/main/TANKA%20BUDATHOKI%20S%20DEUSIRE%20SONG%20%E0%A4%8F%20%E0%A4%AD%E0%A4%A8%20%E0%A4%AD%E0%A4%A8%20%E0%A4%AD%E0%A4%BE%E0%A4%87%20%E0%A4%B9%E0%A5%8B%20%E0%A4%A6%E0%A5%87%E0%A4%89%E0%A4%B8%E0%A5%80%20%E0%A4%B0%E0%A5%87%20TIHAR%20SONG%20A%20VANA%20VAN%20AVAI%20HO%20%281%29.mp3";
const song = $("#song"); song.volume = .6;
const bgm = $("#bgm");
const setBgm = p => { bgm.classList.toggle("on", p); bgm.textContent = p ? "♫ Pause Song" : "♫ Tihar Song"; bgm.setAttribute("aria-pressed", p); };
song.onplay = () => setBgm(true); song.onpause = () => setBgm(false);
bgm.onclick = async () => {
  if (!song.src) song.src = SONG_URL;
  if (!song.paused) return song.pause();
  try { song.muted = !on; await song.play(); }
  catch (_) { toast("Couldn’t play the song. Check the file link."); }
};

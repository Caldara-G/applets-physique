"use strict";
/* ======================================================================
   thermo_ph.js — diagrammes enthalpiques (P, h) de fluides réels
   MP* Malherbe
   - données: donnees_ph/<fluide>.js (tables isobares calculées avec CoolProp,
     état de référence IIR pour les frigorigènes: h = 200 kJ/kg et
     s = 1 kJ/(kg.K) pour le liquide saturant à 0 °C)
   - moteur: état (T, s, v, x) en un point (P, h), fonctions inverses
   - dessin: diagramme gradué (P en échelle log), cloche, isothermes,
     isotitres, isentropes, isochores, avec zoom et déplacement
   Unités: P en bar, h en kJ/kg, T en °C, s en kJ/(kg.K), v en m³/kg
   ====================================================================== */

const PH = (() => {

  const FLUIDES = [
    ["R134a", "R134a (tétrafluoroéthane)"],
    ["R600a", "R600a (isobutane)"],
    ["R290", "R290 (propane)"],
    ["R22", "R22 (chlorodifluorométhane)"],
    ["R717", "R717 (ammoniac)"],
    ["R1234yf", "R1234yf"],
    ["R744", "R744 (dioxyde de carbone)"],
    ["R718", "R718 (eau)"],
  ];

  // ------------------------------------------------------------ chargement
  const attente = {};
  function charger(cle, rappel) {
    const D = window.PH_DONNEES && window.PH_DONNEES[cle];
    if (D) { rappel(fluide(D)); return; }
    if (attente[cle]) { attente[cle].push(rappel); return; }
    attente[cle] = [rappel];
    const s = document.createElement("script");
    const base = (document.currentScript && document.currentScript.src) || "";
    s.src = "donnees_ph/" + cle + ".js";
    s.onload = () => { const F = fluide(window.PH_DONNEES[cle]); attente[cle].forEach((r) => r(F)); delete attente[cle]; };
    s.onerror = () => { alert("Impossible de charger les données du fluide " + cle); };
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------ outils
  function interpTab(tab, h, col) {   // tab: [[h, T, s, v], ...] trié en h
    const n = tab.length;
    if (n === 0) return NaN;
    if (h <= tab[0][0]) {
      if (n < 2) return tab[0][col];
      const a = tab[0], b = tab[1], t = (h - a[0]) / (b[0] - a[0]);
      return a[col] + t * (b[col] - a[col]);
    }
    if (h >= tab[n - 1][0]) {
      const a = tab[n - 2], b = tab[n - 1], t = (h - a[0]) / (b[0] - a[0]);
      return a[col] + t * (b[col] - a[col]);
    }
    let i = 0, j = n - 1;
    while (j - i > 1) { const m = (i + j) >> 1; if (tab[m][0] <= h) i = m; else j = m; }
    const a = tab[i], b = tab[j], t = (h - a[0]) / (b[0] - a[0]);
    return a[col] + t * (b[col] - a[col]);
  }
  function lin(a, b, t) { return a + (b - a) * t; }

  // ------------------------------------------------------------ fluide
  function fluide(D) {
    const iso = D.iso;
    const lnP = iso.map((e) => Math.log(e.P));
    const sous = iso.filter((e) => e.sat);         // isobares sous-critiques
    const lnPs = sous.map((e) => Math.log(e.P));
    const Pc = D.Pc, hmin = D.hmin, hmax = D.hmax;
    const ext = Math.max(5, 0.02 * (hmax - hmin));

    function evalIsobare(e, h) {
      if (e.sat) {
        const [Ts, hL, hV, sL, sV, vL, vV] = e.sat;
        if (h <= hL) return { T: interpTab(e.L, h, 1), s: interpTab(e.L, h, 2), v: interpTab(e.L, h, 3) };
        if (h >= hV) return { T: interpTab(e.V, h, 1), s: interpTab(e.V, h, 2), v: interpTab(e.V, h, 3) };
        const x = (h - hL) / (hV - hL);
        return { T: Ts, s: lin(sL, sV, x), v: lin(vL, vV, x) };
      }
      return { T: interpTab(e.S, h, 1), s: interpTab(e.S, h, 2), v: interpTab(e.S, h, 3) };
    }
    function indice(l, tab) {
      if (l <= tab[0]) return [0, 0];
      const n = tab.length;
      if (l >= tab[n - 1]) return [n - 2, 1];
      let i = 0, j = n - 1;
      while (j - i > 1) { const m = (i + j) >> 1; if (tab[m] <= l) i = m; else j = m; }
      return [i, (l - tab[i]) / (tab[i + 1] - tab[i])];
    }

    /** Saturation à la pression P (null au-delà du point critique). */
    function sat(P) {
      if (P >= sous[sous.length - 1].P) {
        if (P >= Pc) return null;
        // entre la dernière isobare tabulée et le point critique
        const e = sous[sous.length - 1], t = (Math.log(P) - Math.log(e.P)) / (Math.log(Pc) - Math.log(e.P));
        const [Ts, hL, hV, sL, sV, vL, vV] = e.sat;
        const r = Math.sqrt(1 - t);   // la cloche se referme en racine
        return { P, T: lin(Ts, D.Tc, t), hL: D.hc + (hL - D.hc) * r, hV: D.hc + (hV - D.hc) * r,
          sL: D.sc + (sL - D.sc) * r, sV: D.sc + (sV - D.sc) * r, vL: D.vc + (vL - D.vc) * r, vV: D.vc + (vV - D.vc) * r };
      }
      const [i, t] = indice(Math.log(P), lnPs);
      const a = sous[i].sat, b = sous[i + 1].sat;
      return { P, T: lin(a[0], b[0], t), hL: lin(a[1], b[1], t), hV: lin(a[2], b[2], t),
        sL: lin(a[3], b[3], t), sV: lin(a[4], b[4], t), vL: lin(a[5], b[5], t), vV: lin(a[6], b[6], t) };
    }

    /** Pression de saturation (bar) à la température T (°C). */
    function Psat(T) {
      if (T >= D.Tc) return NaN;
      const n = sous.length;
      if (T <= sous[0].sat[0]) return sous[0].P;
      if (T >= sous[n - 1].sat[0]) {
        const e = sous[n - 1], t = (T - e.sat[0]) / (D.Tc - e.sat[0]);
        return Math.exp(lin(Math.log(e.P), Math.log(Pc), t));
      }
      let i = 0, j = n - 1;
      while (j - i > 1) { const m = (i + j) >> 1; if (sous[m].sat[0] <= T) i = m; else j = m; }
      const t = (T - sous[i].sat[0]) / (sous[j].sat[0] - sous[i].sat[0]);
      return Math.exp(lin(lnPs[i], lnPs[j], t));
    }

    /** État au point (P, h). */
    function etat(P, h) {
      const l = Math.log(P);
      const [i, t] = indice(l, lnP);
      const a = iso[i], b = iso[i + 1];
      const S = P < Pc ? sat(P) : null;
      let r;
      if (S && h > S.hL && h < S.hV) {
        const x = (h - S.hL) / (S.hV - S.hL);
        return { P, h, T: S.T, s: lin(S.sL, S.sV, x), v: lin(S.vL, S.vV, x), x, zone: "LV" };
      }
      if (S && a.sat && b.sat) {
        if (h <= S.hL) {
          const u = (h - hmin) / (S.hL - hmin);
          const ra = evalIsobare(a, hmin + u * (a.sat[1] - hmin)), rb = evalIsobare(b, hmin + u * (b.sat[1] - hmin));
          r = { T: lin(ra.T, rb.T, t), s: lin(ra.s, rb.s, t), v: lin(ra.v, rb.v, t) };
          return { P, h, ...r, x: 0, zone: "L" };
        }
        const u = (h - S.hV) / (hmax - S.hV);
        const ra = evalIsobare(a, a.sat[2] + u * (hmax - a.sat[2])), rb = evalIsobare(b, b.sat[2] + u * (hmax - b.sat[2]));
        r = { T: lin(ra.T, rb.T, t), s: lin(ra.s, rb.s, t), v: lin(ra.v, rb.v, t) };
        return { P, h, ...r, x: 1, zone: "V" };
      }
      const ra = evalIsobare(a, h), rb = evalIsobare(b, h);
      r = { T: lin(ra.T, rb.T, t), s: lin(ra.s, rb.s, t), v: Math.exp(lin(Math.log(ra.v), Math.log(rb.v), t)) };
      let zone = "S", x = null;
      if (S) { if (h <= S.hL) { zone = "L"; x = 0; } else { zone = "V"; x = 1; } }
      else if (r.T < D.Tc) zone = "L";
      return { P, h, ...r, x, zone };
    }

    /** h tel que la grandeur g (« T », « s » ou « v ») vaille val à la pression P. */
    function hP(g, P, val) {
      let a = hmin - ext, b = hmax + ext;
      const S = P < Pc ? sat(P) : null;
      if (S && g === "T") {
        if (Math.abs(val - S.T) < 1e-9) return NaN;
        if (val < S.T) b = S.hL; else a = S.hV;
      }
      const f = (h) => { const e = etat(P, h); return g === "v" ? Math.log(e.v) : e[g]; };
      const cible = g === "v" ? Math.log(val) : val;
      let fa = f(a) - cible, fb = f(b) - cible;
      if (!(fa * fb <= 0)) return NaN;
      for (let k = 0; k < 60; k++) {
        const m = 0.5 * (a + b), fm = f(m) - cible;
        if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
        if (b - a < 1e-4) break;
      }
      return 0.5 * (a + b);
    }
    const hPT = (P, T) => hP("T", P, T);
    const hPs = (P, s) => hP("s", P, s);
    const hPv = (P, v) => hP("v", P, v);
    function hPx(P, x) { const S = sat(P); return S ? lin(S.hL, S.hV, x) : NaN; }

    return { cle: D.cle, nom: D.nom, D, Pc, Tc: D.Tc, hc: D.hc, sc: D.sc, vc: D.vc,
      Pmin: D.Pmin, Pmax: D.Pmax, hmin, hmax, Tmin: D.Tmin, Tmax: D.Tmax,
      etat, sat, Psat, hPT, hPs, hPv, hPx, courbes: {} };
  }

  // ------------------------------------------------------------ réseaux de courbes
  function pasJoli(brut) {
    const p = Math.pow(10, Math.floor(Math.log10(brut))), r = brut / p;
    return (r < 1.5 ? 1 : r < 2.25 ? 2 : r < 3.5 ? 2.5 : r < 7.5 ? 5 : 10) * p;
  }
  const DENSITES = { normale: 1, dense: 2, "très dense": 4 };

  /** Niveaux des courbes pour une densité donnée. */
  function niveaux(F, densite) {
    const k = DENSITES[densite] || 1;
    const S0 = F.sat(F.Pmin);
    // isothermes: pas adapté à l'étendue du domaine
    const nice = (r) => [1, 2, 5, 10, 20, 25, 50, 100].find((c) => c >= r * 0.8) || 100;
    const pT = nice((F.Tmax - F.Tmin) / (26 * k)), T = [];
    for (let t = Math.ceil(F.Tmin / pT) * pT; t <= F.Tmax + 1e-9; t += pT) T.push(+t.toFixed(6));
    T.etiq = nice((F.Tmax - F.Tmin) / 26);
    // isentropes: de s_L(Pmin) à s(Pmin, hmax)
    const sa = F.etat(F.Pmax, F.hmin).s, sb = F.etat(F.Pmin, F.hmax).s;
    const pS = pasJoli((sb - sa) / (22 * k));
    const s = [];
    for (let v = Math.ceil(sa / pS) * pS; v <= sb; v += pS) s.push(+v.toFixed(8));
    // isochores (progression géométrique, uniquement v > v_c)
    const mant = k === 1 ? [1, 2, 5] : k === 2 ? [1, 1.5, 2, 3, 5, 7] : [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
    const vmax = F.etat(F.Pmin, F.hmax).v, v = [];
    for (let e = Math.floor(Math.log10(F.vc)); e <= Math.ceil(Math.log10(vmax)); e++)
      for (const m of mant) { const val = m * Math.pow(10, e); if (val > F.vc * 1.05 && val < vmax) v.push(+val.toPrecision(4)); }
    // isotitres
    const px = k === 1 ? 0.1 : k === 2 ? 0.05 : 0.02, x = [];
    for (let i = 1; i * px < 1 - 1e-9; i++) x.push(+(i * px).toFixed(4));
    return { T, s, v, x };
  }

  /** Points (h, P) d'une courbe; les points hors domaine coupent la courbe. */
  function courbe(F, g, val) {
    const cache = F.courbes, cle = g + ":" + val;
    if (cache[cle]) return cache[cle];
    const N = 240, l0 = Math.log(F.Pmin), l1 = Math.log(F.Pmax);
    const tronc = []; let cur = [];
    const ferme = () => { if (cur.length > 1) tronc.push(cur); cur = []; };
    if (g === "x") {
      const Pfin = F.Pc;
      for (let i = 0; i <= N; i++) {
        const P = Math.exp(lin(l0, Math.log(Pfin), i / N));
        const h = F.hPx(P, val); if (isFinite(h)) cur.push([h, P]);
      }
      cur.push([F.hc, F.Pc]); ferme();
    } else if (g === "T" && val < F.Tc) {
      const Ps = F.Psat(val), S = F.sat(Ps);
      // branche liquide (P > Psat), du haut vers Psat
      for (let i = 0; i <= N; i++) {
        const P = Math.exp(lin(l1, Math.log(Ps), i / N));
        if (P <= Ps * 1.0005) break;
        const h = F.hPT(P, val); if (isFinite(h) && h >= F.hmin - 1) cur.push([h, P]); else ferme();
      }
      cur.push([S.hL, Ps]); ferme();
      const pal = [[S.hL, Ps], [S.hV, Ps]]; pal.palier = true; tronc.push(pal);
      cur.push([S.hV, Ps]);
      for (let i = 1; i <= N; i++) {
        const P = Math.exp(lin(Math.log(Ps), l0, i / N));
        const h = F.hPT(P, val); if (isFinite(h) && h <= F.hmax + 1) cur.push([h, P]); else ferme();
      }
      ferme();
    } else {
      for (let i = 0; i <= N; i++) {
        const P = Math.exp(lin(l1, l0, i / N));
        const h = g === "T" ? F.hPT(P, val) : g === "s" ? F.hPs(P, val) : F.hPv(P, val);
        // comme sur les diagrammes usuels: pas d'isentrope dans le liquide
        const liq = g === "s" && (P < F.Pc ? h < F.sat(P).hL - 1e-6 : F.etat(P, h).T < F.Tc);
        if (isFinite(h) && h >= F.hmin - 1 && h <= F.hmax + 1 && !liq) cur.push([h, P]); else ferme();
      }
      ferme();
    }
    cache[cle] = tronc;
    return tronc;
  }

  function cloche(F) {
    if (F.courbes._cloche) return F.courbes._cloche;
    const G = [], Dr = [], N = 300, l0 = Math.log(F.Pmin), l1 = Math.log(F.Pc);
    for (let i = 0; i < N; i++) {
      const t = 1 - Math.pow(1 - i / N, 2);
      const S = F.sat(Math.exp(lin(l0, l1, t)));
      if (S) { G.push([S.hL, S.P]); Dr.push([S.hV, S.P]); }
    }
    G.push([F.hc, F.Pc]); Dr.push([F.hc, F.Pc]);
    return (F.courbes._cloche = { G, D: Dr });
  }

  // ------------------------------------------------------------ texte
  function fmt(v, d) {
    if (!isFinite(v)) return "—";
    let s = v.toFixed(d);
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return s.replace(".", ",").replace("-", "−");
  }
  function fmtS(v, n) {   // n chiffres significatifs, virgule décimale
    if (!isFinite(v)) return "—";
    if (v === 0) return "0";
    const d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v))));
    return fmt(v, Math.min(d, 6));
  }
  let POSEES = null, ETIQ = [];   // étiquettes déjà posées (évite les chevauchements)
  function etiquette(ctx, x, y, t, coul, police, angle) {
    if (POSEES) {
      ctx.save(); ctx.font = police || "10.5px system-ui"; const w = ctx.measureText(t).width + 4; ctx.restore();
      const c = Math.abs(Math.cos(angle || 0)), sn = Math.abs(Math.sin(angle || 0));
      const bw = (w * c + 14 * sn) / 2, bh = (w * sn + 14 * c) / 2;
      if (POSEES.some((r) => Math.abs(r[0] - x) < r[2] + bw && Math.abs(r[1] - y) < r[3] + bh)) return;
      POSEES.push([x, y, bw, bh]);
    }
    ctx.save(); ctx.translate(x, y); if (angle) ctx.rotate(angle);
    ctx.font = police || "10.5px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(t).width;
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(-w / 2 - 2, -7, w + 4, 14);
    ctx.fillStyle = coul; ctx.fillText(t, 0, 0.5); ctx.restore();
  }

  // ------------------------------------------------------------ vue
  const COUL = { T: "#d32f2f", s: "#1d4fb0", v: "#2e7d32", x: "#7a8a2e", cloche: "#111", grille: "#e3e6ea", grille2: "#f1f2f4" };

  /** Vue d'un diagramme: domaine affiché, conversions, dessin, zoom. */
  function Vue(F) {
    const V = { F, h0: F.hmin, h1: F.hmax, l0: Math.log(F.Pmin), l1: Math.log(F.Pmax), rect: { x: 0, y: 0, w: 1, h: 1 },
      marges: { g: 58, d: 14, h: 12, b: 40 },
      aff: { T: true, x: true, s: false, v: false }, densite: "dense", fond: null, cleFond: "" };
    V.reinit = () => { V.h0 = F.hmin; V.h1 = F.hmax; V.l0 = Math.log(F.Pmin); V.l1 = Math.log(F.Pmax); };
    V.cadrer = (h0, h1, P0, P1) => { V.h0 = h0; V.h1 = h1; V.l0 = Math.log(P0); V.l1 = Math.log(P1); };
    V.zone = () => {
      const r = V.rect, m = V.marges;
      return { x0: r.x + m.g, x1: r.x + r.w - m.d, y0: r.y + m.h, y1: r.y + r.h - m.b };
    };
    V.X = (h) => { const z = V.zone(); return z.x0 + (h - V.h0) / (V.h1 - V.h0) * (z.x1 - z.x0); };
    V.Y = (P) => { const z = V.zone(); return z.y1 - (Math.log(P) - V.l0) / (V.l1 - V.l0) * (z.y1 - z.y0); };
    V.Q = (h, P) => [V.X(h), V.Y(P)];
    V.inv = (px, py) => {
      const z = V.zone();
      return { h: V.h0 + (px - z.x0) / (z.x1 - z.x0) * (V.h1 - V.h0),
        P: Math.exp(V.l0 + (z.y1 - py) / (z.y1 - z.y0) * (V.l1 - V.l0)) };
    };
    V.dedans = (px, py) => { const z = V.zone(); return px >= z.x0 && px <= z.x1 && py >= z.y0 && py <= z.y1; };
    V.zoom = (px, py, f) => {
      const { h, P } = V.inv(px, py), l = Math.log(P);
      let nh0 = h + (V.h0 - h) * f, nh1 = h + (V.h1 - h) * f, nl0 = l + (V.l0 - l) * f, nl1 = l + (V.l1 - l) * f;
      const Lh = F.hmax - F.hmin + 200, Ll = Math.log(F.Pmax / F.Pmin) + 1;
      if (nh1 - nh0 > Lh || nl1 - nl0 > Ll) { V.reinit(); return; }
      if (nh1 - nh0 < 2 || nl1 - nl0 < 0.005) return;
      V.h0 = nh0; V.h1 = nh1; V.l0 = nl0; V.l1 = nl1;
    };
    V.deplacer = (dx, dy) => {
      const z = V.zone();
      const dh = -dx / (z.x1 - z.x0) * (V.h1 - V.h0), dl = dy / (z.y1 - z.y0) * (V.l1 - V.l0);
      V.h0 += dh; V.h1 += dh; V.l0 += dl; V.l1 += dl;
    };

    /** Trace une suite de points (h, P) dans le domaine. */
    V.trace = (ctx, pts, coul, larg, tirets) => {
      ctx.save(); ctx.strokeStyle = coul; ctx.lineWidth = larg; ctx.setLineDash(tirets || []);
      ctx.beginPath(); pts.forEach(([h, P], i) => { const [a, b] = V.Q(h, P); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
      ctx.stroke(); ctx.restore();
    };

    function clip(ctx) { const z = V.zone(); ctx.beginPath(); ctx.rect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.clip(); }

    function graduations(ctx) {
      const z = V.zone();
      ctx.save(); ctx.font = "11px system-ui"; ctx.fillStyle = "#333"; ctx.textAlign = "center";
      // h
      const pas = pasJoli((V.h1 - V.h0) / Math.max(4, (z.x1 - z.x0) / 70)), pas2 = pas / 5;
      for (let h = Math.ceil(V.h0 / pas2) * pas2; h <= V.h1; h += pas2) {
        const x = V.X(h), maj = Math.abs(h / pas - Math.round(h / pas)) < 1e-6;
        ctx.strokeStyle = maj ? COUL.grille : COUL.grille2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, z.y0); ctx.lineTo(x, z.y1); ctx.stroke();
        if (maj) { ctx.fillText(fmt(h, 0), x, z.y1 + 14); }
      }
      // P (log)
      const dec0 = Math.floor(V.l0 / Math.LN10) - 1, dec1 = Math.ceil(V.l1 / Math.LN10) + 1;
      const pxDec = (z.y1 - z.y0) / ((V.l1 - V.l0) / Math.LN10);
      const lab = pxDec > 260 ? [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9] : pxDec > 130 ? [1, 2, 3, 4, 5, 6, 8] : pxDec > 60 ? [1, 2, 5] : [1];
      const lignes = pxDec > 200 ? [1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let d = dec0; d <= dec1; d++) for (const m of lignes) {
        const P = m * Math.pow(10, d), y = V.Y(P);
        if (y < z.y0 - 0.5 || y > z.y1 + 0.5) continue;
        ctx.strokeStyle = m === 1 ? "#cfd4da" : lab.includes(m) ? COUL.grille : COUL.grille2;
        ctx.beginPath(); ctx.moveTo(z.x0, y); ctx.lineTo(z.x1, y); ctx.stroke();
        if (lab.includes(m)) ctx.fillText(fmtS(P, 3), z.x0 - 5, y);
      }
      ctx.restore();
      // titres
      ctx.save(); ctx.fillStyle = "#222"; ctx.font = "12px system-ui"; ctx.textAlign = "right";
      ctx.fillText("h (kJ/kg)", z.x1, z.y1 + 30);
      ctx.translate(z.x0 - 44, z.y0); ctx.rotate(-Math.PI / 2); ctx.fillText("P (bar)", 0, 0); ctx.restore();
    }

    /** Position d'étiquette: point de la courbe le plus proche d'une droite repère. */
    function poseEtiquette(pts, mode) {
      const z = V.zone(); let best = null, db = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const [a, b] = V.Q(pts[i][0], pts[i][1]);
        if (a < z.x0 + 14 || a > z.x1 - 14 || b < z.y0 + 8 || b > z.y1 - 8) continue;
        let d;
        if (mode === "bas") d = Math.abs(b - (z.y1 - 0.1 * (z.y1 - z.y0))) - 0.001 * a;
        else if (mode === "haut") d = Math.abs(b - (z.y0 + 0.12 * (z.y1 - z.y0)));
        else if (mode === "droite") d = Math.abs(a - (z.x1 - 0.06 * (z.x1 - z.x0)));
        else d = Math.abs(b - (z.y1 - 0.04 * (z.y1 - z.y0)));
        if (d < db) { db = d; best = i; }
      }
      if (best === null) return null;
      const i0 = Math.max(0, best - 2), i1 = Math.min(pts.length - 1, best + 2);
      const [a0, b0] = V.Q(pts[i0][0], pts[i0][1]), [a1, b1] = V.Q(pts[i1][0], pts[i1][1]);
      let ang = Math.atan2(b1 - b0, a1 - a0); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      return [...V.Q(pts[best][0], pts[best][1]), ang];
    }

    function reseau(ctx, g, valeurs, coul, larg, texte, mode, garder) {
      const k = DENSITES[V.densite];
      ctx.save(); ctx.globalAlpha = k === 1 ? 0.8 : k === 2 ? 0.6 : 0.45;
      valeurs.forEach((val) => courbe(F, g, val).forEach((pts) => {
        if (pts.palier) { ctx.save(); ctx.globalAlpha = 0.3; V.trace(ctx, pts, coul, larg); ctx.restore(); }
        else V.trace(ctx, pts, coul, larg);
      }));
      ctx.restore();
      ETIQ.push(() => {
      valeurs.forEach((val, i) => {
        if (!garder(val, i)) return;
        const tr = courbe(F, g, val), pr = tr.filter((t) => !t.palier);
        if (g === "T" && pr.length > 1) {   // branche liquide: étiquette en haut
          const e = poseEtiquette(pr[0], "haut"); if (e) etiquette(ctx, e[0], e[1], texte(val), coul, "10.5px system-ui", e[2]);
        }
        (g === "T" ? pr.slice(-1) : pr.slice(0, 1)).forEach((pts) => {
          const e = poseEtiquette(pts, mode); if (e) etiquette(ctx, e[0], e[1], texte(val), coul, "10.5px system-ui", e[2]);
        });
      });
      });
    }

    /** Dessine le fond (diagramme sans cycle), mis en cache tant que rien ne change. */
    V.dessinerFond = (ctx, W, H) => {
      const cle = [F.cle, V.h0, V.h1, V.l0, V.l1, V.rect.x, V.rect.y, V.rect.w, V.rect.h, JSON.stringify(V.aff), V.densite, W, H].join("|");
      const dpr = window.devicePixelRatio || 1;
      if (!V.fond || V.cleFond !== cle) {
        const c = V.fond || document.createElement("canvas");
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
        const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        dessinerDiagramme(g);
        V.fond = c; V.cleFond = cle;
      }
      ctx.drawImage(V.fond, 0, 0, W, H);
    };

    function dessinerDiagramme(ctx) {
      POSEES = []; ETIQ = [];
      const z = V.zone(), N = niveaux(F, V.densite), k = DENSITES[V.densite];
      ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.restore();
      graduations(ctx);
      ctx.save(); clip(ctx);
      const C = cloche(F);
      // intérieur de la cloche
      ctx.save(); ctx.beginPath();
      [...C.G, ...C.D.slice().reverse()].forEach(([h, P], i) => { const [a, b] = V.Q(h, P); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
      ctx.closePath(); ctx.fillStyle = "rgba(225,236,250,0.45)"; ctx.fill(); ctx.restore();
      const mult = (a, m) => Math.abs(a / m - Math.round(a / m)) < 1e-6;
      if (V.aff.T) reseau(ctx, "T", N.T, COUL.T, 0.8, (T) => fmt(T, 0) + " °C", "bas", (T) => mult(T, N.T.etiq));
      if (V.aff.x) reseau(ctx, "x", N.x, COUL.x, 0.7, (x) => "x=" + fmt(x, 1), "titre", (x) => mult(x, 0.1));
      if (V.aff.s) reseau(ctx, "s", N.s, COUL.s, 0.7, (s) => "s=" + fmtS(s, 3), "haut", (s, i) => i % k === 0);
      if (V.aff.v) reseau(ctx, "v", N.v, COUL.v, 0.7, (v) => "v=" + fmtS(v, 2), "droite",
        (v) => k === 1 || [1, 2, 5].includes(+(v / Math.pow(10, Math.floor(Math.log10(v) + 1e-9))).toPrecision(3)));
      ETIQ.forEach((f) => f());
      // cloche et point critique
      V.trace(ctx, C.G, COUL.cloche, 2); V.trace(ctx, C.D, COUL.cloche, 2);
      const [cx, cy] = V.Q(F.hc, F.Pc);
      ctx.fillStyle = COUL.cloche; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.strokeStyle = "#333"; ctx.lineWidth = 1.2; ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.restore();
      ctx.save(); ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#222"; ctx.textAlign = "left";
      ctx.fillText(F.nom, z.x0 + 8, z.y0 + 16); ctx.restore();
      POSEES = null;
    }

    return V;
  }

  return { FLUIDES, charger, Vue, fmt, fmtS, niveaux, courbe, COUL, DENSITES };
})();

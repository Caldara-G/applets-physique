/* complements.js — cadre commun des applets de la page Compléments (MP* Malherbe).
   Construit la zone graphique (canvas plein cadre, HUD, légende, filigrane) et le panneau
   de commandes, et fournit les petits outils d'interface et la boucle d'animation.
   Usage :  const C = Cadre("Titre", "Nom court");  ...  C.demarrer(pas, dessiner); */
"use strict";
function Cadre(titre, nomCourt) {
  document.documentElement.setAttribute("data-domaine", "complements");
  function el(tag, at, parent) {
    const e = document.createElement(tag);
    if (at) for (const k in at) {
      if (k === "text") e.textContent = at[k];
      else if (k === "html") e.innerHTML = at[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), at[k]);
      else e.setAttribute(k, at[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  const app = el("div", { id: "app" }, document.body);
  const principal = el("div", { id: "principal" }, app);
  const zone = el("div", { class: "zone", id: "zone", "data-mt-nom": nomCourt || titre }, principal);
  const canvas = el("canvas", { id: "ecran" }, zone);
  const hud = el("div", { id: "hud" }, zone);
  const legende = el("div", { id: "legende" }, zone);
  el("div", { class: "filigrane", text: "MP* Malherbe" }, zone);
  const pan = el("div", { id: "panneau" }, app);
  const haut = el("div", { class: "haut" }, pan);
  el("a", { class: "retour", href: "complements.html", text: "← Compléments" }, haut);
  el("span", { class: "etiquette", text: "MP* Malherbe" }, haut);
  el("h1", { text: titre }, pan);
  document.title = titre + " — MP* Malherbe";

  const ctx = canvas.getContext("2d");
  const C = { el, zone, canvas, ctx, pan, hud, legende, W: 1, H: 1, dpr: 1, lecture: true, vitesse: 1 };
  const redims = [];
  C.surRedim = f => { redims.push(f); };
  function ajuster() {
    const r = zone.getBoundingClientRect();
    C.dpr = Math.min(window.devicePixelRatio || 1, 2);
    C.W = Math.max(50, r.width); C.H = Math.max(50, r.height);
    canvas.width = Math.round(C.W * C.dpr); canvas.height = Math.round(C.H * C.dpr);
    ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, C.W, C.H);
    for (const f of redims) f();
  }
  window.addEventListener("resize", ajuster);
  document.addEventListener("fullscreenchange", () => setTimeout(ajuster, 50));
  C.ajuster = ajuster;

  // ---------------------------------------------------------------- outils d'interface
  C.section = (t, parent) => { const s = el("div", { class: "section" }, parent || pan); if (t) el("div", { class: "titre", text: t }, s); return s; };
  C.texte = (parent, html) => el("div", { class: "texte", html }, parent);
  C.note = (parent, html) => el("div", { class: "note", html }, parent);
  C.curseur = (parent, lab, obj, cle, min, max, pas, fmt, apres) => {
    const c = el("div", { class: "curseur" }, parent);
    const t = el("div", { class: "tete" }, c);
    el("span", { html: lab }, t);
    const v = el("span", { class: "valeur" }, t);
    const r = el("input", { type: "range", min, max, step: pas }, c);
    r.value = obj[cle];
    const maj = () => { v.innerHTML = fmt(obj[cle]); };
    r.addEventListener("input", () => { obj[cle] = parseFloat(r.value); maj(); if (apres) apres(); });
    maj();
    r.fixer = x => { obj[cle] = x; r.value = x; maj(); };
    return r;
  };
  C.caseC = (parent, lab, obj, cle, apres) => {
    const l = el("label", { class: "choix" }, parent);
    const i = el("input", { type: "checkbox" }, l); i.checked = obj[cle];
    el("span", { html: lab }, l);
    i.addEventListener("change", () => { obj[cle] = i.checked; if (apres) apres(); });
    return i;
  };
  C.radios = (parent, options, obj, cle, apres) => {
    const nom = "r" + Math.random().toString(36).slice(2);
    const rs = {};
    for (const [k, lab] of options) {
      const l = el("label", { class: "choix" }, parent);
      const r = el("input", { type: "radio", name: nom }, l); r.checked = obj[cle] === k;
      el("span", { html: lab }, l);
      r.addEventListener("change", () => { if (r.checked) { obj[cle] = k; if (apres) apres(); } });
      rs[k] = r;
    }
    rs.fixer = k => { obj[cle] = k; if (rs[k]) rs[k].checked = true; };
    return rs;
  };
  C.select = (parent, options, obj, cle, apres) => {
    const s = el("select", {}, parent);
    for (const [k, lab] of options) { const o = el("option", { value: k, text: lab }, s); if (obj[cle] === k) o.selected = true; }
    s.addEventListener("change", () => { obj[cle] = s.value; if (apres) apres(); });
    return s;
  };
  C.boutons = parent => el("div", { class: "boutons" }, parent);
  C.bouton = (parent, texte, f) => el("button", { class: "b", text: texte, onclick: f }, parent);
  C.fr = (x, d) => (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d).replace(".", ",").replace("-", "−");

  C.pleinEcran = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (zone.requestFullscreen) zone.requestFullscreen();
  };
  // section « Temps » standard : lecture/pause, recommencer, plein écran, vitesse
  C.temps = (recommencer, opts) => {
    opts = opts || {};
    const s = C.section("Temps");
    const bt = C.boutons(s);
    const bL = C.bouton(bt, "", () => { C.lecture = !C.lecture; majL(); });
    if (recommencer) C.bouton(bt, "↻ Recommencer", recommencer);
    C.bouton(bt, "⛶ Plein écran", C.pleinEcran);
    function majL() { bL.textContent = C.lecture ? "❚❚ Pause" : "▶ Lecture"; bL.classList.toggle("actif", !C.lecture); }
    majL();
    C.majLecture = majL;
    if (opts.vitesse !== false) C.curseur(s, "Vitesse de la simulation", C, "vitesse", opts.vmin || 0.25, opts.vmax || 4, opts.vpas || 0.25, v => "×" + C.fr(v, 2).replace(/,?0+$/, ""));
    window.addEventListener("keydown", e => {
      if (e.target.tagName === "SELECT" || (e.target.tagName === "INPUT" && !/range|radio|checkbox/.test(e.target.type))) return;
      if (e.key === " ") { e.preventDefault(); C.lecture = !C.lecture; majL(); }
      else if ((e.key === "r" || e.key === "R") && recommencer) recommencer();
      else if (e.key === "f" || e.key === "F") C.pleinEcran();
    });
    C.note(s, "Clavier: espace = pause, R = recommencer, F = plein écran.");
    return s;
  };

  // pointeur en coordonnées CSS de la zone
  C.pointeur = h => {
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let bas = false;
    canvas.addEventListener("pointerdown", e => { bas = true; canvas.setPointerCapture(e.pointerId); canvas.classList.add("tire"); if (h.bas) h.bas(...pos(e), e); });
    canvas.addEventListener("pointermove", e => { if (bas && h.glisse) h.glisse(...pos(e), e); else if (!bas && h.survol) h.survol(...pos(e), e); });
    const fin = e => { if (!bas) return; bas = false; canvas.classList.remove("tire"); if (h.haut) h.haut(...pos(e), e); };
    canvas.addEventListener("pointerup", fin);
    canvas.addEventListener("pointercancel", fin);
    if (h.molette) canvas.addEventListener("wheel", e => { e.preventDefault(); h.molette(e.deltaY, ...pos(e)); }, { passive: false });
    if (h.glisse) canvas.classList.add("prise");
  };

  // estompe l'image (traînées lumineuses)
  C.estomper = a => { ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "rgba(0,0,0," + a + ")"; ctx.fillRect(0, 0, C.W, C.H); };
  C.effacer = () => { ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, C.W, C.H); };
  // point lumineux (halo radial) en mode additif
  C.halo = (x, y, r, couleur, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, couleur); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
  };
  C.rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  };
  C.NEON = ["#ff2bd6", "#00f0ff", "#ffe600", "#39ff14", "#ff6a00", "#8a5cff", "#ff3860", "#00ffa8"];

  // boucle : pas(dt) appelé si lecture, dessiner() à chaque image
  C.demarrer = (pas, dessiner) => {
    ajuster();
    let tPrec = performance.now();
    function boucle(t) {
      const dt = Math.min((t - tPrec) / 1000, 0.05); tPrec = t;
      if (C.lecture && pas) pas(dt * C.vitesse, dt);
      dessiner(dt);
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);
  };
  return C;
}

/* mobile.js — « mode téléphone » commun aux applets MP* Malherbe.
   - Interrupteur « Téléphone »: activé tout seul sur un téléphone, réglable à la main,
     choix mémorisé dans le navigateur.
   - Applets graphiques + panneau (#app, #principal, #panneau): un graphique à la fois
     (onglets), réglages dans un tiroir en bas (portrait) ou à droite (paysage).
   - Autres pages: éléments [data-mt-vue] en onglets, [data-mt-tiroir] dans le tiroir.
   - Cibles tactiles agrandies, pincement à deux doigts sur un graphique = molette (zoom). */
(function () {
  "use strict";
  var CLE = "mpm-mode-tel", CLE_TIROIR = "mpm-tiroir";
  var doc = document, body = doc.body;

  function lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function liste(sel, racine) { return Array.prototype.slice.call((racine || doc).querySelectorAll(sel)); }
  function telephoneProbable() {
    var tactile = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var petit = Math.min(screen.width || 9999, screen.height || 9999);
    return (tactile && petit <= 600) || window.innerWidth <= 600;
  }

  // ------------------------------------------------------------------ styles
  var CSS = [
    /* interrupteur */
    ".mt-bascule{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;line-height:1;color:#3b5f96;",
    "  background:#fff;border:1px solid #c9d3e2;border-radius:12px;padding:2px 3px 2px 7px;cursor:pointer;white-space:nowrap;flex:none}",
    ".mt-bascule:hover{border-color:#7f9fcf}",
    ".mt-bascule svg{width:10px;height:15px;flex:none}",
    ".mt-piste{position:relative;width:28px;height:16px;border-radius:8px;background:#c4cad3;transition:background .15s;flex:none}",
    ".mt-piste i{position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;",
    "  box-shadow:0 1px 2px rgba(0,0,0,.35);transition:left .15s}",
    ".mt-bascule[aria-checked=true] .mt-piste{background:#3b6fb6}",
    ".mt-bascule[aria-checked=true] .mt-piste i{left:14px}",
    ".mt-applet #panneau .haut{gap:6px}",
    ".mt-onglets,.mt-poignee,.mt-ecran,.mt-indic{display:none}",

    /* onglets */
    "body.mode-tel .mt-onglets{display:flex;align-items:center;gap:4px;flex:none;min-width:0}",
    ".mt-defile{display:flex;gap:4px;flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none;padding:1px}",
    ".mt-defile::-webkit-scrollbar{display:none}",
    ".mt-onglet{flex:none;font:inherit;font-size:13px;padding:6px 12px;border:1px solid #b8bec8;background:#f6f7f9;",
    "  border-radius:16px;color:#333;cursor:pointer;white-space:nowrap}",
    ".mt-onglet.mt-actif{background:#3b5f96;border-color:#3b5f96;color:#fff;font-weight:600}",

    /* applets graphiques + panneau */
    "body.mode-tel.mt-applet{overflow:hidden}",
    "body.mode-tel.mt-applet #app{position:fixed;inset:0;display:flex;flex-direction:column;height:auto}",
    "body.mode-tel.mt-applet #principal{flex:1 1 0 !important;height:auto !important;min-height:0;min-width:0;padding:4px;gap:4px}",
    "body.mode-tel.mt-applet .ligne-zones{display:contents}",
    /* graphiques non affichés: gardés à pleine taille (hors de vue) pour que leur tracé reste valide */
    "body.mode-tel.mt-applet .zone:not(.mt-actif){position:absolute !important;left:0;top:0;width:100%;height:100%;",
    "  visibility:hidden;pointer-events:none;z-index:-1}",
    "body.mode-tel.mt-applet .zone.mt-actif{display:block;flex:1 1 0 !important;min-height:0;min-width:0}",

    /* poignée et tiroir (communs) */
    "body.mode-tel .mt-poignee{display:flex;align-items:center;gap:8px;flex:none;height:38px;width:100%;padding:0 12px;",
    "  border:0;border-top:1px solid #d5d9df;background:#f7f8fa;font:inherit;font-size:13.5px;color:#1f3f73;cursor:pointer;text-align:left}",
    ".mt-poignee .mt-lab{font-weight:600}",
    ".mt-poignee .mt-tit{flex:1;min-width:0;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-size:12.5px}",
    ".mt-poignee .mt-fl::before{content:'\\25BE'}",
    "body.mt-ferme .mt-poignee .mt-fl::before{content:'\\25B4'}",
    "body.mode-tel.mt-applet #panneau,body.mode-tel .mt-tiroir{flex:none;width:auto !important;height:46vh;height:46dvh;",
    "  border-left:none;border-top:none;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;",
    "  padding:6px 12px calc(16px + env(safe-area-inset-bottom,0px));background:#fff}",
    "body.mode-tel.mt-ferme.mt-applet #panneau,body.mode-tel.mt-ferme .mt-tiroir{display:none}",
    "@media (orientation:landscape){",
    "  body.mode-tel.mt-applet #app,body.mode-tel .mt-corps{flex-direction:row}",
    "  body.mode-tel.mt-applet #panneau,body.mode-tel .mt-tiroir{height:auto;width:min(370px,46%) !important;",
    "    padding-right:max(12px,env(safe-area-inset-right,0px))}",
    "  body.mode-tel .mt-poignee{width:32px;height:auto;flex-direction:column;justify-content:center;padding:8px 0;",
    "    border-top:0;border-left:1px solid #d5d9df;border-right:1px solid #d5d9df;text-align:center}",
    "  .mt-poignee .mt-lab{writing-mode:vertical-rl;transform:rotate(180deg)}",
    "  .mt-poignee .mt-tit{display:none}",
    "  .mt-poignee .mt-fl::before{content:'\\25B8'}",
    "  body.mt-ferme .mt-poignee .mt-fl::before{content:'\\25C2'}",
    "}",

    /* pages à onglets ([data-mt-vue]) */
    "body.mode-tel.mt-ecran-on{overflow:hidden}",
    "body.mode-tel .mt-ecran{display:flex;flex-direction:column;position:fixed;inset:0;z-index:40;background:#eef0f3;",
    "  padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}",
    ".mt-ecran .mt-onglets{padding:5px 6px;background:#fff;border-bottom:1px solid #d5d9df}",
    ".mt-ecran .mt-bascule .mt-txt{display:none}",
    ".mt-retour{flex:none;font-size:20px;line-height:1;color:#4a6fa5;text-decoration:none;padding:4px 8px 4px 4px}",
    ".mt-ecran .mt-bascule{margin-left:2px}",
    ".mt-corps{flex:1 1 0;min-height:0;display:flex;flex-direction:column}",
    ".mt-cadre{position:relative;flex:1 1 0;min-height:0;min-width:0}",
    ".mt-vues{position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:6px}",
    ".mt-vues>[data-mt-vue]:not(.mt-actif){display:none !important}",
    ".mt-vues>[data-mt-vue]{margin:0 !important;max-width:none !important}",
    ".mt-vues>.vue3d{height:100% !important}",
    ".mt-cadre{container-type:size}",
    ".mt-vues #dessus{width:min(100%,calc(100cqh - 120px));min-width:180px;margin:0 auto}",
    ".mt-filigrane{position:absolute;right:10px;bottom:8px;z-index:5;pointer-events:none;font-size:11.5px;font-weight:700;",
    "  color:#3b5f96;background:rgba(255,255,255,.82);border:1px solid rgba(59,95,150,.35);border-radius:12px;padding:2px 9px}",
    "body.mt-sans-filigrane .mt-filigrane{display:none}",
    "@media (orientation:portrait){body.mode-tel.mt-conseil .mt-indic{display:block}}",
    ".mt-indic{font-size:12.5px;color:#1f3f73;background:#dce7f7;border:1px solid #b8cbe8;border-radius:6px;padding:6px 10px;margin:0 0 6px}",

    /* commandes plus faciles à toucher */
    "body.mode-tel input[type=range]{-webkit-appearance:none;appearance:none;height:30px;background:transparent;margin:0;touch-action:pan-y}",
    "body.mode-tel input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:#c9d3e2}",
    "body.mode-tel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-10px;",
    "  border-radius:50%;background:#3b6fb6;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)}",
    "body.mode-tel input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:#c9d3e2}",
    "body.mode-tel input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#3b6fb6;",
    "  border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)}",
    "body.mode-tel .saisie{font-size:16px;width:80px;padding:3px 5px}",
    "body.mode-tel .pm{width:32px;height:32px;font-size:17px}",
    "body.mode-tel button.b{padding:8px 12px;min-height:36px}",
    "body.mode-tel .choix{padding:5px 0}",
    "body.mode-tel input[type=checkbox],body.mode-tel input[type=radio]{width:18px;height:18px;flex:none}",
    /* Foucault: boutons de la vue 3D en bas, aide « souris » masquée */
    "body.mode-tel .aide3d{display:none}",
    "body.mode-tel .boutons3d{top:auto;bottom:30px;left:8px;right:8px;justify-content:flex-start}",
    "body.mode-tel select,body.mode-tel textarea,body.mode-tel input[type=text],body.mode-tel input[type=number]{font-size:16px}",
    "body.mode-tel .dialogue .boite{min-width:0;width:min(94vw,520px);max-height:88vh;overflow:auto;padding:12px 14px}",
    "body.mode-tel .filigrane{font-size:11px}",
    "body.mode-tel.mt-applet .filigrane{right:8px;bottom:8px;padding:2px 8px}",

    /* pages sans onglets (QCM, incertitudes) */
    "body.mode-tel.mt-page main{padding-top:8px;padding-left:max(8px,env(safe-area-inset-left,0px));padding-right:max(8px,env(safe-area-inset-right,0px))}",
    "body.mode-tel.mt-page .haut h1{font-size:17px}",
    "body.mode-tel .grille,body.mode-tel .mode,body.mode-tel .commandes{grid-template-columns:minmax(0,1fr) !important}"
  ].join("\n");
  var style = el("style");
  style.id = "mt-style";
  style.textContent = CSS;
  doc.head.appendChild(style);

  // ------------------------------------------------------------------ éléments communs
  var applet = !!(doc.getElementById("app") && doc.getElementById("principal") && doc.getElementById("panneau"));
  body.classList.add(applet ? "mt-applet" : "mt-page");
  var titre = (doc.title || "").replace(/\s*[—–-]\s*MP\* Malherbe\s*$/, "");

  var ICONE = '<svg viewBox="0 0 10 15" aria-hidden="true"><rect x="0.75" y="0.75" width="8.5" height="13.5" rx="1.6" ' +
    'fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="11.6" r="0.9" fill="currentColor"/></svg>';
  var bascule = el("button", "mt-bascule", ICONE + '<span class="mt-txt">Téléphone</span><span class="mt-piste"><i></i></span>');
  bascule.type = "button";
  bascule.setAttribute("role", "switch");
  bascule.setAttribute("aria-label", "Mode téléphone");
  bascule.title = "Mode téléphone: un graphique à la fois, réglages dans un tiroir";
  bascule.addEventListener("click", function () {
    var v = !body.classList.contains("mode-tel");
    ecrire(CLE, v ? "1" : "0");
    appliquer(v);
  });

  function poser(e, haut) {      // place l'interrupteur dans un bandeau .haut, avant l'étiquette
    var et = haut.querySelector(".etiquette");
    if (et && et.parentNode === haut) haut.insertBefore(e, et); else haut.appendChild(e);
  }

  var poignee = el("button", "mt-poignee",
    '<span class="mt-fl"></span><span class="mt-lab">Réglages</span><span class="mt-tit"></span>');
  poignee.type = "button";
  poignee.querySelector(".mt-tit").textContent = titre;
  poignee.addEventListener("click", function () {
    var ferme = !body.classList.contains("mt-ferme");
    body.classList.toggle("mt-ferme", ferme);
    ecrire(CLE_TIROIR, ferme ? "0" : "1");
    signaler();
  });
  if (lire(CLE_TIROIR) === "0") body.classList.add("mt-ferme");

  function barreOnglets(noms, choisir) {
    var barre = el("div", "mt-onglets"), defile = el("div", "mt-defile");
    barre.appendChild(defile);
    var boutons = noms.map(function (nom, i) {
      var b = el("button", "mt-onglet");
      b.type = "button";
      b.textContent = nom;
      b.addEventListener("click", function () { choisir(i); });
      defile.appendChild(b);
      return b;
    });
    return { barre: barre, boutons: boutons };
  }
  function marquer(tab, i) {
    tab.forEach(function (e, j) { e.classList.toggle("mt-actif", i === j); });
  }

  // ------------------------------------------------------------------ applets graphiques + panneau
  var zones = [], ongletsA = null;
  if (applet) {
    var app = doc.getElementById("app"), principal = doc.getElementById("principal");
    var panneau = doc.getElementById("panneau");
    zones = liste(".zone", principal);
    var choisirZone = function (i) {
      marquer(zones, i);
      if (ongletsA) marquer(ongletsA.boutons, i);
      signaler();
    };
    if (zones.length > 1) {
      ongletsA = barreOnglets(zones.map(function (z, i) {
        return z.getAttribute("data-mt-nom") || ("Vue " + (i + 1));
      }), choisirZone);
      principal.insertBefore(ongletsA.barre, principal.firstChild);
    }
    app.insertBefore(poignee, panneau);
    marquer(zones, 0);
    if (ongletsA) marquer(ongletsA.boutons, 0);
    var placerA = function (essai) {       // le panneau est construit par le script de l'applet
      var haut = panneau.querySelector(".haut");
      if (haut) poser(bascule, haut);
      else if (essai < 40) setTimeout(function () { placerA(essai + 1); }, 50);
      else panneau.insertBefore(bascule, panneau.firstChild);
    };
    placerA(0);
  }

  // ------------------------------------------------------------------ pages à onglets
  var vues = applet ? [] : liste("[data-mt-vue]");
  var tiroirSrc = applet ? null : doc.querySelector("[data-mt-tiroir]");
  var hautPage = doc.querySelector(".haut");
  if (!applet) {
    if (hautPage) poser(bascule, hautPage); else body.insertBefore(bascule, body.firstChild);
  }
  var ecran = null, places = [], ongletsB = null, vueActive = 0;

  function choisirVue(i) {
    vueActive = i;
    marquer(vues, i);
    if (ongletsB) marquer(ongletsB.boutons, i);
    var v = vues[i];
    body.classList.toggle("mt-conseil", !!(v && v.hasAttribute("data-mt-paysage")));
    body.classList.toggle("mt-sans-filigrane", !!(v && v.querySelector(".filigrane")));
    if (ecran) ecran.querySelector(".mt-vues").scrollTop = 0;
    signaler();
  }
  function deplacer(e, dest) {
    var marque = doc.createComment("mt");
    e.parentNode.insertBefore(marque, e);
    places.push([e, marque]);
    dest.appendChild(e);
  }
  function entrerEcran() {
    if (ecran || !vues.length) return;
    ecran = el("div", "mt-ecran");
    ongletsB = barreOnglets(vues.map(function (v) { return v.getAttribute("data-mt-vue"); }), choisirVue);
    var retour = el("a", "mt-retour", "←");
    retour.href = "index.html";
    retour.title = "Retour au sommaire";
    ongletsB.barre.insertBefore(retour, ongletsB.barre.firstChild);
    ongletsB.barre.appendChild(bascule);
    var corps = el("div", "mt-corps"), cadre = el("div", "mt-cadre"), zv = el("div", "mt-vues");
    zv.appendChild(el("div", "mt-indic", "↻ Tournez le téléphone (mode paysage) pour agrandir l'appareil."));
    vues.forEach(function (v) { deplacer(v, zv); });
    cadre.appendChild(zv);
    cadre.appendChild(el("div", "mt-filigrane", "MP* Malherbe"));
    corps.appendChild(cadre);
    if (tiroirSrc) {
      var tiroir = el("div", "mt-tiroir");
      deplacer(tiroirSrc, tiroir);
      corps.appendChild(poignee);
      corps.appendChild(tiroir);
    }
    ecran.appendChild(ongletsB.barre);
    ecran.appendChild(corps);
    body.appendChild(ecran);
    body.classList.add("mt-ecran-on");
    choisirVue(Math.min(vueActive, vues.length - 1));
  }
  function sortirEcran() {
    if (!ecran) return;
    places.forEach(function (p) { p[1].parentNode.insertBefore(p[0], p[1]); p[1].parentNode.removeChild(p[1]); });
    places = [];
    vues.forEach(function (v) { v.classList.remove("mt-actif"); });
    if (hautPage) poser(bascule, hautPage);
    ecran.parentNode.removeChild(ecran);
    ecran = null;
    ongletsB = null;
    body.classList.remove("mt-ecran-on", "mt-conseil", "mt-sans-filigrane");
  }

  // ------------------------------------------------------------------ bascule
  function signaler() {
    requestAnimationFrame(function () {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new CustomEvent("modetel", { detail: body.classList.contains("mode-tel") }));
    });
  }
  function appliquer(v) {
    body.classList.toggle("mode-tel", v);
    bascule.setAttribute("aria-checked", v ? "true" : "false");
    if (vues.length) { if (v) entrerEcran(); else sortirEcran(); }
    signaler();
  }

  // ------------------------------------------------------------------ pincement → molette
  var pince = null;
  function ecart(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  doc.addEventListener("touchstart", function (e) {
    if (!body.classList.contains("mode-tel") || e.touches.length !== 2) return;
    var cv = e.target && e.target.closest && e.target.closest("canvas");
    if (cv) pince = { cv: cv, d: ecart(e.touches) };
  }, { passive: true, capture: true });
  doc.addEventListener("touchmove", function (e) {
    if (!pince || e.touches.length !== 2) return;
    e.preventDefault();
    var d = ecart(e.touches), r = d / pince.d;
    if (!(d > 0) || Math.abs(Math.log(r)) < 0.02) return;
    pince.d = d;
    pince.cv.dispatchEvent(new WheelEvent("wheel", {
      deltaY: -1000 * Math.log(r), deltaMode: 0, bubbles: true, cancelable: true,
      clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2
    }));
  }, { passive: false, capture: true });
  function finPince(e) { if (!e.touches || e.touches.length < 2) pince = null; }
  doc.addEventListener("touchend", finPince, { capture: true });
  doc.addEventListener("touchcancel", finPince, { capture: true });

  // ------------------------------------------------------------------ démarrage
  var memo = lire(CLE);
  appliquer(memo === null ? telephoneProbable() : memo === "1");
})();

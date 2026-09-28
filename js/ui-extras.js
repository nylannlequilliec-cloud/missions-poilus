/* ============================================================
   Mission Poilus — compléments d'interface
   1. Animation de chargement (première page de la session)
   2. Recherche instantanée sur tout le site (index : search-index.js)
   3. Bandeau cookies (Google Analytics chargé seulement après accord)
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. ANIMATION DE CHARGEMENT
     --------------------------------------------------------- */
  var loader = document.getElementById('pageLoader');
  if (loader) {
    var termine = false;
    var masquer = function () {
      if (termine) { return; }
      termine = true;
      loader.classList.add('loader-out');
      // on laisse l'animation de sortie se jouer (détails qui grossissent + fondu)
      window.setTimeout(function () { loader.style.display = 'none'; }, 880);
      document.documentElement.classList.remove('mp-first-visit');
      try { sessionStorage.setItem('mp-visited', '1'); } catch (e) {}
    };
    if (document.readyState === 'complete') {
      masquer();
    } else {
      window.addEventListener('load', masquer);
    }
    window.setTimeout(masquer, 3000);   // filet de sécurité : jamais bloqué
  }

  /* ---------------------------------------------------------
     2. RECHERCHE SUR TOUT LE SITE
     --------------------------------------------------------- */
  var sansAccent = function (txt) {
    return (txt === null || txt === undefined ? '' : String(txt))
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  var index = (window.MP_SEARCH_INDEX || []).map(function (e) {
    return {
      u: e.u,
      t: e.t,
      d: e.d,
      h: e.h || [],
      x: e.x || '',
      nt: sansAccent(e.t),
      nd: sansAccent(e.d),
      nh: sansAccent((e.h || []).join(' · ')),
      nx: sansAccent(e.x)
    };
  });

  function sansAutre(phrase, mot) { return sansAccent(phrase).indexOf(mot) !== -1 && phrase.length > 40; }

  function chercher(requete) {
    var mots = sansAccent(requete).split(/\s+/).filter(function (m) { return m.length > 1; });
    if (!mots.length) { return []; }
    var trouves = [];
    index.forEach(function (p) {
      var score = 0, ok = true, meilleurExtrait = '';
      mots.forEach(function (mot) {
        var partiel = 0;
        if (p.nt.indexOf(mot) !== -1) { partiel += 6; }
        if (p.nh.indexOf(mot) !== -1) { partiel += 3; }
        if (p.nd.indexOf(mot) !== -1) { partiel += 2; }
        if (p.nx.indexOf(mot) !== -1) { partiel += 1; }
        if (partiel === 0) { ok = false; }
        score += partiel;
        if (!meilleurExtrait) {
          // on privilégie la description (phrase rédigée) quand elle contient le mot cherché
          if (p.nd.indexOf(mot) !== -1) { meilleurExtrait = p.d; }
          if (!meilleurExtrait) {
            var phrases = p.x.split(/[.!?]\s+/);
            for (var i = 0; i < phrases.length; i++) {
              if (sansAutre(phrases[i], mot)) { meilleurExtrait = phrases[i]; break; }
            }
          }
          if (!meilleurExtrait && p.nh.indexOf(mot) !== -1) { meilleurExtrait = p.h.join(' · '); }
        }
      });
      if (ok && score > 0) {
        trouves.push({
          u: p.u, t: p.t,
          extrait: meilleurExtrait || p.d || p.h.join(' · '),
          score: score
        });
      }
    });
    trouves.sort(function (a, b) { return b.score - a.score; });
    return trouves.slice(0, 7);
  }

  var btnRecherche = document.getElementById('searchBtn');
  var panneau = document.getElementById('searchPanel');
  var champ = document.getElementById('searchInput');
  var zoneResultats = document.getElementById('searchResults');

  function ouvrirRecherche() {
    if (!panneau) { return; }
    panneau.hidden = false;
    document.documentElement.classList.add('recherche-ouverte');
    window.setTimeout(function () { if (champ) { champ.focus(); } }, 60);
    if (champ && !champ.value) { majResultats(''); }
  }
  function fermerRecherche() {
    if (!panneau) { return; }
    panneau.hidden = true;
    document.documentElement.classList.remove('recherche-ouverte');
  }
  function majResultats(requete) {
    if (!zoneResultats) { return; }
    if (!requete || sansAccent(requete).trim().length < 2) {
      zoneResultats.innerHTML = '<p class="recherche-vide">Tapez au moins deux lettres — ' +
        'par exemple « tarifs », « la baule », « urgence », « chat »…</p>';
      return;
    }
    var res = chercher(requete);
    if (!res.length) {
      zoneResultats.innerHTML = '<p class="recherche-vide">Aucun résultat pour « ' +
        requete.replace(/[<>&]/g, '') + ' ». Essayez un autre mot, ou appelez-nous au 06 80 99 99 96.</p>';
      return;
    }
    zoneResultats.innerHTML = res.map(function (r) {
      var extrait = r.extrait.length > 130 ? r.extrait.slice(0, 130) + '…' : r.extrait;
      return '<a class="recherche-item" href="' + r.u + '">' +
        '<span class="recherche-item__titre">' + r.t + '</span>' +
        '<span class="recherche-item__extrait">' + extrait + '</span>' +
        '<i class="fa-solid fa-arrow-right"></i></a>';
    }).join('');
  }

  if (btnRecherche && panneau) {
    btnRecherche.addEventListener('click', ouvrirRecherche);
    var fermer = document.getElementById('searchClose');
    if (fermer) { fermer.addEventListener('click', fermerRecherche); }
    panneau.addEventListener('click', function (e) { if (e.target === panneau) { fermerRecherche(); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fermerRecherche(); }
      if (e.key === '/' && panneau.hidden && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); ouvrirRecherche();
      }
    });
    if (champ) {
      champ.addEventListener('input', function () { majResultats(champ.value); });
      champ.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var premier = zoneResultats.querySelector('a.recherche-item');
          if (premier) { window.location.href = premier.getAttribute('href'); }
        }
      });
    }
  }

  /* ---------------------------------------------------------
     3. BANDEAU COOKIES (Google Analytics seulement après accord)
     --------------------------------------------------------- */
  var GA_ID = 'G-3HLPW91858';
  function chargerAnalytics() {
    if (document.getElementById('ga-script')) { return; }
    var s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  var bandeau = document.getElementById('cookieBar');
  if (bandeau) {
    var choix = null;
    try { choix = localStorage.getItem('mp-cookies'); } catch (e) {}
    if (!choix) {
      bandeau.hidden = false;
      document.documentElement.classList.add('cookies-visibles');
    } else if (choix === 'ok') {
      chargerAnalytics();
    }
    var decider = function (valeur) {
      try { localStorage.setItem('mp-cookies', valeur); } catch (e) {}
      bandeau.hidden = true;
      document.documentElement.classList.remove('cookies-visibles');
      if (valeur === 'ok') { chargerAnalytics(); }
    };
    var ok = document.getElementById('cookieAccept');
    var non = document.getElementById('cookieRefuse');
    if (ok) { ok.addEventListener('click', function () { decider('ok'); }); }
    if (non) { non.addEventListener('click', function () { decider('refus'); }); }
  }
})();

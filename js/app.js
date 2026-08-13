// ============================================================
// Mission Poilus — app.js (logique partagee : nav, animations,
// formulaire/devis, compteurs animaux, Google Places/distance)
// Extrait depuis index.html (refonte multi-pages).
// ============================================================

// ============================================
    // (AOS retiré — IntersectionObserver custom utilisé)
    // ============================================

    'use strict';

    // ============================================
    // 1. BASE DE DONNÉES DES VILLES
    // (distances approximatives autour de Saint-André-des-Eaux 44117)
    // ============================================
    /* Listes VILLES / DESTINATIONS_SPECIALES retirées (autocomplétion maison supprimée) */

    // ============================================
    // 2. FONCTIONS UTILITAIRES
    // ============================================
    function getZone(distance) {
      if (distance <= 15) return 'A';
      if (distance <= 30) return 'B';
      return 'C';
    }
    function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
    // Échappement HTML (anti-XSS) pour toute valeur dynamique injectée via innerHTML
    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function normaliser(s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    // Détecte une clinique à tarif fixe d'après le texte de la destination
    // (nom de l'établissement + adresse renvoyés par Google Places).
    function getTarifSpecialDestination(text) {
      const t = normaliser(text);
      if (!t) return null;
      if (t.indexOf('atlantia') !== -1) return { nom: 'CHV Atlantia — Nantes', tarif: 130 };
      if (t.indexOf('oniris') !== -1 || t.indexOf('chuv') !== -1) return { nom: 'CHUV Oniris — Nantes', tarif: 130 };
      if (t.indexOf('vetoceane') !== -1) return { nom: 'Clinique Vétocéane — Vertou', tarif: 150 };
      if (t.indexOf('grand large') !== -1 || t.indexOf('grand-large') !== -1) return { nom: 'Clinique du Grand Large — Pornic', tarif: 130 };
      if (t.indexOf('aeroport') !== -1 && (t.indexOf('nantes') !== -1 || t.indexOf('atlantique') !== -1)) return { nom: 'Aéroport de Nantes Atlantique — Bouguenais', tarif: 150, tarifAR: 270 };
      if (t.indexOf('gare') !== -1 && t.indexOf('nantes') !== -1) return { nom: 'Gare de Nantes', tarif: 150, tarifAR: 270 };
      return null;
    }
    function getVilleData(hiddenInput) {
      try {
        return hiddenInput.value ? JSON.parse(hiddenInput.value) : null;
      } catch { return null; }
    }
    function safeQs(id) { return document.getElementById(id); }

    // ============================================
    // 3. CACHE DOM (tous les éléments en une fois)
    // ============================================
    const DOM = {
      // Header / nav
      burger:           safeQs('burger'),
      menu:             safeQs('menu'),
      header:           document.querySelector('.main-header'),

      // Form principal
      form:             safeQs('contactForm'),
      status:           safeQs('form-status'),
      serviceSelect:    safeQs('service'),
      animalSelect:     safeQs('animal'),
      urgenceDelai:     safeQs('urgence_delai'),
      typeLivraison:    safeQs('type_livraison'),
      animalAutre:      safeQs('animal_autre'),
      raceChat:         safeQs('race_chat'),
      adresseDepart:    safeQs('adresse_depart'),
      adresseClient:    safeQs('adresse_client'),
      adresseArrivee:   safeQs('adresse_arrivee'),
      messageField:     safeQs('message'),

      // Date / heure
      dateInput:        safeQs('date'),
      heureInput:       safeQs('heure'),
      heureJournee:     safeQs('heure_journee'),
      datePlanifie:     safeQs('date_planifie'),
      heurePlanifie:    safeQs('heure_planifie'),

      // Conditional containers
      condAutre:        safeQs('cond-autre'),
      condDepart:       safeQs('cond-depart'),
      condArriveeDetail:safeQs('cond-arrivee-detail'),
      condLivraison:    safeQs('cond-livraison'),
      condRaceChat:     safeQs('cond-race-chat'),
      condAnimalRow:    safeQs('cond-animal-row'),
      condUrgence:      safeQs('cond-urgence'),
      condMedical:      safeQs('cond-medical'),
      condCage:         safeQs('cond-cage'),
      condTypeTransport:safeQs('cond-type-transport'),
      typeTransport:    safeQs('type_transport'),
      infoDeposeRetour: safeQs('info-depose-retour'),
      condTempsPlace:   safeQs('cond-temps-place'),
      tempsSurPlace:    safeQs('temps_sur_place'),
      condDateStandard: safeQs('cond-date-standard'),
      condSejour:       safeQs('cond-sejour'),
      dateDebut:        safeQs('date_debut'),
      dateFin:          safeQs('date_fin'),
      frequenceJour:    safeQs('frequence_jour'),
      estimationPrix:   safeQs('estimation_prix'),
      condHeureJournee: safeQs('cond-heure-journee'),
      condDatePlanifie: safeQs('cond-date-planifie'),
      condAdresseClient:safeQs('cond-adresse-client'),
      condAdresseRetrait:safeQs('cond-adresse-retrait'),
      adresseRetrait:   safeQs('adresse_retrait'),

      villeClientHidden:  safeQs('ville_client'),
      villeArriveeHidden: safeQs('ville_arrivee'),

      // Devis
      devisContent:     safeQs('devisContent'),
      devisZone:        safeQs('devis_zone'),
      devisDistance:    safeQs('devis_distance'),
      devisDetail:      safeQs('devis_detail'),
      devisPlein:       safeQs('devis_total_plein'),

      // UI
      scrollProgress:   safeQs('scrollProgress'),
      backTop:          safeQs('backTop'),
      heroLogo:         document.querySelector('.hero-logo'),
      heroShapes:       document.querySelectorAll('.hero-shape'),
    };

    // ============================================
    // 4. LOGIQUE CONDITIONNELLE DU FORMULAIRE
    // ============================================
    function toggleField(container, show, requiredFields = []) {
      if (!container) return;
      if (show) {
        container.classList.add('active');
        requiredFields.forEach(f => { if (f) f.required = true; });
      } else {
        container.classList.remove('active');
        requiredFields.forEach(f => { if (f) { f.required = false; if (f.value) f.value = ''; } });
      }
    }

    function updateAnimalOptions() {
      if (!DOM.serviceSelect) return;
      // L'ancien select animal a ete remplace par des compteurs.
      // Le bloc NAC est desormais affiche/masque ici selon le service.
      const service = DOM.serviceSelect.value;
      const servicesAvecNAC = ['Visite à domicile', 'Avant/après hospitalisation'];
      const nacBlock = document.querySelector('.animal-counter-block[data-type="NAC"]');
      if (!nacBlock) return;
      if (servicesAvecNAC.includes(service)) {
        nacBlock.style.display = '';
      } else {
        nacBlock.style.display = 'none';
        // Reset NAC count si on quitte un service compatible
        if (window.animalCounts && window.animalCounts.NAC > 0) {
          window.animalCounts.NAC = 0;
          const countEl = nacBlock.querySelector('.animal-count');
          if (countEl) countEl.textContent = '0';
          nacBlock.classList.remove('active');
          // Retire les lignes de détails NAC générées
          if (typeof window.renderAnimalDetails === 'function') window.renderAnimalDetails('NAC');
        }
      }
    }

    function updateRaceLogic() {
      // Les races/poids/tailles sont désormais saisis par animal directement
      // dans les blocs compteurs (lignes générées dynamiquement). Plus de bloc
      // "race chat" séparé à afficher/masquer. Fonction conservée pour
      // compatibilité avec les appels existants.
    }

    function updateUrgenceLogic() {
      if (!DOM.serviceSelect || !DOM.urgenceDelai) return;
      const service = DOM.serviceSelect.value;
      const delai = DOM.urgenceDelai.value;
      const servicesAvecUrgence = ['Taxi Animalier', 'Urgence vétérinaire'];
      if (!servicesAvecUrgence.includes(service)) {
        toggleField(DOM.condHeureJournee, false, [DOM.heureJournee]);
        toggleField(DOM.condDatePlanifie, false, [DOM.datePlanifie, DOM.heurePlanifie]);
        return;
      }

      // Reset
      toggleField(DOM.condHeureJournee, false, [DOM.heureJournee]);
      toggleField(DOM.condDatePlanifie, false, [DOM.datePlanifie, DOM.heurePlanifie]);

      if (delai === 'Dans la journée') {
        toggleField(DOM.condHeureJournee, true, [DOM.heureJournee]);
      } else if (delai === 'Planifié (date choisie)') {
        toggleField(DOM.condDatePlanifie, true, [DOM.datePlanifie, DOM.heurePlanifie]);
      }
    }

    function updateAnimalLogic() {
      if (!DOM.serviceSelect) return;
      const counts = window.animalCounts || { Chien: 0, Chat: 0, NAC: 0, Autre: 0 };
      const service = DOM.serviceSelect.value;
      // Services qui affichent le champ animal (et donc taille/autre)
      const servicesAvecAnimal = ['Taxi Animalier', 'Urgence vétérinaire', 'Promenades adaptées', 'Visite à domicile', 'Avant/après hospitalisation'];
      const showAnimalDetails = servicesAvecAnimal.includes(service);

      // Champ "Precisez l'animal" : affiche si au moins 1 "Autre"
      if (showAnimalDetails && counts.Autre > 0) {
        toggleField(DOM.condAutre, true, [DOM.animalAutre]);
      } else {
        toggleField(DOM.condAutre, false, [DOM.animalAutre]);
      }
      updateRaceLogic();
    }
    // Expose pour appel depuis la closure compteurs
    window.updateAnimalLogic = updateAnimalLogic;

    function updateServiceLogic() {
      if (!DOM.serviceSelect) return;
      const val = DOM.serviceSelect.value;

      // ====================================================
      // RESET : tout masquer, puis afficher selon le service
      // ====================================================
      toggleField(DOM.condTypeTransport, false, [DOM.typeTransport]);
      if (DOM.typeTransport) DOM.typeTransport.value = '';
      if (DOM.infoDeposeRetour) DOM.infoDeposeRetour.style.display = 'none';
      toggleField(DOM.condAnimalRow, false, [DOM.animalSelect]);
      toggleField(DOM.condLivraison, false, [DOM.typeLivraison]);
      toggleField(DOM.condDepart, false, []);
      toggleField(DOM.condArriveeDetail, false, [DOM.adresseArrivee]);
      toggleField(DOM.condUrgence, false, [DOM.urgenceDelai]);
      toggleField(DOM.condMedical, false, []);
      toggleField(DOM.condCage, false, []);
      document.querySelectorAll('input[name="cage_fournie"]').forEach(r => r.checked = false);
      toggleField(DOM.condTempsPlace, false, []);
      if (DOM.tempsSurPlace) DOM.tempsSurPlace.value = '0';
      toggleField(DOM.condDateStandard, false, [DOM.dateInput, DOM.heureInput]);
      toggleField(DOM.condSejour, false, [DOM.dateDebut, DOM.dateFin]);
      toggleField(DOM.condHeureJournee, false, [DOM.heureJournee]);
      toggleField(DOM.condDatePlanifie, false, [DOM.datePlanifie, DOM.heurePlanifie]);
      toggleField(DOM.condAdresseClient, false, [DOM.adresseClient]);
      toggleField(DOM.condAdresseRetrait, false, [DOM.adresseRetrait]);
      toggleField(DOM.condAutre, false, [DOM.animalAutre]);
      toggleField(DOM.condRace, false, [DOM.raceChien]);
      toggleField(DOM.condRaceChat, false, [DOM.raceChat]);
      if (DOM.messageField) DOM.messageField.placeholder = "Précisions utiles : comportement, état de santé, besoins particuliers...";

      if (!val) return;

      // ====================================================
      // TAXI ANIMALIER
      // Champs : type transport, animal, taille/race chien, race chat,
      //          nb animaux, urgence/délai, cage, temps sur place,
      //          adresse client, adresse départ, destination, date/heure
      // ====================================================
      if (val === 'Taxi Animalier') {
        toggleField(DOM.condTypeTransport, true, [DOM.typeTransport]);
        toggleField(DOM.condAnimalRow, true, [DOM.animalSelect]);
        toggleField(DOM.condUrgence, true, [DOM.urgenceDelai]);
        toggleField(DOM.condCage, true, []);
        toggleField(DOM.condTempsPlace, true, []);
        toggleField(DOM.condAdresseClient, true, [DOM.adresseClient]);
        toggleField(DOM.condDepart, true, []);
        toggleField(DOM.condArriveeDetail, true, [DOM.adresseArrivee]);
        // Date/heure gérée par urgence (pas de date standard)
        updateUrgenceLogic();
        updateAnimalLogic();
      }

      // ====================================================
      // URGENCE VÉTÉRINAIRE
      // Champs : animal, taille/race chien, race chat, urgence/délai,
      //          cage, temps sur place, infos médicales,
      //          adresse client, adresse départ, destination
      // PAS : nb animaux, type transport
      // ====================================================
      else if (val === 'Urgence vétérinaire') {
        toggleField(DOM.condAnimalRow, true, [DOM.animalSelect]);
        toggleField(DOM.condUrgence, true, [DOM.urgenceDelai]);
        toggleField(DOM.condCage, true, []);
        toggleField(DOM.condTempsPlace, true, []);
        toggleField(DOM.condMedical, true, []);
        toggleField(DOM.condAdresseClient, true, [DOM.adresseClient]);
        toggleField(DOM.condDepart, true, []);
        toggleField(DOM.condArriveeDetail, true, [DOM.adresseArrivee]);
        if (DOM.messageField) DOM.messageField.placeholder = "Précisions utiles : comportement, besoins particuliers...";
        // Date/heure gérée par urgence (pas de date standard)
        updateUrgenceLogic();
        updateAnimalLogic();
      }

      // ====================================================
      // LIVRAISON À DOMICILE
      // Champs : type livraison, date/heure, adresse client
      // PAS : animal, cage, destination, urgence, nb animaux, départ
      // ====================================================
      else if (val === 'Livraison à domicile') {
        toggleField(DOM.condLivraison, true, [DOM.typeLivraison]);
        toggleField(DOM.condAdresseRetrait, true, [DOM.adresseRetrait]);
        toggleField(DOM.condDateStandard, true, [DOM.dateInput, DOM.heureInput]);
        toggleField(DOM.condAdresseClient, true, [DOM.adresseClient]);
      }

      // ====================================================
      // PROMENADES ADAPTÉES
      // Champs : animal, taille/race chien, nb animaux, date/heure,
      //          adresse client
      // PAS : cage, destination, urgence, départ, type transport
      // ====================================================
      else if (val === 'Promenades adaptées') {
        toggleField(DOM.condAnimalRow, true, [DOM.animalSelect]);
        toggleField(DOM.condSejour, true, [DOM.dateDebut, DOM.dateFin]);
        toggleField(DOM.condAdresseClient, true, [DOM.adresseClient]);
        updateAnimalLogic();
      }

      // ====================================================
      // VISITE À DOMICILE
      // Champs : animal (avec NAC), taille/race chien, nb animaux,
      //          date/heure, adresse client
      // PAS : cage, destination, urgence, départ, type transport
      // ====================================================
      else if (val === 'Visite à domicile') {
        toggleField(DOM.condAnimalRow, true, [DOM.animalSelect]);
        toggleField(DOM.condSejour, true, [DOM.dateDebut, DOM.dateFin]);
        toggleField(DOM.condAdresseClient, true, [DOM.adresseClient]);
        updateAnimalLogic();
      }

      // ====================================================
      // CONSEIL ASSURANCE
      // Champs : date/heure, message uniquement
      // PAS : animal, adresse, cage, destination, urgence, nb animaux
      // ====================================================
      else if (val === 'Conseil assurance') {
        toggleField(DOM.condDateStandard, true, [DOM.dateInput, DOM.heureInput]);
        if (DOM.messageField) DOM.messageField.placeholder = "Décrivez votre besoin : type d'animal, race, âge, couverture souhaitée...";
      }

      // ====================================================
      // AVANT / APRÈS HOSPITALISATION
      // Champs : animal, taille/race chien, race chat, date/heure,
      //          infos médicales, cage, adresse client,
      //          adresse départ, destination
      // PAS : nb animaux, urgence, type transport
      // ====================================================
      else if (val === 'Avant/après hospitalisation') {
        toggleField(DOM.condAnimalRow, true, [DOM.animalSelect]);
        toggleField(DOM.condDateStandard, true, [DOM.dateInput, DOM.heureInput]);
        toggleField(DOM.condMedical, true, []);
        toggleField(DOM.condCage, true, []);
        toggleField(DOM.condAdresseClient, true, [DOM.adresseClient]);
        toggleField(DOM.condDepart, true, []);
        toggleField(DOM.condArriveeDetail, true, [DOM.adresseArrivee]);
        if (DOM.messageField) DOM.messageField.placeholder = "Précisions utiles : comportement, besoins particuliers...";
        updateAnimalLogic();
      }

      // MAJ options NAC
      updateAnimalOptions();
      // MAJ races
      updateRaceLogic();
    }

    // ============================================
    // 5. CALCUL DU DEVIS EN TEMPS RÉEL
    // ============================================
    // Dimanche de Pâques (algorithme de Meeus/Butcher) — sert aux fériés mobiles
    function paques(an) {
      const a = an % 19, b = Math.floor(an / 100), c = an % 100;
      const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const mois = Math.floor((h + l - 7 * m + 114) / 31);
      const jour = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(an, mois - 1, jour);
    }
    // Jour férié français (fixes + Lundi de Pâques, Ascension, Lundi de Pentecôte)
    function estJourFerie(d) {
      const mmdd = ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const fixes = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
      if (fixes.indexOf(mmdd) !== -1) return true;
      const p = paques(d.getFullYear());
      const mobiles = [
        new Date(p.getFullYear(), p.getMonth(), p.getDate() + 1),   // Lundi de Pâques
        new Date(p.getFullYear(), p.getMonth(), p.getDate() + 39),  // Ascension
        new Date(p.getFullYear(), p.getMonth(), p.getDate() + 50)   // Lundi de Pentecôte
      ];
      return mobiles.some(function (m) { return m.getMonth() === d.getMonth() && m.getDate() === d.getDate(); });
    }
    function isJourMajore() {
      // Date concernée : date choisie ; sinon, pour une urgence "2H"/"dans la journée", aujourd'hui.
      let d = null;
      const dateChoisie = (DOM.dateInput && DOM.dateInput.value) || (DOM.datePlanifie && DOM.datePlanifie.value);
      if (dateChoisie) {
        const p = dateChoisie.split('-');
        d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      } else if (DOM.urgenceDelai && (DOM.urgenceDelai.value === 'Urgent dans les 2H' || DOM.urgenceDelai.value === 'Dans la journée')) {
        d = new Date(); // intervention le jour même
      }
      if (!d || isNaN(d.getTime())) return false;
      return d.getDay() === 0 || estJourFerie(d);
    }

    // Nombre de jours d'un séjour (bornes incluses) ; 1 par défaut si dates absentes/incohérentes
    function nbJoursSejour() {
      if (!DOM.dateDebut || !DOM.dateFin || !DOM.dateDebut.value || !DOM.dateFin.value) return 1;
      const a = DOM.dateDebut.value.split('-'), b = DOM.dateFin.value.split('-');
      const d1 = new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]));
      const d2 = new Date(Number(b[0]), Number(b[1]) - 1, Number(b[2]));
      const diff = Math.round((d2 - d1) / 86400000) + 1; // bornes incluses
      return diff >= 1 ? diff : 1;
    }

    function renderEmpty(msg) {
      DOM.devisContent.innerHTML = `
        <div class="devis-empty">
          <i class="fa-solid fa-paw"></i>
          ${msg}
        </div>`;
      DOM.devisZone.value = '';
      DOM.devisDistance.value = '';
      DOM.devisPlein.value = '';
      DOM.devisDetail.value = '';
    }
    function renderInfo(titre, msg) {
      DOM.devisContent.innerHTML = `
        <div class="devis-sur-devis">
          <i class="fa-solid fa-circle-check"></i>
          <strong>${titre}</strong>
          <p style="margin-top:8px;font-size:0.88rem;font-weight:500;">${msg}</p>
        </div>`;
      DOM.devisPlein.value = 'Gratuit';
      DOM.devisDetail.value = msg;
    }
    function renderSurDevis(msg) {
      DOM.devisContent.innerHTML = `
        <div class="devis-sur-devis">
          <i class="fa-solid fa-handshake"></i>
          <strong>Sur devis personnalisé</strong>
          <p style="margin-top:8px;font-size:0.88rem;font-weight:500;">${msg}</p>
        </div>`;
      DOM.devisPlein.value = 'Sur devis';
      DOM.devisDetail.value = msg;
    }
    function renderDevis(lignes, total, ville) {
      let html = '';
      if (ville && ville.nom) {
        html += `<div class="devis-line"><span class="label">Ville</span><span class="value">${escapeHtml(ville.nom)}${ville.cp ? ' (' + escapeHtml(ville.cp) + ')' : ''}</span></div>`;
      } else if (ville && ville.distance) {
        html += `<div class="devis-line"><span class="label">Distance (depuis Saint-André-des-Eaux)</span><span class="value">${escapeHtml(ville.distance)} km</span></div>`;
      }
      lignes.forEach(l => {
        const cls = l.info ? 'devis-line discount' : 'devis-line';
        html += `<div class="${cls}"><span class="label">${escapeHtml(l.label)}</span><span class="value">${escapeHtml(l.value)}</span></div>`;
      });
      html += `
        <div class="devis-total">
          <div class="devis-total-row">
            <span class="label">Total estimé</span>
            <span class="value">${fmt(total)}</span>
          </div>
        </div>
        <div class="devis-info">
          <i class="fa-solid fa-circle-info"></i>
          <strong>Devis estimatif</strong> — Sous réserve de validation par Mission Poilus sous 24h.
          Le tarif final définitif vous sera transmis par email après vérification.
        </div>`;
      DOM.devisContent.innerHTML = html;
      // Animation de pulsation sur le panneau pour signaler la mise à jour
      const panel = DOM.devisContent.closest('.devis-panel');
      if (panel) {
        panel.classList.remove('updated');
        // Force reflow pour relancer l'animation
        void panel.offsetWidth;
        panel.classList.add('updated');
      }
    }



    function buildDevis() {
      if (!DOM.devisContent) return;
      const service = DOM.serviceSelect.value;
      let villeClient = getVilleData(DOM.villeClientHidden);
// Priorité à la distance Google Maps si disponible (0 km accepté : adresse = siège)
if (typeof window.distanceCalculee === 'number' && window.distanceCalculee >= 0) {
  if (!villeClient) villeClient = {};
  villeClient.distance = window.distanceCalculee;
}
let villeArrivee = getVilleData(DOM.villeArriveeHidden);

      const animal = DOM.animalSelect.value;
      // Total des animaux depuis les compteurs +/-
      const totalCompteurs = window.animalCounts
        ? Object.values(window.animalCounts).reduce((a, b) => a + b, 0)
        : 0;
      const nbAnimauxVal = totalCompteurs > 0 ? totalCompteurs : 1;
      const cageFournie = document.querySelector('input[name="cage_fournie"]:checked')?.value;
      const typeLivr = DOM.typeLivraison.value;


      if (!service) return renderEmpty('Sélectionnez d\'abord une prestation.');
      if (service === 'Conseil assurance') {
        return renderInfo('Service gratuit', 'La consultation conseil en assurance animalière est offerte. Devis personnalisé selon votre choix d\'assurance.');
      }
      if (service === 'Avant/après hospitalisation') {
        return renderSurDevis('Service en partenariat avec l\'hôpital. Devis sur mesure selon la situation et la durée.');
      }
      if (!villeClient) return renderEmpty('Renseignez votre adresse pour estimer le devis.');

      const distance = villeClient.distance;
      const zone = getZone(distance);
      const lignes = [];
      let total = 0;
      const detailTexte = [];

      // ===== TAXI / URGENCE VÉTÉRINAIRE =====
      if (service === 'Taxi Animalier' || service === 'Urgence vétérinaire') {
        const typeTransportVal = DOM.typeTransport ? DOM.typeTransport.value : '';
        const isAllerRetour = (typeTransportVal === 'Aller-retour différé');
        const multiplicateur = isAllerRetour ? 2 : 1;
        const labelSuffixe = isAllerRetour ? ' (Aller-retour différé)' : (typeTransportVal === 'Aller simple' ? ' (Aller simple)' : '');

        // Texte de destination (nom Google Places + adresse) — sert à détecter
        // cliniques, aéroport et gares.
        const arrInput = document.getElementById('adresse_arrivee');
        const destText = (window.arriveeName || '') + ' '
          + (DOM.villeArriveeHidden ? DOM.villeArriveeHidden.value : '') + ' '
          + (arrInput ? arrInput.value : '');
        const isGare = normaliser(destText).indexOf('gare') !== -1;

        // Destination à tarif fixe (clinique, aéroport, Gare de Nantes) ?
        let speDest = (villeArrivee && villeArrivee.special) ? { nom: villeArrivee.nom, tarif: villeArrivee.tarif } : null;
        if (!speDest) speDest = getTarifSpecialDestination(destText);

        if (speDest) {
          let tarifCalc, suffixe = labelSuffixe;
          if (isAllerRetour && speDest.tarifAR) {
            tarifCalc = speDest.tarifAR;
            suffixe = ' (2 trajets)'; // aéroport / Gare de Nantes : 2 trajets, sans mention "aller-retour"
          } else {
            tarifCalc = speDest.tarif * multiplicateur;
          }
          lignes.push({ label: speDest.nom + suffixe, value: fmt(tarifCalc) });
          total += tarifCalc;
          detailTexte.push(`Transport vers ${speDest.nom}${suffixe}: ${fmt(tarifCalc)}`);
        } else if (isGare) {
          // Gare (hors Gare de Nantes, qui a un tarif fixe ci-dessus) : tarif selon la distance
          if (zone === 'A') {
            const tarifCalc = 30 * multiplicateur;
            lignes.push({ label: `Transport gare Zone A (${distance} km)${labelSuffixe}`, value: fmt(tarifCalc) });
            total += tarifCalc;
            detailTexte.push(`Transport gare Zone A${labelSuffixe}: ${fmt(tarifCalc)}`);
          } else if (zone === 'B') {
            const tarifCalc = 50 * multiplicateur;
            lignes.push({ label: `Transport gare Zone B (${distance} km)${labelSuffixe}`, value: fmt(tarifCalc) });
            total += tarifCalc;
            detailTexte.push(`Transport gare Zone B${labelSuffixe}: ${fmt(tarifCalc)}`);
          } else {
            return renderSurDevis(`Gare à ${distance} km (au-delà de 30 km). Transport sur devis : contactez-nous au 06 80 99 99 96. La Gare de Nantes bénéficie d'un tarif fixe.`);
          }
        } else {
          if (zone === 'A') {
            const tarifCalc = 30 * multiplicateur;
            lignes.push({ label: `Transport Zone A (${distance} km)${labelSuffixe}`, value: fmt(tarifCalc) });
            total += tarifCalc;
            detailTexte.push(`Transport Zone A${labelSuffixe}: ${fmt(tarifCalc)}`);
          } else if (zone === 'B') {
            const tarifCalc = 45 * multiplicateur;
            lignes.push({ label: `Transport Zone B (${distance} km)${labelSuffixe}`, value: fmt(tarifCalc) });
            total += tarifCalc;
            detailTexte.push(`Transport Zone B${labelSuffixe}: ${fmt(tarifCalc)}`);
          } else {
            // Zone C (> 30 km) : transport sur devis personnalisé (plus de calcul au km)
            return renderSurDevis(`Distance ${distance} km — Zone C (au-delà de 30 km). Transport sur devis : contactez-nous au 06 80 99 99 96 ou via le formulaire. Certaines destinations (cliniques partenaires, aéroport et Gare de Nantes) bénéficient d'un tarif fixe.`);
          }
        }

        // Supplément animaux sur le transport (1er animal inclus dans le tarif de base)
        const nbChienT = (window.animalCounts && window.animalCounts.Chien) || 0;
        const nbChatT  = (window.animalCounts && window.animalCounts.Chat) || 0;
        let suppAnimaux = 0;
        if (nbChienT >= 1) {
          suppAnimaux = (nbChienT - 1) * 5 + nbChatT * 3;
        } else {
          suppAnimaux = Math.max(0, nbChatT - 1) * 3;
        }
        // Aller-retour différé (2 trajets) : le supplément animaux s'applique aux deux trajets
        suppAnimaux *= multiplicateur;
        if (suppAnimaux > 0) {
          const labelSupp = 'Animaux supplémentaires (+5 €/chien, +3 €/chat)' + (multiplicateur > 1 ? ' × 2 trajets' : '');
          lignes.push({ label: labelSupp, value: '+' + fmt(suppAnimaux) });
          total += suppAnimaux;
          detailTexte.push('Animaux supplementaires: +' + fmt(suppAnimaux));
        }

        // Suppléments urgence si service "Urgence vétérinaire"
        if (service === 'Urgence vétérinaire') {
          const heureVal = (DOM.heureInput && DOM.heureInput.value) || (DOM.heureJournee && DOM.heureJournee.value) || (DOM.heurePlanifie && DOM.heurePlanifie.value) || '';
          const heure = parseInt((heureVal.split(':')[0]) || '12');
          const delai = DOM.urgenceDelai.value;
          const estNuit = (heure >= 19 || heure < 8);

          if (estNuit) {
            // Urgence de nuit (19h-8h) : +90 €
            lignes.push({ label: 'Ambulance — Urgence de nuit (19h-8h)', value: '+' + fmt(90) });
            total += 90;
            detailTexte.push('Urgence nuit: +90,00 €');
          } else if (delai === 'Urgent dans les 2H') {
            // Urgence dans les 2H (jour) : +70 €
            lignes.push({ label: 'Ambulance — Urgence dans les 2H', value: '+' + fmt(70) });
            total += 70;
            detailTexte.push('Urgence 2H: +70,00 €');
          } else if (delai === 'Dans la journée') {
            // Dans la journée : +40 €
            lignes.push({ label: 'Ambulance — Dans la journée (8h-19h)', value: '+' + fmt(40) });
            total += 40;
            detailTexte.push('Dans la journée: +40,00 €');
          }
        }

        // Temps sur place — mention informative uniquement, sans impact sur le total
        lignes.push({ label: 'Temps d\'attente sur place', value: '+5,00 € / 15 min', info: true });

        if (cageFournie === 'Non') {
          lignes.push({ label: 'Cage fournie par nos soins', value: 'Inclus', info: true });
        }
      }

      // ===== LIVRAISON =====
      else if (service === 'Livraison à domicile') {
        if (zone === 'A') {
          lignes.push({ label: `Livraison Zone A (${distance} km)`, value: fmt(10) });
          total += 10;
          detailTexte.push('Livraison Zone A: 10,00 €');
        } else if (zone === 'B') {
          lignes.push({ label: `Livraison Zone B (${distance} km)`, value: fmt(15) });
          total += 15;
          detailTexte.push('Livraison Zone B: 15,00 €');
        } else {
          return renderSurDevis(`Distance ${distance} km — Zone C. Pour la livraison, devis sur mesure.`);
        }
        if (typeLivr) lignes.push({ label: `Type : ${typeLivr}`, value: '', info: true });
      }

      // ===== PROMENADES (séjour sur une période) =====
      else if (service === 'Promenades adaptées') {
        let base;
        if (zone === 'A') base = 15;
        else if (zone === 'B') base = 20;
        else return renderSurDevis(`Distance ${distance} km — Zone C, devis personnalisé.`);

        // Tarif par passage = base + chiens supplémentaires
        const suppChiens = nbAnimauxVal > 1 ? (nbAnimauxVal - 1) * 7 : 0;
        const parPassage = base + suppChiens;

        // Période × fréquence
        const nbJours = nbJoursSejour();
        const freq = DOM.frequenceJour ? (parseInt(DOM.frequenceJour.value, 10) || 1) : 1;
        const nbPassages = nbJours * freq;
        const sousTotal = parPassage * nbPassages;

        lignes.push({ label: `Promenade Zone ${zone} — ${fmt(parPassage)} / passage${suppChiens ? ' (dont ' + (nbAnimauxVal - 1) + ' chien(s) supp.)' : ''}`, value: '', info: true });
        lignes.push({ label: `${nbJours} jour(s) × ${freq} passage(s)/jour = ${nbPassages} passage(s)`, value: fmt(sousTotal) });
        total += sousTotal;
        detailTexte.push(`Promenade ${fmt(parPassage)}/passage × ${nbPassages} = ${fmt(sousTotal)}`);

        // Pack Privilège : -20% dès 10 promenades
        if (nbPassages >= 10) {
          const remise = Math.round(sousTotal * 0.20 * 100) / 100;
          lignes.push({ label: 'Pack Privilège (-20% dès 10 promenades)', value: '-' + fmt(remise) });
          total -= remise;
          detailTexte.push(`Pack Privilege -20%: -${fmt(remise)}`);
        }
      }

      // ===== VISITE À DOMICILE (séjour sur une période) =====
      else if (service === 'Visite à domicile') {
        let base;
        if (zone === 'A') base = 15;
        else if (zone === 'B') base = 20;
        else return renderSurDevis(`Distance ${distance} km — Zone C, devis personnalisé.`);

        // Tarif par visite = base + animaux supplémentaires
        const suppAnim = nbAnimauxVal > 1 ? (nbAnimauxVal - 1) * 3 : 0;
        const parVisite = base + suppAnim;

        const nbJours = nbJoursSejour();
        const freq = DOM.frequenceJour ? (parseInt(DOM.frequenceJour.value, 10) || 1) : 1;
        const nbVisites = nbJours * freq;
        const sousTotal = parVisite * nbVisites;

        lignes.push({ label: `Visite Zone ${zone} — ${fmt(parVisite)} / visite${suppAnim ? ' (dont ' + (nbAnimauxVal - 1) + ' animal(aux) supp.)' : ''}`, value: '', info: true });
        lignes.push({ label: `${nbJours} jour(s) × ${freq} visite(s)/jour = ${nbVisites} visite(s)`, value: fmt(sousTotal) });
        total += sousTotal;
        detailTexte.push(`Visite ${fmt(parVisite)}/visite × ${nbVisites} = ${fmt(sousTotal)}`);

        // Pack Privilège : -20% dès 10 visites
        if (nbVisites >= 10) {
          const remise = Math.round(sousTotal * 0.20 * 100) / 100;
          lignes.push({ label: 'Pack Privilège (-20% dès 10 visites)', value: '-' + fmt(remise) });
          total -= remise;
          detailTexte.push(`Pack Privilege -20%: -${fmt(remise)}`);
        }
      }

      // Majoration dimanche / jour férié
      if (isJourMajore() && total > 0) {
        const major = Math.round(total * 0.15 * 100) / 100;
        lignes.push({ label: 'Majoration dimanche / jour férié (+15%)', value: '+' + fmt(major) });
        total += major;
        detailTexte.push(`Majoration dimanche/férié: +${fmt(major)}`);
      }

      DOM.devisZone.value = zone;
      DOM.devisDistance.value = distance + ' km';
      DOM.devisDetail.value = detailTexte.join(' | ');
      DOM.devisPlein.value = fmt(total);
      // Valeur finale calculée transmise à Formspree (Make/Zapier)
      if (DOM.estimationPrix) DOM.estimationPrix.value = (Math.round(total * 100) / 100).toFixed(2);

      renderDevis(lignes, total, villeClient);
    }

    // ============================================
    // 7bis. RÉSERVATION AGENDA GOOGLE (via Apps Script)
    // ============================================
    // >>> Collez ici l'URL de votre application web Apps Script (voir GUIDE-RESERVATION.md).
    //     Laissez "" pour désactiver : le site fonctionne alors comme avant
    //     (email Formspree + lien d'agenda à ajouter manuellement).
    var RESERVATION_API = "https://script.google.com/macros/s/AKfycby3IlFIPWn4CAFtCHPQvm0FXN5ShCC8jCW3xvIULRGa9SOF0pl8tlErsi2asqmnAcdv0Q/exec";

    // Grise dans le menu déroulant les heures déjà réservées pour la date choisie
    async function chargerCreneauxOccupes(dateValue, selectEl) {
      if (!RESERVATION_API || !dateValue || !selectEl) return;
      try {
        const res = await fetch(RESERVATION_API + '?date=' + encodeURIComponent(dateValue));
        const j = await res.json();
        const taken = (j && j.occupes) ? j.occupes : [];
        Array.from(selectEl.options).forEach(opt => {
          if (!opt.value) return;
          const isTaken = taken.indexOf(opt.value) !== -1;
          opt.disabled = isTaken;
          opt.textContent = opt.value + (isTaken ? '  (réservé)' : '');
          if (isTaken && selectEl.value === opt.value) selectEl.value = '';
        });
      } catch (e) { /* silencieux : ne pas bloquer si l'API ne répond pas */ }
    }

    // ============================================
    // 7. ENVOI FORMULAIRE (Formspree)
    // ============================================
    async function handleFormSubmit(e) {
      e.preventDefault();

      // Anti-spam : si le pot de miel est rempli, c'est un robot → on stoppe silencieusement
      const honeypot = DOM.form.querySelector('[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        DOM.status.innerHTML = '<i class="fa-solid fa-circle-check"></i> Demande envoyée.';
        DOM.status.style.color = 'green';
        return;
      }

      DOM.status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
      DOM.status.style.color = 'var(--orange)';

      // Recalculer le devis avant envoi
      buildDevis();

      const data = new FormData(DOM.form);
      const clientName = data.get('name') || 'Client';

      // Détails par animal (champs multiples générés dynamiquement)
      function listAnimalDetails(d) {
        const out = [];
        const cr = d.getAll('chien_race[]'), ct = d.getAll('chien_taille[]'), cc = d.getAll('chien_categorie[]');
        for (let i = 0; i < cr.length; i++) {
          const p = [];
          if (cr[i]) p.push('race ' + cr[i]);
          if (ct[i]) p.push('taille ' + ct[i]);
          if (cc[i]) p.push(cc[i]);
          out.push('Chien ' + (i + 1) + (p.length ? ' : ' + p.join(', ') : ''));
        }
        const har = d.getAll('chat_race[]'), hap = d.getAll('chat_poids[]');
        for (let i = 0; i < har.length; i++) {
          const p = [];
          if (har[i]) p.push('race ' + har[i]);
          if (hap[i]) p.push('poids ' + hap[i]);
          out.push('Chat ' + (i + 1) + (p.length ? ' : ' + p.join(', ') : ''));
        }
        const ne = d.getAll('nac_espece[]');
        for (let i = 0; i < ne.length; i++) {
          out.push('NAC ' + (i + 1) + (ne[i] ? ' : ' + ne[i] : ''));
        }
        const ap = d.getAll('autre_precision[]');
        for (let i = 0; i < ap.length; i++) {
          out.push('Autre ' + (i + 1) + (ap[i] ? ' : ' + ap[i] : ''));
        }
        return out;
      }
      const animalDetailsList = listAnimalDetails(data);
      const animalDetailsRecap = animalDetailsList.join('\n');

      const clientEmail = data.get('email') || '';
      const service = data.get('service') || '';
      const totalPlein = DOM.devisPlein.value || 'À calculer';

      // Infos date/heure pour Google Agenda (consolide depuis les 3 sources possibles)
      const dateVal = (DOM.dateInput && DOM.dateInput.value) || (DOM.datePlanifie && DOM.datePlanifie.value) || '';
      const heureVal = (DOM.heureInput && DOM.heureInput.value) || (DOM.heureJournee && DOM.heureJournee.value) || (DOM.heurePlanifie && DOM.heurePlanifie.value) || '';
      // Champs consolides pour Formspree (date + heure unifiees)
      if (dateVal) data.set('date', dateVal);
      if (heureVal) data.set('heure', heureVal);

      // Lien Google Agenda pré-rempli
      let agendaLink = '';
      if (dateVal) {
        // Format Google Agenda : YYYYMMDDTHHMMSS
        const dateClean = dateVal.replace(/-/g, '');
        const heureClean = heureVal ? heureVal.replace(':', '') + '00' : '080000';
        // Heure de fin = +1h
        const heureDebut = heureVal ? parseInt(heureVal.split(':')[0]) : 8;
        const heureFin = String(heureDebut + 1).padStart(2, '0') + (heureVal ? heureVal.split(':')[1] : '00') + '00';
        const dateStart = `${dateClean}T${heureClean}`;
        const dateEnd = `${dateClean}T${heureFin}`;
        const agendaTitle = encodeURIComponent(`Mission Poilus — ${service} — ${clientName}`);
        // Infos de déplacement
        const villeClient   = data.get('ville_client') || '';
        const adresseClient = data.get('adresse_client') || '';
        const adresseDepart = data.get('adresse_depart') || '';
        const villeArrivee  = data.get('ville_arrivee') || '';
        const adresseArr    = data.get('adresse_arrivee') || '';
        const animal        = data.get('animal') || '';
        const urgDelai      = data.get('urgence_delai') || '';
        const cage          = data.get('cage_fournie') || '';
        const typeLivr      = data.get('type_livraison') || '';

        // Construction description dynamique selon la prestation
        let descPrestation = `[PRESTATION] ${service}\n`;

        // Départ / arrivée (Taxi, Urgence)
        if (adresseDepart) descPrestation += `> Depart : ${adresseDepart}, ${villeClient}\n`;
        else if (villeClient) descPrestation += `> Depart : ${adresseClient || ''} ${villeClient}\n`;
        if (villeArrivee)  descPrestation += `> Destination : ${villeArrivee}${adresseArr ? ' — ' + adresseArr : ''}\n`;

        // Animal(aux)
        if (animal)   descPrestation += `> Animal : ${animal}\n`;
        animalDetailsList.forEach(line => { descPrestation += `   - ${line}\n`; });

        // Urgence / délai
        if (urgDelai)  descPrestation += `> Delai : ${urgDelai}\n`;

        // Cage
        if (cage)      descPrestation += `> Cage fournie par client : ${cage}\n`;

        // Livraison
        if (typeLivr)  descPrestation += `> Type livraison : ${typeLivr}\n`;
        const adresseRetraitAg = data.get('adresse_retrait') || '';
        if (adresseRetraitAg) descPrestation += `> Recuperation : ${adresseRetraitAg}\n`;

        // Zone & devis
        descPrestation += `\n--- DEVIS ESTIME ---\n- Tarif estimé : ${totalPlein}\n- Zone : ${DOM.devisZone.value} (${DOM.devisDistance.value})\n`;
        descPrestation += `\n--- CLIENT ---\n- Nom : ${clientName}\n- Tel : ${data.get('phone') || ''}\n- Email : ${clientEmail}\n`;
        descPrestation += `\n/!\\ Temps d'attente sur place : +5EUR/15min facture en fin de prestation`;

        const agendaDetails = encodeURIComponent(descPrestation);
        agendaLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${agendaTitle}&dates=${dateStart}/${dateEnd}&details=${agendaDetails}`;
      }

      // ============================================
      // RÉCAP CLIENT (copier-coller pour validation)
      // ============================================
      const villeClientStr     = data.get('ville_client') || '';
      const adresseClientStr   = data.get('adresse_client') || '';
      const adresseDepartRaw   = data.get('adresse_depart') || '';
      // Si adresse de départ non remplie → utiliser adresse du client
      const adresseDepartStr   = adresseDepartRaw || adresseClientStr;
      const villeArriveeStr    = data.get('ville_arrivee') || '';
      const adresseArrStr      = data.get('adresse_arrivee') || '';
      const animalStr          = data.get('animal') || '';
      const urgDelaiStr        = data.get('urgence_delai') || '';
      const cageStr            = data.get('cage_fournie') || '';
      const typeLivrStr        = data.get('type_livraison') || '';
      const adresseRetraitStr  = data.get('adresse_retrait') || '';
      const typeTransportStr   = data.get('type_transport') || '';
      const messageStr         = data.get('message') || '';
      const infoMedStr         = data.get('info_medicale') || '';

      // Parser ville client (peut être JSON)
      let villeClientNom = villeClientStr;
      try {
        const vc = JSON.parse(villeClientStr);
        if (vc && vc.nom) villeClientNom = vc.nom + (vc.cp ? ' (' + vc.cp + ')' : '');
      } catch (e) {}
      let villeArriveeNom = villeArriveeStr;
      try {
        const va = JSON.parse(villeArriveeStr);
        if (va && va.nom) villeArriveeNom = va.nom;
      } catch (e) {}

      const dateAffichee = dateVal ? new Date(dateVal).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';

      // Séjour (Visite à domicile / Promenades sur une période)
      const dateDebutStr = data.get('date_debut') || '';
      const dateFinStr   = data.get('date_fin') || '';
      const freqStr      = data.get('frequence_jour') || '';
      let sejourStr = '';
      if (dateDebutStr && dateFinStr) {
        const fmtD = function (s) { const p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
        sejourStr = 'du ' + fmtD(dateDebutStr) + ' au ' + fmtD(dateFinStr) + (freqStr ? ' -- ' + freqStr + ' passage(s)/jour' : '');
      }

      // Notes conditionnelles pour les e-mails / récap
      // - temps d'attente sur place : UNIQUEMENT pour le transport (Taxi & Ambulance/Urgence)
      // - tarif dégressif : mis en avant dès que le Pack Privilège s'applique (≥ 10 prestations)
      const isTransport = (service === 'Taxi Animalier' || service === 'Urgence vétérinaire');
      const aPromo = /pack privil/i.test(DOM.devisDetail.value || '');
      const noteTempsPlaceRecap = isTransport
        ? "\n/!\\ Tarif estimatif -- Le temps d'attente sur place\n(+5,00 EUR / 15 min) sera ajoute selon duree reelle.\n"
        : '';
      const notePromoRecap = aPromo
        ? "\n[BON PLAN] Tarif degressif : -20% (Pack Privilege) applique des 10 prestations.\n"
        : '';
      const noteTempsPlaceClient = isTransport
        ? "\n/!\\ IMPORTANT : Ce tarif est estimatif. Le temps d'attente sur place (+5,00 EUR / 15 min) sera ajoute en fin de prestation selon la duree reelle.\n"
        : '';
      const notePromoClient = aPromo
        ? "\n❤️ BON PLAN : grace a la quantite demandee, votre tarif est degressif ! A partir de 10 prestations, le Pack Privilege vous fait economiser 20% sur le total.\n"
        : '';

      // ============================================
      // RÉCAP COMPLET COPIER-COLLER (pour le pro)
      // ============================================
      const recapCopierColler = 
`═══════════════════════════════════════
  MISSION POILUS — DEVIS À VALIDER
═══════════════════════════════════════

[PRESTATION] ${service}${typeTransportStr ? ' -- ' + typeTransportStr : ''}
${dateAffichee ? '[DATE] ' + dateAffichee : ''}${heureVal ? ' a ' + heureVal : ''}
${sejourStr ? '[PERIODE] ' + sejourStr : ''}
${urgDelaiStr ? '[URGENCE] Delai : ' + urgDelaiStr : ''}

--- CLIENT ---
- Nom : ${clientName}
- Telephone : ${data.get('phone') || ''}
- Email : ${clientEmail}
- Ville : ${villeClientNom}
- Adresse : ${adresseClientStr}

--- ANIMAL ---
${animalStr ? '- Type : ' + animalStr : ''}
${animalDetailsRecap ? animalDetailsRecap.split('\n').map(function(l){ return '- ' + l; }).join('\n') : ''}

${(adresseDepartStr || villeArriveeNom || adresseArrStr) ? '--- TRAJET ---' : ''}
${adresseDepartStr ? '- Depart : ' + adresseDepartStr + (!adresseDepartRaw ? ' (domicile)' : '') : ''}
${villeArriveeNom ? '- Destination : ' + villeArriveeNom : ''}
${adresseArrStr ? '- Adresse arrivee : ' + adresseArrStr : ''}

${cageStr ? '[CAGE] Fournie par le client : ' + cageStr : ''}
${typeLivrStr ? '[LIVRAISON] Type : ' + typeLivrStr : ''}
${adresseRetraitStr ? '[LIVRAISON] Adresse de recuperation : ' + adresseRetraitStr : ''}
${infoMedStr ? '[MEDICAL] Infos : ' + infoMedStr : ''}
${messageStr ? '[MESSAGE] ' + messageStr : ''}

===================================================
--- DEVIS ESTIME ---
===================================================
${DOM.devisDetail.value || '--'}

- ZONE : ${DOM.devisZone.value || '--'} (${DOM.devisDistance.value || '--'})
- TARIF ESTIME : ${totalPlein}
${notePromoRecap}${noteTempsPlaceRecap}===================================================`
      .replace(/\n\s*\n\s*\n/g, '\n\n').trim();

      // ============================================
      // EMAIL DE VALIDATION DU CLIENT (copier-coller)
      // ============================================
      const bodyValidationClient = `Bonjour ${clientName},

Suite à votre demande pour "${service}", voici la confirmation de votre devis :

[PRESTATION] ${service}
${dateAffichee ? '[DATE] ' + dateAffichee + (heureVal ? ' a ' + heureVal : '') : ''}

--- TARIF ESTIME ---
- Tarif estimé : ${totalPlein}
- Zone : ${DOM.devisZone.value} (${DOM.devisDistance.value})

DETAIL : ${DOM.devisDetail.value}
${notePromoClient}${noteTempsPlaceClient}
Pour valider votre devis, merci de repondre a ce mail ou de me contacter au 06 80 99 99 96.

❤️ Mission Poilus -- Prendre soin des animaux... et de ceux qui les aiment.`.replace(/\n{3,}/g, '\n\n');

      const mailtoClient = `mailto:${clientEmail}?subject=${encodeURIComponent('Confirmation devis Mission Poilus — ' + service)}&body=${encodeURIComponent(bodyValidationClient)}`;

      // Ce que le pro reçoit dans Formspree
      data.set('_subject', `[Mission Poilus] Nouvelle demande -- ${service} -- ${clientName}`);

      // Champ principal lisible pour le pro
      data.set('A_RECAP_COMPLET_COPIER_COLLER', recapCopierColler);
      data.set('B_EMAIL_VALIDATION_CLIENT_A_COPIER', bodyValidationClient);
      data.set('C_LIEN_MAILTO_CLIENT', mailtoClient);
      if (agendaLink) data.set('D_LIEN_GOOGLE_AGENDA', agendaLink);
      data.set('E_DEVIS_RESUME', `${DOM.devisDetail.value} | Total estimé : ${totalPlein}`);

      // Supprimer les champs techniques bruts pour ne pas alourdir l'email
      data.delete('devis_detail');
      data.delete('devis_zone');
      data.delete('devis_distance');
      data.delete('devis_total_plein');
      data.delete('mailto_validation');
      data.delete('email_validation_body');

      // Affiche le succès + réinitialise le formulaire (utilisé par les 2 voies d'envoi)
      function afficherSucces() {
        DOM.status.innerHTML = '<i class="fa-solid fa-circle-check"></i> <strong>Demande envoyée avec succès !</strong><br><span style="font-size:0.88rem;font-weight:normal;">Vous allez recevoir un e-mail de confirmation. Mission Poilus valide votre devis sous 24h.</span>';
        DOM.status.style.color = 'green';
        DOM.form.reset();
        if (typeof window.resetAnimalCounts === 'function') window.resetAnimalCounts();
        updateServiceLogic();
        updateAnimalLogic();
        updateUrgenceLogic();
        buildDevis();
        DOM.form.classList.add('form-success-flash');
        setTimeout(() => DOM.form.classList.remove('form-success-flash'), 1500);
      }

      // Données complètes transmises au backend Google (Apps Script)
      const reservationPayload = {
        date: dateVal,
        heure: heureVal,
        date_debut: data.get('date_debut') || '',
        date_fin: data.get('date_fin') || '',
        frequence: data.get('frequence_jour') || '',
        service: service,
        nom: clientName,
        tel: data.get('phone') || '',
        email: clientEmail,
        montant: (DOM.estimationPrix && DOM.estimationPrix.value) || '',
        recap: recapCopierColler,        // corps e-mail PRO
        client_body: bodyValidationClient // corps e-mail CLIENT
      };

      // === PRIORITÉ : Google Apps Script (e-mails PRO + CLIENT + agenda + lien de paiement) ===
      if (RESERVATION_API) {
        try {
          const resa = await fetch(RESERVATION_API, { method: 'POST', body: JSON.stringify(reservationPayload) });
          const jr = await resa.json();
          if (jr && jr.status === 'conflict') {
            DOM.status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Le créneau du <strong>' + dateAffichee + ' à ' + heureVal + '</strong> est déjà réservé. Merci de choisir une autre heure.';
            DOM.status.style.color = 'var(--orange-fonce)';
            return;
          }
          if (jr && jr.status === 'ok') {
            afficherSucces();
            return; // Apps Script a tout géré → on n'utilise pas Formspree
          }
          // statut "error" → on bascule sur Formspree (secours)
        } catch (err) {
          console.warn('[Mission Poilus] Apps Script indisponible, repli Formspree :', err);
        }
      }

      // === SECOURS : Formspree (si Apps Script absent ou en échec) ===
      try {
        const response = await fetch(DOM.form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          afficherSucces();
        } else {
          let errMsg = 'Une erreur est survenue.';
          try {
            const json = await response.json();
            if (json && json.errors) errMsg = json.errors.map(err => err.message).join(', ');
          } catch (_) {}
          DOM.status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' + escapeHtml(errMsg) + ' Merci de réessayer ou de nous appeler.';
          DOM.status.style.color = 'var(--orange-fonce)';
        }
      } catch (err) {
        DOM.status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Connexion impossible. Appelez-nous au 06 80 99 99 96.';
        DOM.status.style.color = 'var(--orange-fonce)';
      }
    }

    // ============================================
    // 8. ATTACHEMENT DES LISTENERS
    // ============================================
    function attachListeners() {
      // Burger menu
      if (DOM.burger && DOM.menu) {
        DOM.burger.addEventListener('click', () => DOM.menu.classList.toggle('open'));
        DOM.menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => DOM.menu.classList.remove('open')));
      }

      // Service / animal / urgence
      if (!DOM.serviceSelect) return;
      DOM.serviceSelect.addEventListener('change', () => {
        updateServiceLogic();
        updateAnimalOptions();
        updateAnimalLogic();
        // Recalcule la distance depuis le siège selon le nouveau service
        if (typeof calculerDistance === 'function') calculerDistance();
        buildDevis();
      });
      DOM.animalSelect.addEventListener('change', () => {
        updateAnimalLogic();
        buildDevis();
      });
      DOM.urgenceDelai.addEventListener('change', () => {
        updateUrgenceLogic();
        buildDevis();
      });
      if (DOM.typeLivraison) DOM.typeLivraison.addEventListener('change', buildDevis);
      if (DOM.tempsSurPlace) DOM.tempsSurPlace.addEventListener('change', buildDevis);

      // Type de prestation transport (sous-menu taxi)
      if (DOM.typeTransport) {
        DOM.typeTransport.addEventListener('change', () => {
          // Afficher info "2 prestations" si Dépose + Retour
          if (DOM.infoDeposeRetour) {
            DOM.infoDeposeRetour.style.display = (DOM.typeTransport.value === 'Aller-retour différé') ? 'block' : 'none';
          }
          buildDevis();
        });
      }

      // Cage fournie
      document.querySelectorAll('input[name="cage_fournie"]').forEach(r => r.addEventListener('change', buildDevis));

      // Date / heure
      ['dateInput', 'heureInput', 'heureJournee', 'datePlanifie', 'heurePlanifie', 'dateDebut', 'dateFin', 'frequenceJour'].forEach(k => {
        if (DOM[k]) DOM[k].addEventListener('change', buildDevis);
      });
      if (DOM.dateDebut) DOM.dateDebut.addEventListener('input', buildDevis);
      if (DOM.dateFin) DOM.dateFin.addEventListener('input', buildDevis);
      // La date de fin ne peut pas précéder la date de début
      if (DOM.dateDebut && DOM.dateFin) {
        DOM.dateDebut.addEventListener('change', () => {
          if (DOM.dateDebut.value) DOM.dateFin.setAttribute('min', DOM.dateDebut.value);
        });
      }

      // Réservation : au changement de date, grise les créneaux déjà pris
      document.querySelectorAll('.heure-select[data-date]').forEach(sel => {
        const dateId = sel.getAttribute('data-date');
        if (!dateId) return;
        const dateEl = document.getElementById(dateId);
        if (!dateEl) return;
        dateEl.addEventListener('change', () => chargerCreneauxOccupes(dateEl.value, sel));
      });


      // Listener supplémentaire sur les hidden (fiabilité)
      if (DOM.villeClientHidden) DOM.villeClientHidden.addEventListener('change', buildDevis);
      if (DOM.villeArriveeHidden) DOM.villeArriveeHidden.addEventListener('change', buildDevis);

      // Form submit
      if (DOM.form) DOM.form.addEventListener('submit', handleFormSubmit);

      // Date min = aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      if (DOM.dateInput) DOM.dateInput.setAttribute('min', today);
      if (DOM.datePlanifie) DOM.datePlanifie.setAttribute('min', today);
      if (DOM.dateDebut) DOM.dateDebut.setAttribute('min', today);
      if (DOM.dateFin) DOM.dateFin.setAttribute('min', today);
    }

    // ============================================
    // 9. INIT AU CHARGEMENT
    // ============================================
    attachListeners();
    updateServiceLogic();
    updateAnimalOptions();
    updateAnimalLogic();
    updateUrgenceLogic();
    buildDevis();

    // ============================================
    // 10. ANIMATIONS UI/UX PRO MAX (scroll, parallax, observers)
    // ============================================
    const prefersReducedMotion = (typeof window.matchMedia === 'function') 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;
    const supportsHover = (typeof window.matchMedia === 'function') 
      ? window.matchMedia('(hover: hover)').matches 
      : true;
    let lastScrollY = 0;
    let scrollTicking = false;

    function updateScrollProgress() {
      const h = document.documentElement;
      const scrolled = h.scrollHeight - h.clientHeight > 0
        ? (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100
        : 0;
      if (DOM.scrollProgress) DOM.scrollProgress.style.width = scrolled + '%';

      // Bande urgence + header : disparition progressive synchronisée sur 60px
const urgBar = document.querySelector('.urgence-bar');
const urgHeight = urgBar ? urgBar.offsetHeight : 45;
const progress = Math.min(window.scrollY / 60, 1);
if (urgBar) {
  urgBar.style.opacity = 1 - progress;
  urgBar.style.transform = `translateY(${-progress * 100}%)`;
  if (progress >= 1) urgBar.style.pointerEvents = 'none';
  else urgBar.style.pointerEvents = '';
}
// Le header suit : descend de la hauteur réelle du bandeau à 0px
if (DOM.header) {
  DOM.header.style.top = (urgHeight * (1 - progress)) + 'px';
}

      if (window.scrollY > 80) {
        if (DOM.header) DOM.header.classList.add('scrolled');
      } else {
        if (DOM.header) DOM.header.classList.remove('scrolled');
      }

      if (DOM.backTop) DOM.backTop.classList.toggle('show', window.scrollY > 500);

      if (!prefersReducedMotion) {
        const y = window.scrollY;
        DOM.heroShapes.forEach((s, i) => {
          const speed = (i + 1) * 0.15;
          s.style.transform = `translateY(${y * speed}px)`;
        });
        // Le logo, le titre et la baseline restent FIXES au scroll
        // (parallax retiré pour une lecture stable et un rendu pro).
        document.querySelectorAll('.avantages-section, .flotte-section').forEach(sec => {
          const rect = sec.getBoundingClientRect();
          const offset = (rect.top - window.innerHeight / 2) * -0.15;
          sec.style.setProperty('--blob-offset', offset + 'px');
        });
      }
      lastScrollY = window.scrollY;
    }

    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => { updateScrollProgress(); scrollTicking = false; });
        scrollTicking = true;
      }
    }, { passive: true });
    updateScrollProgress();

    if (DOM.backTop) {
      DOM.backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // Reveal observer — éléments apparaissent un par un au scroll (PC + mobile)
    let revealDelay = 0;
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealDelay += 100;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, revealDelay);
          revealObserver.unobserve(entry.target);
        }
      });
      // Reset du délai après chaque batch pour ne pas accumuler indéfiniment
      setTimeout(() => { revealDelay = 0; }, 800);
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Cascade
    const cascadeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => { entry.target.classList.add('visible'); }, i * 100);
          cascadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.cascade, footer, .stat-item').forEach(el => cascadeObserver.observe(el));

    // Service cards — animation montée+rotation, rejouable, déclenchement tardif
    const serviceCards = document.querySelectorAll('#services .service-card');
    serviceCards.forEach(el => {
      revealObserver.unobserve(el);
      el.classList.remove('visible');
    });
    setTimeout(() => {
      let sDelay = 0;
      const serviceObserver = new IntersectionObserver((entries) => {
        const entering = entries.filter(e => e.isIntersecting);
        const leaving = entries.filter(e => !e.isIntersecting);
        leaving.forEach(entry => {
          entry.target.classList.remove('visible');
        });
        sDelay = 0;
        entering.forEach(entry => {
          sDelay += 120;
          const d = sDelay;
          setTimeout(() => { entry.target.classList.add('visible'); }, d);
        });
      }, { threshold: 0.3 });
      serviceCards.forEach(el => serviceObserver.observe(el));
    }, 100);

    // Compteurs animés — observe la section parente (plus fiable que les petits spans)
    const statsBand = document.querySelector('.stats-band');
    const counters = document.querySelectorAll('.stat-number [data-target], .stat-number[data-target]');
    let countersAnimated = false;
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          counters.forEach((el, i) => {
            const target = parseInt(el.dataset.target, 10);
            const duration = 1600;
            const delay = i * 200; // cascade
            setTimeout(() => {
              const start = performance.now();
              function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.floor(target * eased);
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = target;
              }
              requestAnimationFrame(tick);
            }, delay);
          });
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    if (statsBand) counterObserver.observe(statsBand);

    // Tilt sur cards (desktop seulement, hover capable)
    if (!prefersReducedMotion && supportsHover) {
      document.querySelectorAll('.service-card, .avantage-card, .tarif-block').forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `translateY(-8px) perspective(900px) rotateX(${y * -3}deg) rotateY(${x * 3}deg)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
      });
    }

    // Magnetic CTA buttons
    if (!prefersReducedMotion && supportsHover) {
      document.querySelectorAll('.btn-primary, .btn-submit, .float-call, .back-top').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
          const r = btn.getBoundingClientRect();
          const x = e.clientX - r.left - r.width / 2;
          const y = e.clientY - r.top - r.height / 2;
          btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
      });
    }

    // Smooth scroll pour les ancres internes
    // Scroll rapide custom (300ms) pour les liens de navigation
    function fastScrollTo(target) {
      const start = window.scrollY;
      const end = target.getBoundingClientRect().top + window.scrollY - 80;
      const distance = end - start;
      const duration = 500;
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        window.scrollTo(0, start + distance * ease);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.length > 1 && document.querySelector(href)) {
          e.preventDefault();
          fastScrollTo(document.querySelector(href));
        }
      });
    });
// Mesure dynamique de la hauteur du bandeau urgence
(function() {
  const urgBar = document.querySelector('.urgence-bar');
  if (!urgBar) return;
  function setUrgenceHeight() {
    const h = urgBar.offsetHeight;
    document.documentElement.style.setProperty('--urgence-h', h + 'px');
  }
  setUrgenceHeight();
  window.addEventListener('resize', setUrgenceHeight);
  window.addEventListener('load', setUrgenceHeight);
})();


// ============================================
// PATTES ANIMEES — Bande stats (version unique nettoyee)
// Pattes de chien qui montent vers le haut dans le bandeau stats
// ============================================
(function() {
  'use strict';
  const container = document.querySelector('.stats-band');
  if (!container) return;
  const statsGrid = container.querySelector('.stats-grid');
  const statItems = container.querySelectorAll('.stat-item');

  // Le container .stats-band a deja position:relative et overflow:hidden en CSS

  // Met la grille et les stat-items au-dessus des pattes
  if (statsGrid) statsGrid.style.position = 'relative';
  if (statsGrid) statsGrid.style.zIndex = '2';
  statItems.forEach(el => {
    el.style.position = 'relative';
    el.style.zIndex = '2';
  });

  // Injecte le keyframe une seule fois
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes pawRiseStats {
      0%   { bottom: -60px; opacity: 0; transform: rotate(var(--paw-rot, 0deg)); }
      15%  { opacity: var(--paw-op, 0.12); }
      85%  { opacity: var(--paw-op, 0.12); }
      100% { bottom: calc(100% + 30px); opacity: 0; transform: rotate(var(--paw-rot, 0deg)); }
    }
  `;
  document.head.appendChild(styleTag);

  // Limite max de pattes simultanees pour la performance
  const MAX_PAWS = 15;
  let activePaws = 0;

  function spawnPaw() {
    if (activePaws >= MAX_PAWS) return;

    const paw = document.createElement('i');
    paw.className = 'fa-solid fa-paw';

    const size    = (Math.random() * 28 + 16).toFixed(0);     // 16px a 44px
    const posX    = (Math.random() * 90 + 3).toFixed(1);      // 3% a 93%
    const dur     = (Math.random() * 3 + 3.5).toFixed(1);     // 3.5s a 6.5s
    const opacity = (Math.random() * 0.12 + 0.06).toFixed(2); // 6% a 18%
    const rot     = (Math.random() * 60 - 30).toFixed(0);     // -30 a +30 deg

    Object.assign(paw.style, {
      position:      'absolute',
      bottom:        '-60px',
      left:          posX + '%',
      fontSize:      size + 'px',
      color:         'rgba(255, 255, 255, ' + opacity + ')',
      zIndex:        '1',
      pointerEvents: 'none',
      '--paw-rot':   rot + 'deg',
      '--paw-op':    opacity,
      animation:     'pawRiseStats ' + dur + 's ease-in-out forwards',
    });

    container.appendChild(paw);
    activePaws++;

    // Supprime la patte apres l'animation
    const timeout = parseFloat(dur) * 1000 + 100;
    setTimeout(() => {
      paw.remove();
      activePaws--;
    }, timeout);
  }

  // Démarre les pattes uniquement quand la section est visible
  const pawInterval = { id: null };
  const pawObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !pawInterval.id) {
        // Lance les premieres pattes en cascade
        for (let i = 0; i < 5; i++) {
          setTimeout(spawnPaw, i * 250);
        }
        // Puis une nouvelle patte toutes les 700ms
        pawInterval.id = setInterval(spawnPaw, 700);
      } else if (!entry.isIntersecting && pawInterval.id) {
        clearInterval(pawInterval.id);
        pawInterval.id = null;
      }
    });
  }, { threshold: 0.1 });

  pawObserver.observe(container);

})();
// ============================================================
// GOOGLE PLACES AUTOCOMPLETE + DISTANCE MATRIX
// ============================================================
function initGooglePlaces() {
    
    // --- AUTOCOMPLETE : Adresse du client ---
    const adresseClientInput = document.getElementById('adresse_client');
    if (adresseClientInput) {
        const autocompleteClient = new google.maps.places.Autocomplete(adresseClientInput, {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'fr' },
            fields: ['formatted_address', 'geometry', 'address_components']
        });

        autocompleteClient.addListener('place_changed', function() {
            const place = autocompleteClient.getPlace();
            if (!place.geometry) return;

            // Extraire la ville
            let ville = '';
            if (place.address_components) {
                for (const component of place.address_components) {
                    if (component.types.includes('locality')) {
                        ville = component.long_name;
                        break;
                    }
                }
            }

            // Stocker les valeurs cachées
            document.getElementById('ville_client').value = ville;
            document.getElementById('google_distance_client').value = place.formatted_address;

            // Mémoriser les coordonnées pour le calcul de secours
            if (place.geometry && place.geometry.location) {
                window.clientLatLng = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
            }

            // Calculer la distance depuis le siège (Saint-André-des-Eaux)
            calculerDistance();
        });
    }

    // --- AUTOCOMPLETE : Adresse d'arrivée (destination libre) ---
    const adresseArriveeInput = document.getElementById('adresse_arrivee');
    if (adresseArriveeInput) {
        const autocompleteArrivee = new google.maps.places.Autocomplete(adresseArriveeInput, {
    types: ['establishment', 'geocode'],
    componentRestrictions: { country: 'fr' },
    fields: ['formatted_address', 'geometry', 'name']
    });

        autocompleteArrivee.addListener('place_changed', function() {
            const place = autocompleteArrivee.getPlace();
            if (!place.geometry) return;

            document.getElementById('google_distance_arrivee').value = place.formatted_address;
            document.getElementById('ville_arrivee').value = place.formatted_address;

            // Mémoriser le nom de l'établissement (pour détecter les cliniques à tarif fixe)
            window.arriveeName = place.name || '';
            // Mémoriser les coordonnées de la destination
            if (place.geometry && place.geometry.location) {
                window.arriveeLatLng = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
            }

            // Afficher info distance
            afficherInfoDistance('arrivee', place.formatted_address);

            // Calculer la distance
            calculerDistance();
        });
    }

    // --- AUTOCOMPLETE : Adresse de récupération (Livraison) ---
    const adresseRetraitInput = document.getElementById('adresse_retrait');
    if (adresseRetraitInput) {
        const autocompleteRetrait = new google.maps.places.Autocomplete(adresseRetraitInput, {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'fr' },
            fields: ['formatted_address', 'geometry', 'name']
        });

        autocompleteRetrait.addListener('place_changed', function() {
            const place = autocompleteRetrait.getPlace();
            if (!place.geometry) return;

            document.getElementById('google_distance_retrait').value = place.formatted_address;
        });
    }

    // (Selection de clinique/destination_type supprimee — l'utilisateur tape directement
    //  l'adresse de destination via Google Places.)
}

// ============================================================
// CALCUL DISTANCE DEPUIS LE SIEGE (Saint-André-des-Eaux)
// ============================================================
// Adresse + coordonnées du siège, point de départ de toute tarification.
var HQ_ADDRESS = "1 Impasse du Clos du Verger, 44117 Saint-André-des-Eaux, France";
var HQ_LATLNG = { lat: 47.2906, lng: -2.3119 };

function calculerDistance() {
    var serviceEl = document.getElementById('service');
    var service = serviceEl ? serviceEl.value : '';

    // Services de transport : la distance tarifée va vers la DESTINATION.
    // Services à domicile (promenade, visite, livraison) : vers le DOMICILE du client.
    var transportServices = ['Taxi Animalier', 'Urgence vétérinaire', 'Avant/après hospitalisation'];

    var arriveeEl = document.getElementById('ville_arrivee');
    var clientEl  = document.getElementById('adresse_client');
    var arriveeVal = arriveeEl ? arriveeEl.value : '';
    var clientVal  = clientEl ? clientEl.value : '';

    var target = '';
    var targetLatLng = null;

    if (transportServices.indexOf(service) !== -1 && arriveeVal) {
        target = arriveeVal;
        targetLatLng = window.arriveeLatLng || null;
    } else if (clientVal) {
        target = clientVal;
        targetLatLng = window.clientLatLng || null;
    } else if (arriveeVal) {
        target = arriveeVal;
        targetLatLng = window.arriveeLatLng || null;
    }

    // Pas encore d'adresse exploitable
    if (!target) return;

    // 1) Tentative principale : distance routière via Distance Matrix
    if (typeof google !== 'undefined' && google.maps && google.maps.DistanceMatrixService) {
        try {
            var dm = new google.maps.DistanceMatrixService();
            dm.getDistanceMatrix({
                origins: [HQ_ADDRESS],
                destinations: [target],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC,
                language: 'fr'
            }, function(response, status) {
                if (status === 'OK'
                    && response.rows[0]
                    && response.rows[0].elements[0]
                    && response.rows[0].elements[0].status === 'OK') {
                    var el = response.rows[0].elements[0];
                    var distanceKm = Math.round(el.distance.value / 1000);
                    appliquerDistance(distanceKm, el.duration ? el.duration.text : '', false);
                } else {
                    // 2) Secours géométrique si la Distance Matrix échoue
                    console.warn('[Mission Poilus] Distance Matrix indisponible (status =', status + ') — calcul de secours.');
                    fallbackDistance(targetLatLng);
                }
            });
        } catch (e) {
            console.warn('[Mission Poilus] Distance Matrix exception :', e);
            fallbackDistance(targetLatLng);
        }
    } else {
        fallbackDistance(targetLatLng);
    }
}

// Calcul de secours : distance à vol d'oiseau × facteur route (~1,3)
function fallbackDistance(targetLatLng) {
    if (targetLatLng
        && typeof google !== 'undefined'
        && google.maps && google.maps.geometry && google.maps.geometry.spherical) {
        var from = new google.maps.LatLng(HQ_LATLNG.lat, HQ_LATLNG.lng);
        var to = new google.maps.LatLng(targetLatLng.lat, targetLatLng.lng);
        var metres = google.maps.geometry.spherical.computeDistanceBetween(from, to);
        var distanceKm = Math.max(1, Math.round((metres / 1000) * 1.3));
        appliquerDistance(distanceKm, '', true);
    } else {
        afficherErreurDistance("Calcul de distance temporairement indisponible. Le tarif final vous sera communiqué par téléphone (06 80 99 99 96).");
    }
}

// Applique la distance trouvée : affichage + déclenchement du devis
function appliquerDistance(distanceKm, duree, estime) {
    var suffix = estime ? ' (estimée)' : (duree ? ' (' + duree + ')' : '');
    var label = distanceKm + ' km depuis Saint-André-des-Eaux' + suffix;

    var dInfoC = document.getElementById('distance-info-client');
    var dTxtC = document.getElementById('distance-text-client');
    if (dInfoC && dTxtC) { dTxtC.textContent = label; dInfoC.style.display = 'block'; }

    var dInfoA = document.getElementById('distance-info-arrivee');
    var dTxtA = document.getElementById('distance-text-arrivee');
    if (dInfoA && dTxtA) { dTxtA.textContent = label; dInfoA.style.display = 'block'; }

    window.distanceCalculee = distanceKm;

    if (typeof buildDevis === 'function') {
        buildDevis();
    }
}

function afficherErreurDistance(message) {
    // Affiche un message d'erreur discret dans le panneau de devis
    const devisContent = document.getElementById('devisContent');
    if (!devisContent) return;
    // N'ecrase pas un devis deja calcule
    if (window.distanceCalculee) return;
    devisContent.innerHTML = '<div class="devis-empty" style="color:var(--orange-fonce);"><i class="fa-solid fa-triangle-exclamation"></i><p>' + message + '</p></div>';
}

// ============================================================
// FONCTION UTILITAIRE
// ============================================================
function afficherInfoDistance(type, adresse) {
    console.log('Adresse ' + type + ' sélectionnée : ' + adresse);
}
// ============================================================
// COMPTEURS ANIMAUX +/-
// ============================================================
(function() {
  const counts = { Chien: 0, Chat: 0, NAC: 0, Autre: 0 };
  // Expose pour acces externe (updateAnimalLogic, reset apres submit)
  window.animalCounts = counts;

  // Construit une ligne de détails pour UN animal (race/poids/taille selon le type)
  function buildDetailRow(type, index) {
    const row = document.createElement('div');
    row.className = 'animal-detail-row';
    row.dataset.index = index;
    let inner = '';
    if (type === 'Chien') {
      inner =
        '<span class="animal-detail-title">Chien n\u00b0' + index + '</span>' +
        '<input type="text" name="chien_race[]" placeholder="Race(s)" autocomplete="off" />' +
        '<select name="chien_taille[]">' +
          '<option value="">-- Taille --</option>' +
          '<option value="Petit (&lt; 10 kg)">Petit (moins de 10 kg)</option>' +
          '<option value="Moyen (10-25 kg)">Moyen (10 \u00e0 25 kg)</option>' +
          '<option value="Grand (&gt; 25 kg)">Grand (plus de 25 kg)</option>' +
        '</select>' +
        '<select name="chien_categorie[]">' +
          '<option value="">-- Cat\u00e9gorie --</option>' +
          '<option value="Non cat\u00e9goris\u00e9">Non cat\u00e9goris\u00e9</option>' +
          '<option value="Cat\u00e9gorie 1">Cat\u00e9gorie 1 (chien d\'attaque)</option>' +
          '<option value="Cat\u00e9gorie 2">Cat\u00e9gorie 2 (chien de garde/d\u00e9fense)</option>' +
        '</select>';
    } else if (type === 'Chat') {
      inner =
        '<span class="animal-detail-title">Chat n\u00b0' + index + '</span>' +
        '<input type="text" name="chat_race[]" placeholder="Race(s)" autocomplete="off" />' +
        '<select name="chat_poids[]">' +
          '<option value="">-- Poids --</option>' +
          '<option value="L\u00e9ger (&lt; 4 kg)">L\u00e9ger (moins de 4 kg)</option>' +
          '<option value="Moyen (4-6 kg)">Moyen (4 \u00e0 6 kg)</option>' +
          '<option value="Lourd (&gt; 6 kg)">Lourd (plus de 6 kg)</option>' +
        '</select>';
    } else if (type === 'NAC') {
      inner =
        '<span class="animal-detail-title">NAC n\u00b0' + index + '</span>' +
        '<input type="text" name="nac_espece[]" placeholder="Esp\u00e8ce (ex: lapin, gecko...)" autocomplete="off" />';
    } else {
      inner =
        '<span class="animal-detail-title">Animal n\u00b0' + index + '</span>' +
        '<input type="text" name="autre_precision[]" placeholder="Pr\u00e9cisez l\'animal" autocomplete="off" />';
    }
    row.innerHTML = inner;
    return row;
  }

  // Ajoute/retire les lignes de détails pour qu'il y en ait exactement counts[type]
  // (les valeurs déjà saisies sont préservées : on ne touche qu'aux lignes en trop/manquantes)
  function renderAnimalDetails(type) {
    const container = document.querySelector('.animal-details[data-type="' + type + '"]');
    if (!container) return;
    const n = counts[type] || 0;
    const rows = container.querySelectorAll('.animal-detail-row');
    const current = rows.length;
    if (n > current) {
      for (let i = current; i < n; i++) container.appendChild(buildDetailRow(type, i + 1));
    } else if (n < current) {
      for (let i = current - 1; i >= n; i--) rows[i].remove();
    }
    container.style.display = n > 0 ? 'block' : 'none';
  }
  window.renderAnimalDetails = renderAnimalDetails;

  function updateAnimalHidden() {
    const parts = [];
    Object.entries(counts).forEach(([type, n]) => {
      if (n > 0) parts.push(n + ' ' + type);
    });
    const hidden = document.getElementById('animal');
    if (hidden) hidden.value = parts.join(', ');

    // Met aussi a jour le champ nb_animaux pour compatibilite buildDevis
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // Mettre a jour visuel des blocs + détails par animal
    document.querySelectorAll('.animal-counter-block').forEach(block => {
      const type = block.dataset.type;
      const n = counts[type] || 0;
      const countEl = block.querySelector('.animal-count');
      if (countEl) countEl.textContent = n;

      // Génère/retire les lignes de détails (1 par animal)
      renderAnimalDetails(type);

      // Bordure orange si actif
      block.classList.toggle('active', n > 0);
    });

    // Cacher l'erreur si au moins 1 animal (FIX P2.10)
    const err = document.getElementById('animal-error');
    if (err) err.style.display = total > 0 ? 'none' : 'block';

    // Declencher la logique conditionnelle (taille chien, race, autre)
    if (typeof window.updateAnimalLogic === 'function') {
      try { window.updateAnimalLogic(); } catch (e) { /* silent */ }
    }

    // Recalculer le devis
    if (typeof buildDevis === 'function') buildDevis();
  }

  // Expose le reset pour appel apres submit
  window.resetAnimalCounts = function() {
    Object.keys(counts).forEach(k => { counts[k] = 0; });
    // Vide les lignes de détails générées dynamiquement
    document.querySelectorAll('.animal-details').forEach(c => { c.innerHTML = ''; c.style.display = 'none'; });
    updateAnimalHidden();
    const err = document.getElementById('animal-error');
    if (err) err.style.display = 'none';
  };

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.animal-btn');
    if (!btn) return;
    const type = btn.dataset.type;
    if (!type) return;

    if (btn.classList.contains('plus')) {
      counts[type] = Math.min(counts[type] + 1, 9);
    } else if (btn.classList.contains('minus')) {
      counts[type] = Math.max(counts[type] - 1, 0);
    }
    updateAnimalHidden();
  });

  // Validation avant envoi (FIX P1.7 : precedence corrigee)
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.id !== 'contactForm') return;
    const animalRow = document.getElementById('cond-animal-row');
    if (!animalRow || !animalRow.classList.contains('active')) return;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) {
      e.preventDefault();
      const err = document.getElementById('animal-error');
      if (err) err.style.display = 'block';
    }
  }, true);
})();



// ============================================================
// MENU DEROULANT "Services" (clic sur mobile, hover sur desktop)
// ============================================================
(function() {
  document.querySelectorAll('nav.menu .has-dropdown > a').forEach(function(a) {
    a.addEventListener('click', function(e) {
      if (window.matchMedia('(max-width: 900px)').matches) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });
})();


// ============================================================
// BANDEAU PHOTO — DÉFILEMENT AUTOMATIQUE (requestAnimationFrame)
// Tourne en continu sans intervention, indépendamment du réglage
// "animations réduites" de l'OS. Pause au survol / focus clavier.
// Null-safe : ne fait rien sur les pages sans bandeau.
// ============================================================
(function initGalerieMarquee() {
  var track = document.querySelector('.galerie-track');
  if (!track) return;

  var marquee = track.closest('.galerie-marquee') || track.parentElement;
  var VITESSE = 60;         // pixels par seconde (desktop)
  var offset = 0;           // position courante (négative = vers la gauche)
  var demiLargeur = 0;      // largeur d'UNE série (le contenu est dupliqué)
  var paused = false;
  var last = null;

  function mesurer() {
    // Le contenu est dupliqué (2 séries identiques). La largeur d'UNE série
    // doit inclure le gap qui la sépare de la copie, sinon un demi-gap manque
    // et on voit un petit saut à chaque rebouclage.
    // On mesure donc la position exacte du 1er élément de la 2e série.
    var items = track.children;
    var n = items.length;
    if (n >= 2) {
      var moitie = Math.floor(n / 2);
      var base = items[0].getBoundingClientRect().left;
      // L'écart entre deux enfants est insensible au transform courant du track
      // (les deux subissent le même décalage), la mesure reste donc fiable.
      demiLargeur = items[moitie].getBoundingClientRect().left - base;
    } else {
      demiLargeur = track.scrollWidth / 2;
    }
  }

  function vitesseCourante() {
    // Un peu plus lent sur petits écrans
    return window.matchMedia('(max-width: 768px)').matches ? 45 : VITESSE;
  }

  function boucle(ts) {
    if (last === null) last = ts;
    var dt = (ts - last) / 1000;
    last = ts;
    // Garde-fou : si l'onglet a été en arrière-plan, dt peut être énorme
    if (dt > 0.1) dt = 0.1;

    if (!paused && demiLargeur > 0) {
      offset -= vitesseCourante() * dt;
      // Reboucle sans saut : dès qu'on a défilé d'une série entière
      if (offset <= -demiLargeur) offset += demiLargeur;
      track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px, 0, 0)';
    }
    requestAnimationFrame(boucle);
  }

  // Pause au survol souris + focus clavier (accessibilité)
  if (marquee) {
    marquee.addEventListener('mouseenter', function () { paused = true; });
    marquee.addEventListener('mouseleave', function () { paused = false; });
    marquee.addEventListener('focusin', function () { paused = true; });
    marquee.addEventListener('focusout', function () { paused = false; });
  }

  // Recalcule les dimensions au redimensionnement (avec petit anti-rebond)
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(mesurer, 200);
  });

  // Les images sont en largeur auto : leur taille n'est connue qu'une fois
  // chargées. On re-mesure donc à chaque image chargée, sinon demiLargeur est
  // trop petit et le ruban « revient » avant d'avoir vraiment tout défilé.
  var imgs = track.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    if (imgs[i].complete) continue;
    imgs[i].addEventListener('load', mesurer);
    imgs[i].addEventListener('error', mesurer);
  }

  // Filet de sécurité : ResizeObserver recalcule dès que la largeur du ruban
  // change (chargement d'images lazy, polices, etc.).
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function () { mesurer(); });
    ro.observe(track);
  }

  mesurer();
  window.addEventListener('load', mesurer); // re-mesure une fois tout chargé
  requestAnimationFrame(boucle);
})();

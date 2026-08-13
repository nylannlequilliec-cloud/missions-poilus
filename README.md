# Mission Poilus 🐾

Site vitrine multi-services animaliers — **Saint-André-des-Eaux (44117) et 65 km autour**.

Taxi animalier · Urgences vétérinaires · Livraison · Promenades adaptées · Visites à domicile (chats/NAC) · Conseil assurance · Accompagnement avant/après hospitalisation.

## Tech

- **100 % statique** : HTML + CSS + JS vanille (aucune dépendance de build)
- `css/style.css` / `js/app.js` partagés sur toutes les pages
- Google Fonts (Poppins) + Font Awesome 6.5.1 (CDN)
- Formulaire + devis en temps réel (Google Maps Distance Matrix avec repli géométrique)
- Réservation : Google Apps Script (agenda + e-mails + devis Abby + acompte Stancer) — voir le fichier `reservation.gs` **hors dépôt** (secrets)
- SEO : title/description/OG/Twitter/JSON-LD par page, `sitemap.xml`, `robots.txt`, mots-clés dans `src/data/seo_keywords.json`

## Pages

| Page | Fichier |
|---|---|
| Accueil | `index.html` |
| Taxi animalier | `taxi-animalier.html` |
| Promenades adaptées | `promenades.html` |
| Visites chats & NAC | `visites-chats-nac.html` |
| Livraison | `livraison.html` |
| Conseil assurance | `assurance.html` |
| Avant/après hospitalisation | `avant-apres-hospitalisation.html` |
| Tarifs | `tarifs.html` |
| Contact & réservation | `contact.html` |
| Conditions générales | `cgu.html` |

## Déploiement

Déployer **tout** le dossier à la racine de l'hébergement (les chemins `css/`, `js/` et images sont relatifs). Après chaque modification de `style.css` / `app.js`, **incrémenter le cache-buster** `?v=N` sur toutes les pages.

## ⚠️ Sécurité

- `reservation.gs` (clés secrètes Stancer/Abby) ne doit **jamais** être poussé sur ce dépôt ni uploadé sur l'hébergement — il est igno­ré par `.gitignore`.
- La clé Google Maps doit être restreinte par HTTP referrer (`https://mission-poilus.com`).

## SEO Automator

Les mots-clés cibles sont maintenus dans `src/data/seo_keywords.json` — mis à jour périodiquement via le skill Hermes `seo-automator-missions-poilus`.

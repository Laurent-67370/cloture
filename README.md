# La clôture de fin de mois 🎮💶

Jeu 3D de clôture comptable : ramasse les factures dans le bureau et dépose-les à la Compta avant 18h00. Construit avec three.js (intégré au fichier, il fonctionne hors ligne), PWA installable, classement des services en ligne.

**Jouer : https://cloture.lhusser.fr**

## Le jeu

- **Modes** : Partie libre (3 niveaux), Défi du jour (mêmes factures pour tous, seed du jour), Calendrier (un mois = un niveau, avec épreuves bonus)
- **⚔️ Défier un collègue** : en fin de partie, envoie un lien du type « J'ai fait 6 650 pts… à toi de me battre ! » — le défié joue exactement les mêmes factures
- **🧮 Épreuves bonus** : Rapprochement facture/bon de commande, Chasse au doublon, Taux de TVA
- **🔁 Transfert de progression** : QR code + lien (ou copie manuelle sur PC) pour récupérer sur un autre appareil ton pseudo, grade, XP, tenues, succès et étoiles — les records des deux appareils sont fusionnés et tu gardes ta place au classement. Le lien est un instantané : recrée-le après de nouvelles parties, et garde-le pour toi
- **PWA installable** : bouton 📲 sur l'écran titre, plein écran, fonctionne sans réseau (service worker, cache `cloture-v2` ; le générer de QR code est intégré, donc le transfert marche aussi hors ligne)
- **Manette** : Xbox / PlayStation / générique en Bluetooth ou USB — menus et partie
- Compatible clavier/souris, tactile, et manette

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Le jeu complet : moteur three.js contrôles géométrie ombres éclairage + police Fredoka + générateur de QR code intégrés (≈ 1,15 Mo) |
| `manifest.webmanifest` | Manifeste PWA (`start_url` absolu — requis pour l'installation Android/WebAPK) |
| `sw.js` | Service worker (cache `cloture-v2`, 9 fichiers, classement jamais mis en cache) |
| `icon-*.png`, `apple-touch-icon.png`, `favicon-32.png` | Icônes (feuille de facture + tampon € rouge) |
| `og-image.png` | Aperçu de partage WhatsApp/réseaux (1200×630) |

## Serveur de classement (`server/`)

Petit service Node **sans dépendance** (`server.js`), port 3220, derrière nginx :

- `server.js` — API scores par service (anti-triche : max 60 000 pts, 40 requêtes/min), CORS restreint au domaine du jeu
- `cloture-scores.service` — service systemd
- `nginx-cloture-api.conf` — vhost `cloture-api.lhusser.fr` (proxy 3220, HTTPS)
- `README.md` — installation détaillée

Les scores vivent dans `data.json` (non versionné : pseudos et scores des joueurs).

## Hébergement

Le jeu est servi sur **cloture.lhusser.fr** (nginx) :

- `sw.js` en `Cache-Control: no-cache` (mises à jour immédiates des téléphones)
- `manifest.webmanifest` servi en `application/manifest+json`
- HTTPS Let's Encrypt, renouvellement auto (timer certbot)

## Crédits

Moteur : **three.js r147** (intégré au fichier), police Fredoka (Google Fonts, intégrée).

---

*Version affichée dans le menu : « Version 13 · 17/10/2026 ».*

Historique des versions :

- **v13** — Transfert de progression (QR code, lien 418 caractères, import manuel sur PC), fusion des records
- **v12** — Mise en page téléphone en paysage, manettes (Xbox / PlayStation / générique)
- **v11** — numéro de version affiché en bas du menu, mis à jour à chaque livraison
- **v10** — PWA installable : manifeste, service worker (cache `cloture-v2`), bouton 📲, icônes facture-tampon €
- **v9 et avant** — jeu 3D autonome (three.js r147 + Fredoka intégrés), défis entre collègues, épreuves comptables, image de partage WhatsApp
# Classement en ligne — La clôture de fin de mois

Petit serveur Node.js **sans dépendance** (aucun `npm install`), sur le même principe que `pepin-scores`.
Il stocke les scores dans `data.json` et répond sur le port **3220** (3210 et 3215 sont déjà pris).

## Installation sur le VPS

```bash
# 1. Copier les fichiers
sudo mkdir -p /opt/cloture-scores
sudo cp server.js /opt/cloture-scores/
sudo chown -R www-data:www-data /opt/cloture-scores

# 2. Service systemd
sudo cp cloture-scores.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloture-scores
curl -s http://127.0.0.1:3220/health      # → {"ok":true,"players":0}

# 3. DNS : enregistrement A  cloture-api.lhusser.fr  →  IP du VPS

# 4. nginx + HTTPS
sudo cp nginx-cloture-api.conf /etc/nginx/sites-available/cloture-api
sudo ln -s /etc/nginx/sites-available/cloture-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d cloture-api.lhusser.fr
curl -s https://cloture-api.lhusser.fr/health
```

Si tu choisis un autre nom de domaine, change la ligne `const API_URL='https://cloture-api.lhusser.fr'` dans `index.html`.

## API

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/health` | état du serveur |
| GET | `/scores?key=ps_normal&limit=20` | meilleurs scores d'un niveau (`ps_facile`, `ps_normal`, `ps_expert`, `ps_m1`…`ps_m12`, défi du jour `pd_AAAAMMJJ_niveau`) |
| GET | `/services?week=w_AAAASS` | points cumulés par service pour une semaine ISO |
| POST | `/score` | `{id, pseudo, svc, pts, keys:[…]}` : garde le meilleur score par clé et ajoute `pts` au cumul hebdomadaire du joueur |

## Protections

- Scores au-delà de 60 000 points refusés, clés et services vérifiés, pseudo nettoyé (16 caractères).
- 40 envois maximum par minute et par adresse IP.
- Nettoyage automatique : semaines de plus de 8 semaines et défis du jour de plus de 21 jours.
- `ALLOWED_ORIGINS` (dans le service) peut restreindre les sites autorisés, par exemple `https://lhusser.fr,https://laurent-67370.github.io`. Laisse `*` si le jeu est aussi ouvert en fichier local.

Sauvegarde : il suffit de copier `/opt/cloture-scores/data.json`.

// Classement en ligne de « La clôture de fin de mois » — Node.js sans dépendance.
// Stockage : un fichier JSON (écriture atomique). Port par défaut 3220.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 3220;
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
const SERVICES = ['Comptabilité','Facturation','Paye','RH','Téléassistance','Portage de repas','Contrôle de gestion','SAD / ESA','Direction','Informatique','Qualité','Accueil','Autre'];
const MAX_SCORE = 60000;            // au-delà, la partie est refusée (anti-triche simple)
const KEY_RE = /^(ps_(facile|normal|expert|m([1-9]|1[0-2]))|pd_\d{8}_(facile|normal|expert))$/;
const WEEK_RE = /^w_\d{6}$/;
const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

let db = { players: {} };            // id -> { pseudo, svc, at, best:{key:pts}, weeks:{w_:pts} }
try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); if (!db.players) db.players = {}; } catch (e) {}
let dirty = false;
function save() { if (!dirty) return; dirty = false; const tmp = DATA + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DATA); }
setInterval(save, 3000);
process.on('SIGTERM', () => { save(); process.exit(0); });
process.on('SIGINT', () => { save(); process.exit(0); });

// nettoyage : semaines de plus de 8 semaines, défis de plus de 21 jours
function prune() {
  const now = new Date(), wk = isoWeek(now), cutW = wk - 8;
  const cutD = +new Date(now - 21 * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
  for (const p of Object.values(db.players)) {
    for (const k of Object.keys(p.weeks || {})) if (+k.slice(2) < cutW) delete p.weeks[k];
    for (const k of Object.keys(p.best || {})) if (k.startsWith('pd_') && +k.slice(3, 11) < cutD) delete p.best[k];
  }
  dirty = true;
}
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y * 100 + w; }
setInterval(prune, 6 * 3600e3); prune();

// limite : 40 requêtes d'écriture par minute et par IP
const hits = new Map();
function limited(ip) { const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60e3); h.push(now); hits.set(ip, h); return h.length > 40; }
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 60e3)) hits.delete(k); }, 60e3);

function send(res, req, code, obj) {
  const origin = req.headers.origin || '';
  const allow = ORIGINS.includes('*') ? '*' : (ORIGINS.includes(origin) ? origin : ORIGINS[0]);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', 'Vary': 'Origin' });
  res.end(JSON.stringify(obj));
}
const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, req, 204, {});
  if (req.method === 'GET' && url.pathname === '/health') return send(res, req, 200, { ok: true, players: Object.keys(db.players).length });
  if (req.method === 'GET' && url.pathname === '/scores') {
    const key = url.searchParams.get('key') || '', lim = Math.min(50, +url.searchParams.get('limit') || 20);
    if (!KEY_RE.test(key)) return send(res, req, 400, { error: 'clé invalide' });
    const rows = Object.entries(db.players).filter(([, p]) => p.best && p.best[key] > 0).map(([id, p]) => ({ id, pseudo: p.pseudo || 'Anonyme', t: p.best[key] }))
      .sort((a, b) => b.t - a.t).slice(0, lim);
    return send(res, req, 200, { key, rows });
  }
  if (req.method === 'GET' && url.pathname === '/services') {
    const wk = url.searchParams.get('week') || '';
    if (!WEEK_RE.test(wk)) return send(res, req, 400, { error: 'semaine invalide' });
    const agg = {};
    for (const [id, p] of Object.entries(db.players)) { const v = p.weeks && p.weeks[wk]; if (!(v > 0) || !SERVICES.includes(p.svc)) continue; (agg[p.svc] = agg[p.svc] || { s: p.svc, t: 0, n: 0, ids: [] }); agg[p.svc].t += v; agg[p.svc].n++; agg[p.svc].ids.push(id); }
    return send(res, req, 200, { week: wk, rows: Object.values(agg).sort((a, b) => b.t - a.t) });
  }
  if (req.method === 'POST' && url.pathname === '/score') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return send(res, req, 429, { error: 'trop de requêtes' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      let q; try { q = JSON.parse(body); } catch (e) { return send(res, req, 400, { error: 'JSON invalide' }); }
      const pts = Math.round(+q.pts);
      if (!ID_RE.test(q.id || '') || !(pts > 0) || pts > MAX_SCORE) return send(res, req, 400, { error: 'données invalides' });
      const keys = Array.isArray(q.keys) ? q.keys.filter(k => KEY_RE.test(k)).slice(0, 3) : [];
      const p = db.players[q.id] || (db.players[q.id] = { best: {}, weeks: {} });
      p.pseudo = clean(q.pseudo) || p.pseudo || 'Comptable mystère';
      if (SERVICES.includes(q.svc)) p.svc = q.svc;
      p.at = Date.now();
      let better = false;
      for (const k of keys) if (!(p.best[k] > 0) || pts > p.best[k]) { p.best[k] = pts; better = true; }
      const wk = 'w_' + isoWeek(new Date());
      p.weeks[wk] = (p.weeks[wk] || 0) + pts;
      dirty = true;
      send(res, req, 200, { ok: true, better, week: wk });
    });
    return;
  }
  send(res, req, 404, { error: 'introuvable' });
}).listen(PORT, '127.0.0.1', () => console.log('cloture-scores sur le port ' + PORT));

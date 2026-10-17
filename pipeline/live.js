// Risultati in diretta: a ogni giro (ogni 5 minuti circa) legge da API-Football le partite di oggi, e dopo mezzanotte anche quelle
// di ieri sera, dei campionati dell'app. Scrive live/live.json: id partita -> [gol casa, gol trasferta, stato, minuto, recupero].
// Una o due richieste per giro. Lo pubblica il workflow "Risultati live" sul ramo "live", da cui lo legge l'app.
'use strict';
const fs = require('fs'), path = require('path');
const LEAGUES = require('./leagues');
const KEY = process.env.APISPORTS_KEY || '', BASE = process.env.API_BASE || 'https://v3.football.api-sports.io';
const state = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'store', 'state.json'), 'utf8')); } catch (e) { return {}; } })();
const ids = new Set(); LEAGUES.forEach(l => { if (l.id) ids.add(l.id); (((state.lids || {})[l.lg] || {}).ids || []).forEach(i => ids.add(i)); });
const LIVE = { '1H': 1, HT: 1, '2H': 1, ET: 1, BT: 1, P: 1, LIVE: 1, INT: 1, SUSP: 1 }, DONE = { FT: 1, AET: 1, PEN: 1 };
const romeYmd = t => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
(async () => {
  if (!KEY && !process.env.API_BASE) { console.log('Manca la chiave APISPORTS_KEY'); return; }
  const now = Date.now(), hour = +new Date(now).toLocaleString('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false });
  const days = hour < 7 ? [romeYmd(now - 864e5), romeYmd(now)] : [romeYmd(now)];
  const out = { t: now, m: {} }; let rem = null;
  for (const d of days) {
    const r = await fetch(BASE + '/fixtures?date=' + d + '&timezone=Europe/Rome', { headers: { 'x-apisports-key': KEY } });
    rem = r.headers.get('x-ratelimit-requests-remaining'); const j = await r.json();
    (j.response || []).forEach(f => {
      if (!ids.has(f.league && f.league.id)) return; const s = (f.fixture && f.fixture.status) || {};
      if (!LIVE[s.short] && !DONE[s.short]) return;
      out.m[String(f.fixture.id)] = [f.goals.home, f.goals.away, s.short, s.elapsed || 0, s.extra || 0];
    });
  }
  fs.mkdirSync('live', { recursive: true }); fs.writeFileSync(path.join('live', 'live.json'), JSON.stringify(out));
  console.log('partite in corso o finite oggi: ' + Object.keys(out.m).length + ' | richieste rimaste oggi: ' + rem);
})().catch(e => { console.error(e); process.exit(1); });

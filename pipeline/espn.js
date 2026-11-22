// Fonte di riserva gratuita, senza chiave: i dati pubblici di ESPN. Si usa quando API-Football non risponde
// (abbonamento scaduto o account sospeso). Aggiorna lo stesso archivio (store/) con gli stessi formati:
// risultati, calendario, statistiche di squadra (tiri, tiri in porta, corner, falli, ammonizioni), giocatori, formazioni e classifiche.
// ESPN usa codici suoi per squadre, giocatori e competizioni: l'abbinamento ai nostri si ricava confrontando le partite già
// in archivio (stesso orario, stesso risultato, nomi simili) e, per i giocatori, nome e numero di maglia.
// Copre le competizioni principali (circa 200 partite al giorno); le serie minori che ESPN non segue restano ferme.
'use strict';
const fs = require('fs'), path = require('path');
const LEAGUES = require('./leagues'), Auto = require('./auto');
const ROOT = path.join(__dirname, '..', 'store'), DAY = 864e5;
const SB = 'https://site.api.espn.com/apis/site/v2/sports/soccer', ST = 'https://site.api.espn.com/apis/v2/sports/soccer';
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return d; } };
const writeJ = (f, v) => { const p = path.join(ROOT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = readJ('state.json', {}), teams = readJ('teams.json', {});
const E = state.espn = state.espn || {};
['tv', 'lv', 'ev', 'pmap', 'slug', 'stand'].forEach(k => { E[k] = E[k] || {}; });
const now = Date.now();
function note(s) { console.log(s); state.log = (state.log || []).concat(new Date().toISOString().slice(0, 16) + ' ESPN: ' + s).slice(-60); }

// archivio
const fx = {}; LEAGUES.forEach(l => { fx[l.lg] = readJ('fx/' + l.lg + '.json', {}); });
Auto.leagues(state).forEach(l => { fx[l.lg] = readJ('fx/' + l.lg + '.json', {}); });
const touched = {};
const DONE = { FT: 1, AET: 1, PEN: 1 };

let nReq = 0;
async function get(url) {
  for (let k = 0; k < 3; k++) {
    try {
      nReq++; const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (OverLab)', accept: 'application/json' } });
      if (r.status === 404 || r.status === 400) return null;
      if (r.ok) return await r.json();
    } catch (e) { }
    await sleep(800 * (k + 1));
  }
  return null;
}
// nomi: minuscole, senza accenti e senza parole comuni
const STOP = new Set('fc cf afc sc ac ssc club de del da do la le el calcio the cd ud sd rc fk sk if bk as us cs sv vfb vfl tsg rcd ca cr se ec sa bc 1 2 u19 u20 u21 u23 w women femminile'.split(' '));
const toks = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t));
function sim(a, b) {
  const A = toks(a), B = toks(b); if (!A.length || !B.length) return 0;
  let hit = 0; A.forEach(x => { if (B.some(y => y === x || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))))) hit++; });
  return hit / Math.min(A.length, B.length);
}
const argmax = o => { let b = null, bv = 0; Object.keys(o || {}).forEach(k => { if (o[k] > bv) { bv = o[k]; b = k; } }); return b; };
const ymd = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');

// stato ESPN -> stato nostro
function status(t) {
  const n = (t && t.name) || '', st = t && t.state;
  if (t && t.completed) return /PEN|SHOOTOUT/.test(n) ? 'PEN' : /AET|OT/.test(n) ? 'AET' : /ABANDON/.test(n) ? 'ABD' : /CANCEL/.test(n) ? 'CANC' : /POSTPON/.test(n) ? 'PST' : 'FT';
  if (/POSTPON/.test(n)) return 'PST'; if (/CANCEL/.test(n)) return 'CANC'; if (/ABANDON/.test(n)) return 'ABD'; if (/SUSPEND/.test(n)) return 'SUSP';
  if (st === 'in') return /HALFTIME/.test(n) ? 'HT' : /SHOOTOUT/.test(n) ? 'P' : /EXTRA|OVERTIME/.test(n) ? 'ET' : /SECOND/.test(n) ? '2H' : '1H';
  return 'NS';
}
const sv = (arr, name) => { const x = (arr || []).find(s => s.name === name); if (!x) return null; const v = parseFloat(x.value != null ? x.value : x.displayValue); return isFinite(v) ? v : null; };
function parseEvent(e) {
  const c = (e.competitions || [])[0]; if (!c) return null;
  const H = (c.competitors || []).find(x => x.homeAway === 'home'), A = (c.competitors || []).find(x => x.homeAway === 'away'); if (!H || !A) return null;
  const L = ((e.uid || '').match(/l:(\d+)/) || [])[1] || '';
  const s = status((c.status || e.status || {}).type), sc = s !== 'NS' && H.score != null && A.score != null && H.score !== '' ? [+H.score, +A.score] : null;
  const yc = { [H.team.id]: 0, [A.team.id]: 0 }; (c.details || []).forEach(d => { if (d.yellowCard && d.team && yc[d.team.id] != null) yc[d.team.id]++; });
  const st = x => { const a = x.statistics; if (!a || !a.length) return null; const sh = sv(a, 'totalShots'), sot = sv(a, 'shotsOnTarget'), co = sv(a, 'wonCorners'), fo = sv(a, 'foulsCommitted');
    if (sh == null && fo == null) return null; return { sh: sh || 0, sot: sot || 0, co: co || 0, fo: fo || 0, yc: yc[x.team.id] || 0 }; };
  let HS = DONE[s] ? st(H) : null, AS = DONE[s] ? st(A) : null;
  if (HS && AS && HS.sh + AS.sh === 0 && HS.co + AS.co === 0) { HS = null; AS = null; }   // tutte a zero: ESPN non ha le statistiche di questa partita
  return { id: String(e.id), L, d: Date.parse(e.date), s, sc, se: e.season && e.season.year,
    h: { id: String(H.team.id), n: H.team.displayName || H.team.name, l: H.team.logo }, a: { id: String(A.team.id), n: A.team.displayName || A.team.name, l: A.team.logo },
    H: HS, A: AS };
}

(async () => {
  if (state.apiOk && !process.env.FORCE_ESPN) { console.log('API-Football funziona: ESPN non serve'); return; }
  const t0 = Date.now();
  // 1) calendario e risultati: dal giorno dopo l'ultimo aggiornamento (al primo giro anche due settimane prima, per imparare gli abbinamenti)
  const first = !E.boot, from = first ? now - 21 * DAY : Math.min(now - 3 * DAY, E.lastOk ? E.lastOk - DAY : now - 3 * DAY);
  const days = []; for (let t = from; t <= now + 7 * DAY; t += DAY) days.push(ymd(t));
  const evs = {};
  for (const d of days) {
    const j = await get(SB + '/all/scoreboard?dates=' + d + '&limit=1000'); await sleep(120);
    ((j && j.events) || []).forEach(e => { const p = parseEvent(e); if (p) evs[p.id] = p; });
  }
  const list = Object.values(evs);
  note('partite lette: ' + list.length + ' in ' + days.length + ' giorni');
  // 2) abbinamenti: partite già in archivio con lo stesso orario e lo stesso risultato
  const byMin = {};
  Object.keys(fx).forEach(lg => Object.values(fx[lg]).forEach(m => { if (!DONE[m.s] || !m.sc || String(m.id).charAt(0) === 'e') return; const k = Math.round(m.d / 6e5); (byMin[k] = byMin[k] || []).push(m); }));
  let nv = 0;
  list.forEach(p => {
    if (!DONE[p.s] || !p.sc) return;
    const k = Math.round(p.d / 6e5), cands = [].concat(byMin[k - 1] || [], byMin[k] || [], byMin[k + 1] || []).filter(m => m.sc[0] === p.sc[0] && m.sc[1] === p.sc[1]);
    if (!cands.length) return;
    let best = null, bs = -1; cands.forEach(m => { const s = sim(p.h.n, (teams[m.h] || {}).n) + sim(p.a.n, (teams[m.a] || {}).n); if (s > bs) { bs = s; best = m; } });
    if (!(bs >= 0.5 || (cands.length === 1 && bs > 0))) return;
    const v = (o, a, b) => { o[a] = o[a] || {}; o[a][b] = (o[a][b] || 0) + 1; };
    v(E.tv, p.h.id, best.h); v(E.tv, p.a.id, best.a); if (p.L) v(E.lv, p.L, best.lg); nv++;
    E.ev[p.id] = [best.lg, best.id, p.d];
  });
  const tmap = {}; Object.keys(E.tv).forEach(k => { tmap[k] = argmax(E.tv[k]); });
  const lmap = {}; Object.keys(E.lv).forEach(k => { const b = argmax(E.lv[k]), tot = Object.values(E.lv[k]).reduce((a, x) => a + x, 0); if (b && E.lv[k][b] >= 0.6 * tot) lmap[k] = b; });
  note('abbinamenti: ' + nv + ' partite riconosciute, ' + Object.keys(tmap).length + ' squadre, ' + Object.keys(lmap).length + ' competizioni');
  // squadre senza abbinamento: nome simile tra le squadre della stessa competizione, altrimenti squadra nuova ("e" + codice ESPN)
  const lgTeams = {}; const teamsOf = lg => { if (lgTeams[lg]) return lgTeams[lg]; const s = {}; Object.values(fx[lg] || {}).forEach(m => { if (m.d > now - 400 * DAY) { s[m.h] = 1; s[m.a] = 1; } }); return (lgTeams[lg] = Object.keys(s)); };
  const newLogos = [];
  function teamOf(t, lg) {
    if (tmap[t.id]) return tmap[t.id];
    let best = null, bs = 0, b2 = 0; teamsOf(lg).forEach(id => { const s = sim(t.n, (teams[id] || {}).n); if (s > bs) { b2 = bs; bs = s; best = id; } else if (s > b2) b2 = s; });
    if (best && (bs >= 0.75 || (bs >= 0.5 && b2 < bs))) { tmap[t.id] = best; E.tv[t.id] = { [best]: 1 }; return best; }
    const id = 'e' + t.id; if (!teams[id]) { teams[id] = { n: t.n, l: t.l ? 'https://a.espncdn.com/combiner/i?img=' + encodeURIComponent(t.l.replace(/^https?:\/\/a\.espncdn\.com/, '')) + '&w=80&h=80' : '' }; newLogos.push(id); }
    tmap[t.id] = id; return id;
  }
  // 3) aggiornamento delle partite (solo dopo l'ultimo dato di API-Football: prima servono solo per gli abbinamenti)
  let apiLast = 0; Object.keys(fx).forEach(lg => Object.values(fx[lg]).forEach(m => { if (DONE[m.s] && String(m.id).charAt(0) !== 'e' && !m.ex && m.d > apiLast && m.d < now) apiLast = m.d; }));
  // una squadra non riconosciuta si ricava dalla partita in calendario con lo stesso avversario (o, se mancano tutte e due, alla stessa ora)
  function inferTeams(p, lg) {
    const hm = tmap[p.h.id], am = tmap[p.a.id]; if (hm && am) return;
    const near = Object.values(fx[lg]).filter(m => Math.abs(m.d - p.d) < 2 * DAY);
    if (hm && !am) { const c = near.filter(m => m.h === hm); if (c.length === 1) { tmap[p.a.id] = c[0].a; E.tv[p.a.id] = { [c[0].a]: 1 }; } return; }
    if (am && !hm) { const c = near.filter(m => m.a === am); if (c.length === 1) { tmap[p.h.id] = c[0].h; E.tv[p.h.id] = { [c[0].h]: 1 }; } return; }
    const c = near.filter(m => Math.abs(m.d - p.d) < 45 * 6e4).map(m => [m, sim(p.h.n, (teams[m.h] || {}).n) + sim(p.a.n, (teams[m.a] || {}).n)]).sort((x, y) => y[1] - x[1]);
    if (c.length && c[0][1] >= 0.6 && (c.length === 1 || c[1][1] < c[0][1])) { tmap[p.h.id] = c[0][0].h; tmap[p.a.id] = c[0][0].a; E.tv[p.h.id] = { [c[0][0].h]: 1 }; E.tv[p.a.id] = { [c[0][0].a]: 1 }; }
  }
  let nUp = 0, nNew = 0, nRes = 0; const needSum = [];
  list.sort((x, y) => x.d - y.d).forEach(p => {
    const lg = lmap[p.L]; if (!lg || !fx[lg]) return;
    if (p.d < apiLast - 3 * 36e5) return;
    inferTeams(p, lg);
    const h = teamOf(p.h, lg), a = teamOf(p.a, lg);
    let m = E.ev[p.id] && fx[lg][E.ev[p.id][1]];
    if (!m) m = Object.values(fx[lg]).find(x => x.h === h && x.a === a && Math.abs(x.d - p.d) < 5 * DAY && (!x.ex || x.ex === p.id) && !(DONE[x.s] && x.det && String(x.id).charAt(0) !== 'e' && Math.abs(x.d - p.d) > 3 * 36e5));
    if (!m) { m = fx[lg]['e' + p.id] = { id: 'e' + p.id, lg, d: p.d, h, a, s: 'NS', sc: null }; nNew++; }
    if (DONE[m.s] && m.det === 1 && String(m.id).charAt(0) !== 'e' && !m.ex) { E.ev[p.id] = [lg, m.id, p.d]; return; }   // già completa da API-Football
    const wasDone = !!DONE[m.s];
    m.ex = p.id; m.d = p.d; m.s = p.s; if (p.se) m.se = p.se; if (p.sc) m.sc = p.sc;
    if (p.H) m.H = p.H; if (p.A) m.A = p.A;
    if (DONE[p.s] && !wasDone) nRes++;
    E.ev[p.id] = [lg, m.id, p.d]; touched[lg] = 1; nUp++;
    if (DONE[p.s] && m.det !== 1) needSum.push([p, m, 0]);
    else if (p.s === 'NS' && p.d - now < 3 * 36e5 && p.d > now - 36e5) needSum.push([p, m, 1]);   // formazioni ufficiali
  });
  note('dati API-Football fino al ' + new Date(apiLast).toISOString().slice(0, 16) + '; partite aggiornate: ' + nUp + ' (nuove ' + nNew + ', risultati nuovi ' + nRes + ')');
  // 4) dettagli (giocatori e formazioni): prima le formazioni delle partite vicine, poi i risultati più recenti
  const pmap = E.pmap;
  const rosterOf = {};
  function playersOf(team) {
    if (rosterOf[team]) return rosterOf[team];
    const o = {};
    Object.keys(fx).forEach(lg => Object.values(fx[lg]).forEach(m => { if ((m.h === team || m.a === team) && m.P && m.d > now - 200 * DAY) m.P.forEach(r => { if (r[0] === team) { const x = o[r[1]] = o[r[1]] || { n: r[2], num: r[11], pos: r[3], d: 0 }; if (m.d > x.d) { x.d = m.d; x.n = r[2]; if (r[11]) x.num = r[11]; if (r[3]) x.pos = r[3]; } } }); }));
    return (rosterOf[team] = o);
  }
  const posOf = ab => { ab = String(ab || '').toUpperCase(); if (ab === 'G' || ab === 'GK') return 'G'; if (ab === 'SUB' || !ab) return ''; if (/^(F|CF|ST|LF|RF|SS)$/.test(ab) || /^(F|CF)-/.test(ab)) return 'F';
    if (/^(CD|CB|LB|RB|LWB|RWB|SW|D)/.test(ab) || /^D-/.test(ab)) return 'D'; return 'M'; };
  function pid(team, ath, jersey) {
    if (pmap[ath.id]) return pmap[ath.id];
    const ro = playersOf(team); let best = null, bs = 0;
    const sn = toks(ath.shortName), dn = toks(ath.displayName), last = dn[dn.length - 1] || '', ini = (dn[0] || '').charAt(0);
    Object.keys(ro).forEach(id => {
      if (String(id).charAt(0) === 'e') return;
      const t = toks(ro[id].n); let s = 0;
      if (t.join(' ') === dn.join(' ') || t.join(' ') === sn.join(' ')) s = 1;
      else if (last && t.indexOf(last) >= 0) { s = 0.6; const f = t[0] || ''; if (f.charAt(0) === ini) s = 0.85; }
      if (s && jersey && ro[id].num && String(ro[id].num) === String(jersey)) s += 0.3;
      if (s > bs) { bs = s; best = id; }
    });
    const id = best && bs >= 0.85 ? best : 'e' + ath.id; pmap[ath.id] = id; return id;
  }
  needSum.sort((x, y) => (y[2] - x[2]) || (y[0].d - x[0].d));
  const MAXSUM = +(process.env.ESPN_MAX_DETAILS || 450); let nSum = 0, nP = 0, nLu = 0;
  for (const [p, m, pre] of needSum) {
    if (nSum >= MAXSUM || Date.now() - t0 > 11 * 6e4) break;
    const j = await get(SB + '/all/summary?event=' + p.id); nSum++; await sleep(80);
    if (!j) continue;
    if (j.header && j.header.league && j.header.league.slug && p.L) E.slug[p.L] = j.header.league.slug;
    const ros = j.rosters || []; if (!ros.length) { if (!pre) m.det = -1; continue; }
    // minuti: cambi e espulsioni dagli eventi della partita
    const inM = {}, outM = {}, sub = {}; ros.forEach(r => (r.roster || []).forEach(x => { if (x.athlete) sub[x.athlete.id] = x; }));
    const end = m.s === 'AET' || m.s === 'PEN' ? 120 : 90;
    (j.keyEvents || []).forEach(k => {
      const ty = ((k.type && (k.type.type || k.type.text)) || '').toLowerCase(), mn = Math.min(end, Math.max(1, Math.round(((k.clock && k.clock.value) || 0) / 60)));
      if (/substitution/.test(ty)) (k.participants || []).forEach(q => { const id = q.athlete && q.athlete.id, x = sub[id]; if (!x) return; if (x.subbedIn && inM[id] == null) inM[id] = mn; else if (x.subbedOut && outM[id] == null) outM[id] = mn; });
      if (/red/.test(ty)) (k.participants || []).forEach(q => { const id = q.athlete && q.athlete.id; if (id && outM[id] == null) outM[id] = mn; });
    });
    const tOf = r => { const eid = String(r.team && r.team.id); return eid === p.h.id ? m.h : eid === p.a.id ? m.a : null; };
    if (!pre && DONE[m.s]) {
      const P = [];
      ros.forEach(r => { const team = tOf(r); if (!team) return; (r.roster || []).forEach(x => {
        if (!x.athlete) return; const s = x.stats || [], app = sv(s, 'appearances'); if (!x.starter && !x.subbedIn && !app) return;
        const st = x.starter ? 1 : 0, a = st ? 0 : (inM[x.athlete.id] != null ? inM[x.athlete.id] : end - 15), b = outM[x.athlete.id] != null ? outM[x.athlete.id] : end;
        const min = Math.max(1, b - a), id = pid(team, x.athlete, x.jersey), ro = playersOf(team);
        const pos = posOf(x.position && x.position.abbreviation) || (ro[id] && ro[id].pos) || '';
        P.push([team, id, x.athlete.shortName || x.athlete.displayName || '?', pos, st, min, sv(s, 'totalShots') || 0, sv(s, 'shotsOnTarget') || 0, sv(s, 'foulsCommitted') || 0, sv(s, 'foulsSuffered') || 0, sv(s, 'yellowCards') || 0, x.jersey != null ? String(x.jersey) : '']);
      }); });
      if (P.length) { m.P = P; m.det = 1; nP++; } else m.det = -1;
    }
    const lu = ros.map(r => { const team = tOf(r); if (!team) return null; const rr = r.roster || [], ro = playersOf(team);
      const one = x => { const id = pid(team, x.athlete, x.jersey); return [id, x.athlete.shortName || x.athlete.displayName, posOf(x.position && x.position.abbreviation) || (ro[id] && ro[id].pos) || '', x.jersey != null ? String(x.jersey) : '']; };
      const xi = rr.filter(x => x.starter && x.athlete).map(one); if (xi.length < 11) return null;
      return { t: team, x: xi, b: rr.filter(x => !x.starter && x.athlete).map(one) }; }).filter(Boolean);
    if (lu.length === 2) { m.lu = lu; nLu++; }
    touched[m.lg] = 1;
  }
  note('dettagli: ' + nSum + ' richieste, giocatori di ' + nP + ' partite, formazioni ' + nLu + (needSum.length > nSum ? ' (ne mancano ' + (needSum.length - nSum) + ', al prossimo giro)' : ''));
  // 5) classifiche delle competizioni con partite nei prossimi 4 giorni (una volta al giorno)
  const lgSlug = {}; Object.keys(lmap).forEach(L => { if (E.slug[L]) lgSlug[lmap[L]] = E.slug[L]; });
  const soon = {}; list.forEach(p => { const lg = lmap[p.L]; if (lg && p.s === 'NS' && p.d > now && p.d < now + 4 * DAY) soon[lg] = 1; });
  let nSt = 0;
  for (const lg of Object.keys(soon)) {
    const slug = lgSlug[lg]; if (!slug || (E.stand[lg] && now - E.stand[lg] < 20 * 36e5)) continue;
    const j = await get(ST + '/' + slug + '/standings'); await sleep(100); E.stand[lg] = now; if (!j) continue;
    const groups = (j.children && j.children.length ? j.children : [j]).map(c => ({ n: c.name || '', e: (c.standings && c.standings.entries) || [] })).filter(g => g.e.length);
    const L = Object.keys(lmap).find(k => lmap[k] === lg);
    const out = { t: now, src: 'espn', g: groups.map(g => {
      const d = [], di = t => { if (!t) return -1; let i = d.indexOf(t); if (i < 0) { d.push(t); i = d.length - 1; } return i; };
      const rows = g.e.map(x => { const s = x.stats || [], team = teamOf({ id: String(x.team.id), n: x.team.displayName, l: (x.team.logos && x.team.logos[0] && x.team.logos[0].href) || '' }, lg);
        return [team, sv(s, 'rank') || 0, sv(s, 'points') || 0, sv(s, 'gamesPlayed') || 0, sv(s, 'wins') || 0, sv(s, 'ties') || 0, sv(s, 'losses') || 0, sv(s, 'pointsFor') || 0, sv(s, 'pointsAgainst') || 0, di(x.note && x.note.description), '']; });
      rows.sort((a, b) => (a[1] || 99) - (b[1] || 99) || b[2] - a[2] || (b[7] - b[8]) - (a[7] - a[8]));
      rows.forEach((r, i) => { r[1] = i + 1; });
      return { n: g.n, d, r: rows }; }) };
    if (out.g.length) { writeJ('stand/' + lg + '.json', out); nSt++; }
    void L;
  }
  if (nSt) note('classifiche: ' + nSt);
  // 6) stemmi delle squadre nuove
  const LOGOS = path.join(ROOT, 'logos'); fs.mkdirSync(LOGOS, { recursive: true }); let nl = 0;
  for (const id of newLogos.slice(0, 300)) { try { const r = await fetch(teams[id].l); if (r.ok) { fs.writeFileSync(path.join(LOGOS, id + '.png'), Buffer.from(await r.arrayBuffer())); nl++; } } catch (e) { } }
  // pulizia: abbinamenti partita più vecchi di 40 giorni
  Object.keys(E.ev).forEach(k => { if (E.ev[k][2] < now - 40 * DAY) delete E.ev[k]; });
  E.boot = 1; E.lastOk = now;
  Object.keys(touched).forEach(lg => writeJ('fx/' + lg + '.json', fx[lg]));
  writeJ('teams.json', teams);
  note('giro finito: ' + nReq + ' richieste, ' + Object.keys(touched).length + ' competizioni aggiornate, stemmi nuovi ' + nl + ', ' + Math.round((Date.now() - t0) / 1000) + ' s');
  writeJ('state.json', state);
})().catch(e => { console.log('errore ESPN: ' + (e && e.stack || e)); process.exitCode = 0; });

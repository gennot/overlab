/* Dati in diretta (ESPN) + calcolo pronostici squadre e giocatori. Nessun DOM qui. */
var Core = (function () {
  'use strict';
  var API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
  var COMPS = [
    { id: 'ita.1', name: 'Serie A', grp: 'Italia', pool: ['ita.1'] },
    { id: 'ita.2', name: 'Serie B', grp: 'Italia', pool: ['ita.2'] },
    { id: 'eng.1', name: 'Premier League', grp: 'Inghilterra', pool: ['eng.1'] },
    { id: 'eng.2', name: 'Championship', grp: 'Inghilterra', pool: ['eng.2'] },
    { id: 'eng.3', name: 'League One', grp: 'Inghilterra', pool: ['eng.3'] },
    { id: 'eng.4', name: 'League Two', grp: 'Inghilterra', pool: ['eng.4'] },
    { id: 'esp.1', name: 'LaLiga', grp: 'Spagna', pool: ['esp.1'] },
    { id: 'esp.2', name: 'LaLiga 2', grp: 'Spagna', pool: ['esp.2'] },
    { id: 'ger.1', name: 'Bundesliga', grp: 'Germania', pool: ['ger.1'] },
    { id: 'ger.2', name: '2. Bundesliga', grp: 'Germania', pool: ['ger.2'] },
    { id: 'fra.1', name: 'Ligue 1', grp: 'Francia', pool: ['fra.1'] },
    { id: 'fra.2', name: 'Ligue 2', grp: 'Francia', pool: ['fra.2'] },
    { id: 'ned.1', name: 'Eredivisie (Olanda)', grp: 'Altri campionati europei', pool: ['ned.1'] },
    { id: 'por.1', name: 'Primeira Liga (Portogallo)', grp: 'Altri campionati europei', pool: ['por.1'] },
    { id: 'bel.1', name: 'Pro League (Belgio)', grp: 'Altri campionati europei', pool: ['bel.1'] },
    { id: 'tur.1', name: 'Süper Lig (Turchia)', grp: 'Altri campionati europei', pool: ['tur.1'] },
    { id: 'sco.1', name: 'Premiership (Scozia)', grp: 'Altri campionati europei', pool: ['sco.1'] },
    { id: 'gre.1', name: 'Super League (Grecia)', grp: 'Altri campionati europei', pool: ['gre.1'] },
    { id: 'aut.1', name: 'Bundesliga (Austria)', grp: 'Altri campionati europei', pool: ['aut.1'] },
    { id: 'den.1', name: 'Superliga (Danimarca)', grp: 'Altri campionati europei', pool: ['den.1'] },
    { id: 'nor.1', name: 'Eliteserien (Norvegia)', grp: 'Altri campionati europei', pool: ['nor.1'] },
    { id: 'swe.1', name: 'Allsvenskan (Svezia)', grp: 'Altri campionati europei', pool: ['swe.1'] },
    { id: 'bra.1', name: 'Brasileirão (Brasile)', grp: 'Americhe', pool: ['bra.1'] },
    { id: 'arg.1', name: 'Liga Profesional (Argentina)', grp: 'Americhe', pool: ['arg.1'] },
    { id: 'usa.1', name: 'MLS (Stati Uniti)', grp: 'Americhe', pool: ['usa.1'] },
    { id: 'uefa.nations', name: 'Nations League', grp: 'Nazionali', nat: true, pool: ['uefa.nations', 'fifa.worldq.uefa', 'fifa.world', 'fifa.friendly'] }
  ];
  var STAT_IT = { sh: 'Tiri', sot: 'Tiri in porta', co: 'Corner', fo: 'Falli commessi', yc: 'Cartellini gialli' };
  var PST = ['sh', 'sot', 'fc', 'fs'];
  var PST_IT = { sh: 'tiri', sot: 'tiri in porta', fc: 'falli commessi', fs: 'falli subiti', yc: 'cartellini gialli', gl: 'gol' };
  var PST_1 = { sh: 'tiro', sot: 'tiro in porta', fc: 'fallo commesso', fs: 'fallo subito' };
  // quota media delle azioni di squadra per ruolo (ogni 90'), dal test su Premier 2024-25
  var PRIOR = { D: { sh: 0.045, sot: 0.037, fc: 0.078, fs: 0.064 }, M: { sh: 0.124, sot: 0.121, fc: 0.116, fs: 0.119 }, F: { sh: 0.204, sot: 0.254, fc: 0.117, fs: 0.119 }, G: { sh: 0.002, sot: 0.001, fc: 0.008, fs: 0.02 } };
  var PK = { sh: 40, sot: 40, fc: 80, fs: 40 };   // smorzamento giocatori (tarato)
  var PR = 6;                                      // dispersione giocatori (tarata)
  var NREC = 12;                                   // partite recenti per squadra usate per i giocatori

  /* ---------- memoria locale ---------- */
  var mem = {};
  var store = {
    noLocal: false,
    preload: function (o) { for (var k in o) mem[k] = o[k]; },
    dump: function () { return mem; },
    get: function (k) { if (k in mem) return mem[k]; if (store.noLocal) return null; try { var v = localStorage.getItem('pc:' + k); return v ? (mem[k] = JSON.parse(v)) : null; } catch (e) { return null; } },
    set: function (k, v) {
      mem[k] = v; if (store.noLocal) return; var s = JSON.stringify(v);
      for (var tries = 0; tries < 3; tries++) {
        try { localStorage.setItem('pc:' + k, s); return; } catch (e) { if (!store.evict()) return; }
      }
    },
    evict: function () { // libera spazio togliendo i dettagli partita più vecchi
      try {
        var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('pc:sm:') === 0) ks.push(k); }
        if (!ks.length) return false; ks.sort(); ks.slice(0, Math.max(5, ks.length >> 2)).forEach(function (k) { localStorage.removeItem(k); }); return true;
      } catch (e) { return false; }
    }
  };

  var fetchJson = function (url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  };
  function setFetch(f) { fetchJson = f; }

  /* ---------- lettura tabellone ---------- */
  var teams = {};
  var IT = { 'Internazionale': 'Inter', 'Inter Milan': 'Inter', 'AC Milan': 'Milan', 'AS Roma': 'Roma', 'Azerbaijan': 'Azerbaigian', 'Belarus': 'Bielorussia', 'Belgium': 'Belgio', 'Bosnia-Herzegovina': 'Bosnia ed Erzegovina', 'Bosnia and Herzegovina': 'Bosnia ed Erzegovina', 'Croatia': 'Croazia', 'Cyprus': 'Cipro', 'Czechia': 'Repubblica Ceca', 'Czech Republic': 'Repubblica Ceca', 'Denmark': 'Danimarca', 'England': 'Inghilterra', 'Faroe Islands': 'Isole Faroe', 'Finland': 'Finlandia', 'France': 'Francia', 'Germany': 'Germania', 'Gibraltar': 'Gibilterra', 'Greece': 'Grecia', 'Hungary': 'Ungheria', 'Iceland': 'Islanda', 'Israel': 'Israele', 'Italy': 'Italia', 'Kazakhstan': 'Kazakistan', 'Latvia': 'Lettonia', 'Lithuania': 'Lituania', 'Luxembourg': 'Lussemburgo', 'Moldova': 'Moldavia', 'Netherlands': 'Paesi Bassi', 'North Macedonia': 'Macedonia del Nord', 'Northern Ireland': 'Irlanda del Nord', 'Norway': 'Norvegia', 'Poland': 'Polonia', 'Portugal': 'Portogallo', 'Republic of Ireland': 'Irlanda', 'Ireland': 'Irlanda', 'Scotland': 'Scozia', 'Slovakia': 'Slovacchia', 'Spain': 'Spagna', 'Sweden': 'Svezia', 'Switzerland': 'Svizzera', 'Türkiye': 'Turchia', 'Turkey': 'Turchia', 'Ukraine': 'Ucraina', 'Wales': 'Galles' };
  function itName(n) { return IT[n] || n; }
  function statOf(arr, name) { if (!arr) return NaN; for (var i = 0; i < arr.length; i++) if (arr[i].name === name) return parseFloat(arr[i].displayValue != null ? arr[i].displayValue : arr[i].value); return NaN; }
  function parseEvent(e, lg) {
    var c = e.competitions && e.competitions[0]; if (!c || !c.competitors || c.competitors.length < 2) return null;
    var H = c.competitors[0].homeAway === 'home' ? c.competitors[0] : c.competitors[1];
    var A = H === c.competitors[0] ? c.competitors[1] : c.competitors[0];
    [H, A].forEach(function (t) { teams[t.team.id] = { n: itName(t.team.displayName), s: itName(t.team.shortDisplayName || t.team.abbreviation || t.team.displayName), l: t.team.logo || '' }; });
    var st = e.status && e.status.type || {};
    var m = { id: e.id, d: Date.parse(e.date), lg: lg, h: H.team.id, a: A.team.id, st: st.state || 'pre', done: !!st.completed, nm: st.name || '' };
    if (m.done) {
      var yc = {}; yc[m.h] = 0; yc[m.a] = 0;
      (c.details || []).forEach(function (d) { if (d.yellowCard && d.team && yc[d.team.id] != null) yc[d.team.id]++; });
      var side = function (t) { var s = t.statistics; return { sh: statOf(s, 'totalShots'), sot: statOf(s, 'shotsOnTarget'), co: statOf(s, 'wonCorners'), fo: statOf(s, 'foulsCommitted'), yc: yc[t.team.id] }; };
      m.H = side(H); m.A = side(A); m.sc = [parseInt(H.score, 10), parseInt(A.score, 10)];
      var ok = ['sh', 'sot', 'co', 'fo'].every(function (k) { return isFinite(m.H[k]) && isFinite(m.A[k]); });
      if (!ok || (m.H.sh === 0 && m.A.sh === 0 && m.H.fo === 0 && m.A.fo === 0)) { m.H = m.A = null; }
    }
    return m;
  }
  function loadBoard(lg, dates, maxAgeMs) {
    var key = 'sb:' + lg + ':' + dates, c = store.get(key);
    if (c && c.tm) for (var id in c.tm) teams[id] = c.tm[id];
    if (c && (maxAgeMs === Infinity || Date.now() - c.t < maxAgeMs)) return Promise.resolve(c.m);
    return fetchJson(API + lg + '/scoreboard?dates=' + dates + '&limit=1000').then(function (j) {
      var ms = (j.events || []).map(function (e) { return parseEvent(e, lg); }).filter(Boolean), tm = {};
      ms.forEach(function (m) { tm[m.h] = teams[m.h]; tm[m.a] = teams[m.a]; });
      store.set(key, { t: Date.now(), m: ms, tm: tm }); return ms;
    }).catch(function (err) { if (c) return c.m; throw err; });
  }
  function comp(id) { for (var i = 0; i < COMPS.length; i++) if (COMPS[i].id === id) return COMPS[i]; return null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // prossime partite: tabellone del mese (leggero), tutte le competizioni
  function loadUpcoming(force) {
    var now = new Date(), months = ['' + now.getFullYear() + pad(now.getMonth() + 1)];
    if (now.getDate() >= 22) { var n2 = new Date(now.getFullYear(), now.getMonth() + 1, 1); months.push('' + n2.getFullYear() + pad(n2.getMonth() + 1)); }
    var jobs = [];
    COMPS.forEach(function (c) { months.forEach(function (mo) { jobs.push(loadBoard(c.id, mo, force ? 0 : 30 * 6e4).then(function (ms) { return ms; }, function () { return null; })); }); });
    return Promise.all(jobs).then(function (res) {
      var all = [], failed = 0, seen = {};
      res.forEach(function (ms) { if (!ms) { failed++; return; } ms.forEach(function (m) { if (!seen[m.id] && !m.done && m.d > Date.now() - 3 * 36e5) { seen[m.id] = 1; all.push(m); } }); });
      if (failed === jobs.length) throw new Error('rete');
      all.sort(function (a, b) { return a.d - b.d; });
      return all;
    });
  }

  // storico completo di una competizione (anno scorso + anno in corso, per ogni torneo del gruppo)
  var compCache = {};
  function resetCache() { for (var k in compCache) delete compCache[k]; }
  var compLoader = null;                      // versione con dati salvati: carica il file della competizione solo quando serve
  function setCompLoader(f) { compLoader = f; }
  function loadComp(id, force) {
    if (compCache[id] && !force && Date.now() - compCache[id].t < 30 * 6e4) return Promise.resolve(compCache[id]);
    return (compLoader ? compLoader(id) : Promise.resolve()).then(function () { return loadComp2(id, force); });
  }
  function loadComp2(id, force) {
    var c = comp(id), Y = new Date().getFullYear(), jobs = [];
    c.pool.forEach(function (lg) {
      jobs.push(loadBoard(lg, '' + (Y - 1), Infinity).catch(function () { return []; }));
      jobs.push(loadBoard(lg, '' + Y, force ? 0 : 2 * 36e5));
    });
    return Promise.all(jobs).then(function (res) {
      var seen = {}, played = [], all = [];
      res.forEach(function (ms) { ms.forEach(function (m) { if (seen[m.id]) return; seen[m.id] = 1; all.push(m); if (m.done && m.H && m.A) { if (m.H.g == null && m.sc && isFinite(m.sc[0]) && isFinite(m.sc[1])) { m.H.g = m.sc[0]; m.A.g = m.sc[1]; } played.push(m); } }); });
      played.sort(function (a, b) { return a.d - b.d; });
      var par = Model.PAR;
      if (c.nat) { par = JSON.parse(JSON.stringify(Model.PAR)); Model.STATS.forEach(function (s) { par.half[s] = 540; par.k[s] = Math.max(par.k[s], 6); }); par.half.g = 700; par.k.g = 6; par.newTeam = { att: 1, def: 1 }; }
      var now = Date.now(), fit = Model.fitAll(played, now, par);
      return (compCache[id] = { t: Date.now(), comp: c, played: played, all: all, fit: fit, par: par });
    });
  }

  /* ---------- pronostico squadre ---------- */
  function lastN(played, team, n) {
    var out = [];
    for (var i = played.length - 1; i >= 0 && out.length < n; i--) {
      var m = played[i]; if (m.h === team) out.push({ m: m, f: m.H, c: m.A, home: true, opp: m.a }); else if (m.a === team) out.push({ m: m, f: m.A, c: m.H, home: false, opp: m.h });
    }
    return out;
  }
  function lines(mean, r, side) {
    // scaletta di linee .5 attorno al valore atteso
    var out = [], c = Math.round(mean), from = Math.max(0, c - 3);
    for (var k = from; k <= c + 2; k++) { var p = Model.pOver(k + 0.5, mean, r); if (p > 0.03 && p < 0.985) out.push({ line: k + 0.5, over: p, under: 1 - p }); }
    return out;
  }
  function teamForecast(cd, m) {
    var pr = Model.predict(cd.fit, m.h, m.a, {}, cd.par), out = { pr: pr, stats: {}, par: cd.par };
    // se ci sono le quote su esito e over 2,5: i gol che il mercato si aspetta correggono tiri e tiri in porta attesi
    // (nel test su 13.200 partite migliora la previsione; su corner, falli e cartellini no, quindi lì non si applica)
    var bk = bookOf(m), x = bk && bk.mk && bk.mk.x12, u = bk && bk.mk && bk.mk.uo && bk.mk.uo['2.5'];
    if (x && u && x[0] > 1 && x[1] > 1 && x[2] > 1 && u[0] > 1 && u[1] > 1 && pr.H.g > 0 && pr.A.g > 0) {
      var s3 = 1 / x[0] + 1 / x[1] + 1 / x[2], gm = Model.impliedGoals(1 / x[0] / s3, 1 / x[2] / s3, (1 / u[0]) / (1 / u[0] + 1 / u[1]), cd.par.rho);
      var cl = function (v) { return Math.min(2, Math.max(0.5, v)); };
      out.mkt = { gh: gm[0], ga: gm[1], rh: cl(gm[0] / pr.H.g), ra: cl(gm[1] / pr.A.g), adj: {} };
      [['sh', 0.2], ['sot', 0.5]].forEach(function (y) {
        var fh = Math.pow(out.mkt.rh, y[1]), fa = Math.pow(out.mkt.ra, y[1]);
        pr.H[y[0]] *= fh; pr.A[y[0]] *= fa; pr.T[y[0]] = pr.H[y[0]] + pr.A[y[0]]; out.mkt.adj[y[0]] = { H: fh, A: fa };
      });
    }
    Model.STATS.forEach(function (s) {
      var f = cd.fit[s];
      out.stats[s] = {
        H: { mean: pr.H[s], lines: lines(pr.H[s], cd.par.r[s]) },
        A: { mean: pr.A[s], lines: lines(pr.A[s], cd.par.r[s]) },
        T: { mean: pr.T[s], lines: lines(pr.T[s], cd.par.rTot[s]) },
        muH: f.muH, muA: f.muA,
        aH: f.A[m.h], dH: f.D[m.h], aA: f.A[m.a], dA: f.D[m.a]
      };
    });
    if (isFinite(pr.H.g) && isFinite(pr.A.g)) { out.res = Model.outcomes(pr.H.g, pr.A.g, cd.par.rho); out.res.lh = pr.H.g; out.res.la = pr.A.g;
      // goal/no goal: nel test su 26.396 partite la stima era troppo estrema (72% previsto, 62% reale): correzione tarata su metà delle partite e verificata sull'altra
      out.res.ggRaw = out.res.gg; out.res.gg = Math.min(0.97, Math.max(0.03, 0.229 + 0.582 * out.res.gg)); }
    out.nH = lastN(cd.played, m.h, 99).length; out.nA = lastN(cd.played, m.a, 99).length;
    return out;
  }

  /* ---------- dettagli partita (giocatori) ---------- */
  function posGroup(ab) {
    ab = (ab || '').toUpperCase();
    if (!ab || ab === 'SUB') return '';
    if (ab.charAt(0) === 'G') return 'G';
    if (ab.indexOf('F') >= 0 || ab === 'S' || ab === 'ST' || ab.indexOf('W') === 1) return 'F';
    if (ab.indexOf('M') >= 0) return 'M';
    return 'D';
  }
  function clockMin(p) {
    var pl = p.plays || [];
    for (var i = 0; i < pl.length; i++) if (pl[i].substitution) { var v = parseInt((pl[i].clock && pl[i].clock.displayValue) || '', 10); if (isFinite(v)) return Math.min(90, Math.max(1, v)); }
    return NaN;
  }
  function parseSummary(j, id) {
    var hc = j.header && j.header.competitions && j.header.competitions[0];
    var out = { id: id, d: hc ? Date.parse(hc.date) : 0, T: {}, P: [], off: false };
    ((j.boxscore && j.boxscore.teams) || []).forEach(function (t) {
      out.T[t.team.id] = { sh: statOf(t.statistics, 'totalShots'), sot: statOf(t.statistics, 'shotsOnTarget'), fo: statOf(t.statistics, 'foulsCommitted') };
    });
    (j.rosters || []).forEach(function (r) {
      var tid = r.team && r.team.id; if (!tid || !r.roster) return;
      r.roster.forEach(function (p) {
        if (!p.athlete) return;
        var min = 0, sIn = p.subbedIn === true || (p.subbedIn && p.subbedIn.didSub), sOut = p.subbedOut === true || (p.subbedOut && p.subbedOut.didSub), c = clockMin(p);
        if (p.starter) min = sOut ? (isFinite(c) ? c : 70) : 90; else if (sIn) min = isFinite(c) ? Math.max(1, 90 - c) : 20;
        var g = function (n) { var v = statOf(p.stats, n); return isFinite(v) ? v : 0; };
        out.P.push([tid, p.athlete.id, p.athlete.displayName || p.athlete.fullName || '?', posGroup(p.position && p.position.abbreviation), p.starter ? 1 : 0, min, g('totalShots'), g('shotsOnTarget'), g('foulsCommitted'), g('foulsSuffered'), g('yellowCards'), p.jersey || '']);
        if (p.starter) out.off = true;
      });
    });
    return out;
  }
  function loadSummary(lg, id, isPlayed) {
    var key = 'sm:' + id, c = store.get(key);
    if (c && isPlayed) return Promise.resolve(c);
    return fetchJson(API + lg + '/summary?event=' + id).then(function (j) { var s = parseSummary(j, id); if (isPlayed) store.set(key, s); return s; }).catch(function (e) { if (c) return c; throw e; });
  }
  function pool(items, n, fn) { // esegue al massimo n richieste insieme
    var i = 0, res = new Array(items.length);
    function next() { if (i >= items.length) return Promise.resolve(); var k = i++; return fn(items[k], k).then(function (v) { res[k] = v; }, function () { res[k] = null; }).then(next); }
    var ws = []; for (var w = 0; w < Math.min(n, items.length); w++) ws.push(next());
    return Promise.all(ws).then(function () { return res; });
  }

  // aggrega le ultime partite di una squadra in profili giocatore
  function buildSquad(team, sums) {
    var pl = {}, order = sums.slice().sort(function (a, b) { return b.d - a.d; });
    order.forEach(function (s, idx) {
      var T = s.T[team]; if (!T) return;
      var oppId = Object.keys(s.T).filter(function (t) { return t !== team; })[0], O = s.T[oppId] || {};
      var tot = { sh: T.sh, sot: T.sot, fc: T.fo, fs: O.fo };
      s.P.forEach(function (r) {
        if (r[0] !== team) return;
        var p = pl[r[1]] || (pl[r[1]] = { id: r[1], name: r[2], pos: '', jersey: r[11], apps: 0, squad: 0, nSt: 0, minSt: 0, nBench: 0, minSub: 0, score: 0, lastSquad: 99, y: { sh: 0, sot: 0, fc: 0, fs: 0 }, e: { sh: 0, sot: 0, fc: 0, fs: 0 }, m90: 0, yc: 0, last: [], posN: {} });
        p.squad++; if (idx < p.lastSquad) p.lastSquad = idx;
        if (r[3]) p.posN[r[3]] = (p.posN[r[3]] || 0) + (idx < 4 ? 2 : 1);
        if (r[4]) { p.nSt++; p.minSt += r[5]; if (idx < 5) p.score += 5 - idx; } else { p.nBench++; p.minSub += r[5]; }
        if (r[5] > 0) {
          p.apps++; p.m90 += r[5] / 90; p.yc += r[10];
          var vals = { sh: r[6], sot: r[7], fc: r[8], fs: r[9] };
          PST.forEach(function (k) { p.y[k] += vals[k]; if (isFinite(tot[k])) p.e[k] += tot[k] * r[5] / 90; });
          if (p.last.length < 5) p.last.push({ min: r[5], sh: r[6], sot: r[7], fc: r[8], fs: r[9], st: r[4] });
        }
      });
    });
    Object.keys(pl).forEach(function (id) { var p = pl[id], best = '', bn = 0; for (var g in p.posN) if (p.posN[g] > bn) { bn = p.posN[g]; best = g; } p.pos = best || 'M'; });
    return pl;
  }
  // formazione: ufficiale se disponibile, altrimenti probabile (chi ha giocato titolare più di recente)
  function lineup(squad, official, team) {
    var st = {}, ids = Object.keys(squad), src = 'probabile';
    if (official && official.off) {
      var any = false;
      official.P.forEach(function (r) { if (r[0] !== team) return; any = true; if (!squad[r[1]]) squad[r[1]] = { id: r[1], name: r[2], pos: r[3] || 'M', jersey: r[11], apps: 0, squad: 0, nSt: 0, minSt: 0, nBench: 0, minSub: 0, score: 0, lastSquad: 0, y: { sh: 0, sot: 0, fc: 0, fs: 0 }, e: { sh: 0, sot: 0, fc: 0, fs: 0 }, m90: 0, yc: 0, last: [] }; st[r[1]] = r[4] ? 'tit' : 'pan'; });
      if (any) { Object.keys(squad).forEach(function (id) { if (!st[id]) st[id] = 'out'; }); return { st: st, src: 'ufficiale' }; }
    }
    var gk = ids.filter(function (i) { return squad[i].pos === 'G'; }).sort(function (a, b) { return squad[b].score - squad[a].score; });
    var of = ids.filter(function (i) { return squad[i].pos !== 'G'; }).sort(function (a, b) { return squad[b].score - squad[a].score || squad[b].nSt - squad[a].nSt; });
    if (gk[0]) st[gk[0]] = 'tit';
    of.slice(0, 10).forEach(function (i) { st[i] = 'tit'; });
    ids.forEach(function (i) { if (!st[i]) st[i] = squad[i].lastSquad <= 2 ? 'pan' : 'out'; });
    return { st: st, src: src };
  }
  // probabilità che un "titolare probabile" parta davvero titolare (misurata su ~12.600 casi reali)
  function psOf(score) { return score >= 14 ? 0.78 : score >= 11 ? 0.69 : score >= 8 ? 0.54 : score >= 5 ? 0.36 : 0.25; }
  var P_ENTER = 0.4, MIN_ENTER = 25;   // se non parte titolare: entra circa 4 volte su 10, per ~25 minuti
  function playerForecast(p, status, lamT, ps) {
    if (ps == null) ps = 1;
    var minS = (p.minSt + 3 * 80) / (p.nSt + 3), expMin = 0;
    if (status === 'tit') expMin = ps * minS + (1 - ps) * P_ENTER * MIN_ENTER;
    else if (status === 'pan') expMin = (p.minSub + 2 * 12) / (p.nBench + 2);
    var out = { p: p, status: status, expMin: expMin, minS: minS, ps: status === 'tit' ? ps : 0, sure: status === 'tit' && ps >= 1, st: {} };
    PST.forEach(function (k) {
      var q0 = (PRIOR[p.pos] || PRIOR.M)[k], q = (p.y[k] + PK[k] * q0) / (p.e[k] + PK[k]), per90 = q * lamT[k] / 90, o;
      if (status === 'tit' && ps < 1) {
        var ms = per90 * minS, mb = per90 * MIN_ENTER, mix = function (n) { return ps * Model.pAtLeast(n, ms, PR) + (1 - ps) * P_ENTER * Model.pAtLeast(n, mb, PR); };
        o = { mean: ps * ms + (1 - ps) * P_ENTER * mb, meanStart: ms, share: q, p1: mix(1), p2: mix(2), p3: mix(3) };
      } else {
        var mean = per90 * expMin;
        o = { mean: mean, meanStart: mean, share: q, p1: Model.pAtLeast(1, mean, PR), p2: Model.pAtLeast(2, mean, PR), p3: Model.pAtLeast(3, mean, PR) };
      }
      o.per90 = per90; o.prior90 = q0 * lamT[k] / 90;
      out.st[k] = o;
    });
    return out;
  }
  // probabilità di almeno n per il giocatore. duo = regola del bookmaker "giocatore + suo sostituto":
  // se parte titolare contano anche le azioni di chi lo sostituisce (stimate con la media del ruolo)
  function pPlayer(f, k, n, duo) {
    var s = f.st[k]; if (f.status === 'out') return 0;
    var one = function (mean) { return Model.pAtLeast(n, mean, PR); };
    if (f.status === 'pan') return one(s.per90 * f.expMin);
    var ms = s.per90 * f.minS + (duo ? s.prior90 * Math.max(0, 90 - f.minS) : 0);
    return f.ps * one(ms) + (1 - f.ps) * P_ENTER * one(s.per90 * MIN_ENTER);
  }

  // carica tutto il necessario per i giocatori di una partita
  function loadPlayers(cd, m, onProgress) {
    var jobs = [], seen = {};
    [m.h, m.a].forEach(function (t) { lastN(cd.played, t, NREC).forEach(function (x) { if (!seen[x.m.id]) { seen[x.m.id] = 1; jobs.push(x.m); } }); });
    var done = 0, total = jobs.length + 1;
    var tick = function (v) { done++; if (onProgress) onProgress(done, total); return v; };
    var up = loadSummary(m.lg, m.id, false).then(tick, function () { tick(); return null; });
    return pool(jobs, 5, function (x) { return loadSummary(x.lg, x.id, true).then(tick, function (e) { tick(); throw e; }); }).then(function (sums) {
      return up.then(function (official) {
        var ok = sums.filter(Boolean), res = { official: official, loaded: ok.length, wanted: jobs.length, squads: {}, lu: {} };
        [m.h, m.a].forEach(function (t) {
          var mine = ok.filter(function (s) { return s.T[t]; });
          res.squads[t] = buildSquad(t, mine);
          res.lu[t] = lineup(res.squads[t], official, t);
        });
        return res;
      });
    });
  }
  /* Cartellino e gol del singolo giocatore.
     Giallo: gialli ogni 90 minuti del giocatore, avvicinati alla media del ruolo quando ha giocato poco, per i gialli che la sua squadra
     dovrebbe prendere in questa partita rispetto alla media del campionato. Gol: i suoi tiri in porta attesi per i gol che la squadra
     segna ogni tiro in porta in questa partita (gol attesi diviso tiri in porta attesi). */
  var YC_PRIOR = { G: 0.04, D: 0.21, M: 0.19, F: 0.13 }, YC_K = 40;   // test su 37.683 giocatori-partita: i gialli del singolo sono molto casuali, conta soprattutto il ruolo
  function mixP(f, perMin) {
    var at = function (n, lam) { return n === 1 ? 1 - Math.exp(-lam) : 1 - Math.exp(-lam) * (1 + lam + (n === 3 ? lam * lam / 2 : 0)); };
    var one = function (n) {
      if (f.status === 'out') return 0;
      if (f.status === 'tit' && f.ps < 1) return f.ps * at(n, perMin * f.minS) + (1 - f.ps) * P_ENTER * at(n, perMin * MIN_ENTER);
      return at(n, perMin * f.expMin);
    };
    return { mean: perMin * f.expMin, per90: perMin, p1: one(1), p2: one(2), p3: one(3) };
  }
  function extras(f, tf, side) {
    var p = f.p, rate90 = ((p.yc || 0) + YC_K * (YC_PRIOR[p.pos] || 0.17)) / ((p.m90 || 0) + YC_K);
    f.st.yc = mixP(f, rate90 / 90); f.st.yc.rate90 = rate90; f.st.yc.fac = 1;
    var r = tf.res, lg = r ? (side === 'H' ? r.lh : r.la) : 0, sotT = tf.pr[side].sot, conv = lg > 0 && sotT > 0 ? lg / sotT : 0;
    f.st.gl = p.pos === 'G' || !conv ? { mean: 0, per90: 0, p1: 0, p2: 0, p3: 0 } : mixP(f, f.st.sot.per90 * conv); f.st.gl.conv = conv;
  }
  // i gialli e i gol dei titolari devono sommare a quelli attesi per la squadra nei minuti che giocano
  function normX(list, tf, side) {
    var mins = 0, sy = 0, sg = 0, r = tf.res, lg = r ? (side === 'H' ? r.lh : r.la) : 0;
    list.forEach(function (f) { if (f.status !== 'tit') return; mins += f.expMin; sy += f.st.yc.mean; sg += f.st.gl.mean; });   // si tara sui titolari: i minuti della panchina sono più incerti
    var cov = Math.min(1, mins / 990), cl = function (x) { return Math.min(1.8, Math.max(0.6, x)); };
    var fy = sy > 0 && tf.pr[side].yc > 0 ? cl(tf.pr[side].yc * cov / sy) : 1, fg = sg > 0 && lg > 0 ? cl(lg * cov / sg) : 1;
    list.forEach(function (f) {
      var y = f.st.yc, g = f.st.gl;
      f.st.yc = mixP(f, y.per90 * fy); f.st.yc.rate90 = y.rate90; f.st.yc.fac = fy; f.st.yc.teamYc = tf.pr[side].yc;
      if (g.per90) { f.st.gl = mixP(f, g.per90 * fg); f.st.gl.conv = g.conv * fg; }
    });
  }
  // spiegazioni per cartellino e gol del giocatore
  function explainExtra(m, tf, f, k) {
    var p = f.p, L = [], f1 = function (x) { return (Math.round(x * 100) / 100).toFixed(2).replace('.', ','); }, role = { G: 'portiere', D: 'difensore', M: 'centrocampista', F: 'attaccante' }[p.pos] || 'giocatore';
    if (k === 'yc') {
      var s = f.st.yc;
      L.push(p.name + ': ' + (p.yc || 0) + ' gialli in ' + (p.apps || 0) + ' presenze recenti (' + Math.round((p.m90 || 0) * 90) + ' minuti), cioè ' + f1((p.yc || 0) / Math.max(0.5, p.m90 || 0)) + ' ogni 90 minuti.');
      L.push('Per un ' + role + ' la media è circa ' + f1(YC_PRIOR[p.pos] || 0.17) + ' ogni 90 minuti: con poche partite la stima si avvicina a questa media. Stima usata: ' + f1(s.rate90) + '.');
      L.push('Gialli attesi per la sua squadra in questa partita: ' + f1(s.teamYc || 0) + '. La stima del giocatore è riportata a questo totale (fattore ' + f1(s.fac) + ').');
      L.push('Minuti attesi: ' + Math.round(f.expMin) + '.');
    } else {
      var g = f.st.gl, so = f.st.sot;
      L.push(p.name + ' dovrebbe fare ' + f1(so.mean) + ' tiri in porta in questa partita.');
      L.push('La squadra segna circa un gol ogni ' + f1(1 / Math.max(0.01, g.conv)) + ' tiri in porta attesi: gol attesi del giocatore ' + f1(g.mean) + '.');
      L.push('Rigori e autogol non sono contati a parte. Minuti attesi: ' + Math.round(f.expMin) + '.');
    }
    return L;
  }
  function playersForecast(pd, tf, m, overrides) {
    var out = {};
    [[m.h, 'H', 'A'], [m.a, 'A', 'H']].forEach(function (x) {
      var t = x[0], lamT = { sh: tf.pr[x[1]].sh, sot: tf.pr[x[1]].sot, fc: tf.pr[x[1]].fo, fs: tf.pr[x[2]].fo }, sq = pd.squads[t], st = pd.lu[t].st;
      var official = pd.lu[t].src === 'ufficiale';
      out[t] = Object.keys(sq).map(function (id) { var ov = overrides && overrides[id], s = ov || st[id] || 'out', f = playerForecast(sq[id], s, lamT, (ov || official) ? 1 : psOf(sq[id].score)); f.team = t; extras(f, tf, x[1]); return f; })
        .sort(function (a, b) { var o = { tit: 0, pan: 1, out: 2 }; return o[a.status] - o[b.status] || b.st.sh.mean - a.st.sh.mean; });
      normX(out[t], tf, x[1]);
    });
    return out;
  }

  /* ---------- giocate in evidenza ---------- */
  var LO = 0.6, HI = 0.9, SURE = 0.85, MINQ_TOP = 1.2, MINQ_OCC = 1.4;
  /* ---------- quote del bookmaker ---------- */
  var BOOK = null;
  function setBook(b) { BOOK = b && b.ev ? b : null; }
  function bookOf(m) { return (BOOK && m && BOOK.ev[m.id]) || null; }
  function bookInfo() { return BOOK ? { name: BOOK.name, t: BOOK.t, n: Object.keys(BOOK.ev).length } : null; }
  var CAT_IT = { sot: 'Tiri in porta squadra', sotT: 'Tiri in porta partita', sh: 'Tiri totali squadra', shT: 'Tiri totali partita', co: 'Corner squadra', coT: 'Corner partita', res: 'Esito e gol', tg: 'Gol squadra (segna, U/O squadra)', fo: 'Falli squadra', foT: 'Falli partita', yc: 'Cartellini squadra', ycT: 'Cartellini partita', mg: 'Multigol', combo: 'Combo', cx: 'Corner 1X2 e handicap', ht: 'Primo tempo', psot: 'Giocatori: tiri in porta', psh: 'Giocatori: tiri', pfc: 'Giocatori: falli fatti', pfs: 'Giocatori: falli subiti', pgl: 'Giocatori: marcatore', pyc: 'Giocatori: ammonito' };
  var DUO = { sot: true, sh: true };
  // tiri e tiri in porta si giocano solo nei campionati maggiori (Francia esclusa) e con le nazionali: altrove non si propongono
  var SHOTS_OK = { 'ita.1': 1, 'eng.1': 1, 'esp.1': 1, 'ger.1': 1, 'uefa.nations': 1 };
  function shotsOk(lg) { return !!SHOTS_OK[lg]; }
  function statOk(lg, s) { return (s !== 'sot' && s !== 'sh') || shotsOk(lg); }   // mercati giocatore in cui il bookmaker conta anche il sostituto
  // tutte le giocate che il bookmaker offre davvero per la partita, con la probabilità stimata dal modello
  /* Quando c'è la quota, la stima finale è una media tra il modello e la probabilità che la quota stessa indica
     (tolta la commissione): i bookmaker sanno cose che il modello non sa (formazioni, infortuni, notizie). */
  var W_RES = 1, W_ST = 0.5, KDEV = 1.15;   // esito e gol: nel test su 26.000 partite le quote da sole battono qualunque media con il modello
  function mk1(o) { return o > 1 ? Math.pow(1 / o, KDEV) : 0; }                                   // quota senza l'esito opposto
  function mk2(a, b) { return a > 1 && b > 1 ? (1 / a) / (1 / a + 1 / b) : mk1(a); }             // quota con l'esito opposto
  function offers(m, tf, pf) {
    var b = bookOf(m), out = []; if (!b) return out;
    var mk = b.mk || {}, r = tf.res, par = tf.par || Model.PAR, hn = teams[m.h] ? teams[m.h].n : 'casa', an = teams[m.a] ? teams[m.a].n : 'trasferta', ln = function (x) { return String(x).replace('.', ','); };
    var add = function (o, pk, w) { if (!(o.odds > 1) || !(o.p > 0.001)) return; o.pm = o.p; o.pk = pk; o.p = pk > 0 ? w * pk + (1 - w) * o.pm : o.pm; out.push(o); };
    if (r) {
      var x = mk.x12, full = x && x[0] > 1 && x[1] > 1 && x[2] > 1, s3 = full ? 1 / x[0] + 1 / x[1] + 1 / x[2] : 0, q3 = full ? [1 / x[0] / s3, 1 / x[1] / s3, 1 / x[2] / s3] : null;
      if (x) [['1', 'Vince ' + hn + ' (1)', r.h], ['X', 'Pareggio (X)', r.d], ['2', 'Vince ' + an + ' (2)', r.a]].forEach(function (y, i) { add({ kind: 'res', cat: 'res', fam: '1x2', stat: y[0], label: y[1], p: y[2], odds: x[i] }, q3 ? q3[i] : mk1(x[i]), W_RES); });
      if (mk.dc) [['1X', 'Doppia chance 1X: ' + hn + ' o pareggio', r.h + r.d, q3 && q3[0] + q3[1]], ['12', 'Doppia chance 12: non finisce pari', r.h + r.a, q3 && q3[0] + q3[2]], ['X2', 'Doppia chance X2: ' + an + ' o pareggio', r.a + r.d, q3 && q3[1] + q3[2]]].forEach(function (y, i) { add({ kind: 'res', cat: 'res', fam: 'dc', stat: y[0], label: y[1], p: y[2], odds: mk.dc[i] }, y[3] || mk1(mk.dc[i]), W_RES); });
      if (mk.gg) { add({ kind: 'res', cat: 'res', fam: 'gg', stat: 'GG', label: 'Goal: segnano entrambe', p: r.gg, odds: mk.gg[0] }, mk2(mk.gg[0], mk.gg[1]), W_RES); add({ kind: 'res', cat: 'res', fam: 'gg', stat: 'NG', label: 'No goal: almeno una non segna', p: 1 - r.gg, odds: mk.gg[1] }, mk2(mk.gg[1], mk.gg[0]), W_RES); }
      if (mk.uo) Object.keys(mk.uo).forEach(function (L) { var k = Math.floor(+L), u = mk.uo[L]; if (k > 5) return; add({ kind: 'res', cat: 'res', fam: 'ov' + k, stat: 'O' + k, hard: k, label: 'Gol totali over ' + ln(L), p: r.over[k], odds: u[0] }, mk2(u[0], u[1]), W_RES); add({ kind: 'res', cat: 'res', fam: 'un' + k, stat: 'U' + k, hard: -k, label: 'Gol totali under ' + ln(L), p: 1 - r.over[k], odds: u[1] }, mk2(u[1], u[0]), W_RES); });
      // gol della singola squadra: segna sì/no e under/over squadra
      [['H', hn, 'sg1', 'tg1', r.ho], ['A', an, 'sg2', 'tg2', r.ao]].forEach(function (y) {
        var side = y[0], nm = y[1], sg = mk[y[2]], tg = mk[y[3]] || {}, po = y[4]; if (!po) return;
        if (sg) { add({ kind: 'res', cat: 'tg', fam: 'sg' + side, stat: 'S' + side, side: side, label: nm + ' segna almeno un gol', p: po[0], odds: sg[0] }, mk2(sg[0], sg[1]), W_RES);
          add({ kind: 'res', cat: 'tg', fam: 'ng' + side, stat: 'N' + side, side: side, label: nm + ' non segna', p: 1 - po[0], odds: sg[1] }, mk2(sg[1], sg[0]), W_RES); }
        Object.keys(tg).forEach(function (L) { var k = Math.floor(+L), u = tg[L]; if (k > 3 || (k === 0 && sg)) return;
          add({ kind: 'res', cat: 'tg', fam: 'to' + side + k, stat: 'TO' + side + k, side: side, hard: k, label: nm + ': gol over ' + ln(L), p: po[k], odds: u[0] }, mk2(u[0], u[1]), W_RES);
          add({ kind: 'res', cat: 'tg', fam: 'tu' + side + k, stat: 'TU' + side + k, side: side, hard: -k, label: nm + ': gol under ' + ln(L), p: 1 - po[k], odds: u[1] }, mk2(u[1], u[0]), W_RES); });
      });
    }
    [['sot', 'T', 'sotT'], ['sot', 'H', 'sot1'], ['sot', 'A', 'sot2'], ['sh', 'T', 'shT'], ['sh', 'H', 'sh1'], ['sh', 'A', 'sh2'], ['co', 'T', 'coT'], ['co', 'H', 'co1'], ['co', 'A', 'co2']].forEach(function (y) {
      var s = y[0], side = y[1], L = mk[y[2]]; if (!L || !statOk(m.lg, s)) return;
      var mean = tf.pr[side][s], rr = side === 'T' ? par.rTot[s] : par.r[s], who = side === 'H' ? hn : side === 'A' ? an : 'Totale partita', team = side === 'H' ? m.h : side === 'A' ? m.a : null;
      Object.keys(L).forEach(function (l) {
        var po = Model.pOver(+l, mean, rr), base = { kind: 'team', cat: side === 'T' ? s + 'T' : s, stat: s, side: side, team: team, line: +l };
        add(Object.assign({ fam: s + side + 'O', hard: +l, dir: 'O', label: who + ': ' + STAT_IT[s].toLowerCase() + ' over ' + ln(l), p: po, odds: L[l][0] }, base), mk2(L[l][0], L[l][1]), W_ST);
        add(Object.assign({ fam: s + side + 'U', hard: -l, dir: 'U', label: who + ': ' + STAT_IT[s].toLowerCase() + ' under ' + ln(l), p: 1 - po, odds: L[l][1] }, base), mk2(L[l][1], L[l][0]), W_ST);
      });
    });
    if (pf && b.pl) {
      var byId = {}; [m.h, m.a].forEach(function (t) { (pf[t] || []).forEach(function (f) { byId[f.p.id] = f; }); });
      PST.forEach(function (k) {
        if (!statOk(m.lg, k)) return;
        var P = b.pl[k] || {};
        Object.keys(P).forEach(function (pid) {
          var f = byId[pid]; if (!f || f.status === 'out' || f.p.pos === 'G') return;
          Object.keys(P[pid]).forEach(function (l) {
            var n = Math.floor(+l) + 1, p = pPlayer(f, k, n, !!DUO[k]), q = P[pid][l], base = { kind: 'player', cat: 'p' + k, stat: k, team: f.team, pid: pid, n: n, line: +l, status: f.status, sure: f.sure, duo: !!DUO[k] };
            add(Object.assign({ fam: pid + k + 'O', hard: n, dir: 'O', label: f.p.name + ': ' + n + '+ ' + (n === 1 ? PST_1[k] : PST_IT[k]), p: p, odds: q[0] }, base), mk2(q[0], q[1]), W_ST);
            add(Object.assign({ fam: pid + k + 'U', hard: -n, dir: 'U', label: f.p.name + ': meno di ' + n + ' ' + (n === 1 ? PST_1[k] : PST_IT[k]), p: 1 - p, odds: q[1] }, base), mk2(q[1], q[0]), W_ST);
          });
        });
      });
    }
    return out;
  }
  /* Senza quote del bookmaker: tutte le giocate generate dal modello, con la quota giusta (1 diviso la probabilità).
     Stessa forma di offers(), così pronostico principale, In evidenza e Schedina IA funzionano uguale. */
  function fairQ(p) { return Math.round(100 / p) / 100; }
  /* Mercati in più: multigol, risultato esatto, combo, corner 1X2 e handicap, primo tempo.
     Gol: dalla griglia dei punteggi del modello. Corner: dalle distribuzioni dei corner delle due squadre.
     Primo tempo: approssimato, con il 45% dei gol attesi nel primo tempo (media dei campionati). */
  var HT = 0.45;
  function extraMarkets(m, tf) {
    var r = tf.res, out = { exact: [], mg: [], mgT: [], combo: [], cx: [], ht: [] }; if (!r || !r.grid) return out;
    var hn = teams[m.h] ? teams[m.h].n : 'Casa', an = teams[m.a] ? teams[m.a].n : 'Trasferta', G = r.grid, sum = function (fn) { var t = 0; for (var i = 0; i < G.length; i++) for (var j = 0; j < G[i].length; j++) if (fn(i, j)) t += G[i][j]; return t; };
    // risultato esatto: nel test lo 0-0 era sopravvalutato (8,4% contro 7,2%) e il 2-2 sottovalutato (4,6% contro 5,6%)
    var EXF = { '0-0': 0.86, '2-2': 1.2 }, all = []; G.forEach(function (row, i) { row.forEach(function (p, j) { all.push([i, j, p * (EXF[i + '-' + j] || 1)]); }); }); all.sort(function (a, b) { return b[2] - a[2]; });
    out.exact = all.slice(0, 6).map(function (x) { return { label: 'Risultato esatto ' + x[0] + '-' + x[1], sc: x[0] + '-' + x[1], p: x[2] }; });
    [[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5], [2, 6], [3, 4], [3, 5], [3, 6], [4, 6]].forEach(function (z) { out.mg.push({ key: z.join('-'), label: 'Multigol ' + z[0] + '-' + z[1], p: sum(function (i, j) { return i + j >= z[0] && i + j <= z[1]; }) }); });
    [['H', hn], ['A', an]].forEach(function (y) { [[1, 2], [1, 3], [2, 3], [2, 4]].forEach(function (z) { out.mgT.push({ side: y[0], key: y[0] + z.join('-'), label: 'Multigol ' + y[1] + ' ' + z[0] + '-' + z[1], p: sum(function (i, j) { var g = y[0] === 'H' ? i : j; return g >= z[0] && g <= z[1]; }) }); }); });
    var RES = [['1', function (i, j) { return i > j; }], ['X', function (i, j) { return i === j; }], ['2', function (i, j) { return i < j; }], ['1X', function (i, j) { return i >= j; }], ['X2', function (i, j) { return i <= j; }], ['12', function (i, j) { return i !== j; }]];
    var UO = [['Over 1,5', function (i, j) { return i + j > 1.5; }], ['Over 2,5', function (i, j) { return i + j > 2.5; }], ['Under 2,5', function (i, j) { return i + j < 2.5; }], ['Under 3,5', function (i, j) { return i + j < 3.5; }], ['Over 3,5', function (i, j) { return i + j > 3.5; }], ['Under 4,5', function (i, j) { return i + j < 4.5; }]];
    RES.forEach(function (a) { UO.forEach(function (b) { out.combo.push({ key: a[0] + '+' + b[0], label: a[0] + ' + ' + b[0], p: sum(function (i, j) { return a[1](i, j) && b[1](i, j); }) }); }); });
    // le combo con goal/no goal sono state tolte: nel test su 26.396 partite non reggevano (72% previsto, 50% reale)
    // corner: differenza tra i corner delle due squadre
    var par = tf.par || Model.PAR, mh = tf.pr.H.co, ma = tf.pr.A.co;
    if (mh > 0 && ma > 0) {
      var ph = [], pa = [], k, d = {}; for (k = 0; k <= 30; k++) { ph.push(Model.nbPmf(k, mh, par.r.co)); pa.push(Model.nbPmf(k, ma, par.r.co)); }
      ph.forEach(function (x, i) { pa.forEach(function (y, j) { d[i - j] = (d[i - j] || 0) + x * y; }); });
      var gt = function (h) { var t = 0; for (var z in d) if (+z > h) t += d[z]; return t; };
      out.cx.push({ key: 'C1', label: 'Più corner ' + hn + ' (1)', p: gt(0) }, { key: 'CX', label: 'Corner pari (X)', p: d[0] || 0 }, { key: 'C2', label: 'Più corner ' + an + ' (2)', p: 1 - gt(-1) });
      [1.5, 2.5].forEach(function (h) {
        out.cx.push({ key: 'CH-' + h, label: 'Handicap corner ' + hn + ' -' + String(h).replace('.', ','), p: gt(h) }, { key: 'CH+' + h, label: 'Handicap corner ' + hn + ' +' + String(h).replace('.', ','), p: gt(-h) },
          { key: 'CA-' + h, label: 'Handicap corner ' + an + ' -' + String(h).replace('.', ','), p: 1 - gt(-h) }, { key: 'CA+' + h, label: 'Handicap corner ' + an + ' +' + String(h).replace('.', ','), p: 1 - gt(h) });
      });
    }
    // primo tempo (approssimato)
    var l1 = HT * r.lh, a1 = HT * r.la, T1 = l1 + a1, T2 = (1 - HT) * (r.lh + r.la), po = function (x, k) { var e = Math.exp(-x), t = 0, f = 1; for (var n = 0; n <= k; n++) { if (n) f *= x / n; t += e * f; } return t; };
    var h1 = 0, d1 = 0; for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) { var pp = po(l1, i) - (i ? po(l1, i - 1) : 0), qq = po(a1, j) - (j ? po(a1, j - 1) : 0); if (i > j) h1 += pp * qq; else if (i === j) d1 += pp * qq; }
    out.ht.push({ key: 'HO0', label: 'Primo tempo over 0,5', p: 1 - po(T1, 0) }, { key: 'HO1', label: 'Primo tempo over 1,5', p: 1 - po(T1, 1) }, { key: 'HU1', label: 'Primo tempo under 1,5', p: po(T1, 1) },
      { key: 'H1', label: 'Primo tempo 1', p: h1 }, { key: 'HX', label: 'Primo tempo X', p: d1 }, { key: 'H2', label: 'Primo tempo 2', p: 1 - h1 - d1 },
      { key: 'HB', label: 'Gol in entrambi i tempi', p: (1 - po(T1, 0)) * (1 - po(T2, 0)) },
      { key: 'HSH', label: hn + ' segna in entrambi i tempi', p: (1 - Math.exp(-l1)) * (1 - Math.exp(-(1 - HT) * r.lh)) }, { key: 'HSA', label: an + ' segna in entrambi i tempi', p: (1 - Math.exp(-a1)) * (1 - Math.exp(-(1 - HT) * r.la)) });
    return out;
  }
  function modelOffers(m, tf, pf) {
    var out = [], r = tf.res, par = tf.par || Model.PAR, hn = teams[m.h] ? teams[m.h].n : 'casa', an = teams[m.a] ? teams[m.a].n : 'trasferta', ln = function (x) { return String(x).replace('.', ','); };
    var add = function (o) { if (!(o.p >= (o.cat === 'pgl' || o.cat === 'pyc' ? 0.08 : 0.5)) || o.p > 0.97) return; o.pm = o.p; o.pk = 0; o.odds = fairQ(o.p); o.fair = true; out.push(o); };
    if (r) {
      [['1', 'Vince ' + hn + ' (1)', r.h], ['X', 'Pareggio (X)', r.d], ['2', 'Vince ' + an + ' (2)', r.a]].forEach(function (y) { add({ kind: 'res', cat: 'res', fam: '1x2', stat: y[0], label: y[1], p: y[2] }); });
      [['1X', 'Doppia chance 1X: ' + hn + ' o pareggio', r.h + r.d], ['12', 'Doppia chance 12: non finisce pari', r.h + r.a], ['X2', 'Doppia chance X2: ' + an + ' o pareggio', r.a + r.d]].forEach(function (y) { add({ kind: 'res', cat: 'res', fam: 'dc', stat: y[0], label: y[1], p: y[2] }); });
      add({ kind: 'res', cat: 'res', fam: 'gg', stat: 'GG', label: 'Goal: segnano entrambe', p: r.gg }); add({ kind: 'res', cat: 'res', fam: 'gg', stat: 'NG', label: 'No goal: almeno una non segna', p: 1 - r.gg });
      for (var k = 0; k < 5; k++) { add({ kind: 'res', cat: 'res', fam: 'ov' + k, stat: 'O' + k, hard: k, label: 'Gol totali over ' + ln(k + 0.5), p: r.over[k] }); if (k) add({ kind: 'res', cat: 'res', fam: 'un' + k, stat: 'U' + k, hard: -k, label: 'Gol totali under ' + ln(k + 0.5), p: 1 - r.over[k] }); }
      [['H', hn, r.ho], ['A', an, r.ao]].forEach(function (y) {
        var side = y[0], nm = y[1], po = y[2]; if (!po) return;
        add({ kind: 'res', cat: 'tg', fam: 'sg' + side, stat: 'S' + side, side: side, label: nm + ' segna almeno un gol', p: po[0] });
        add({ kind: 'res', cat: 'tg', fam: 'ng' + side, stat: 'N' + side, side: side, label: nm + ' non segna', p: 1 - po[0] });
        [1, 2].forEach(function (k) { add({ kind: 'res', cat: 'tg', fam: 'to' + side + k, stat: 'TO' + side + k, side: side, hard: k, label: nm + ': gol over ' + ln(k + 0.5), p: po[k] });
          add({ kind: 'res', cat: 'tg', fam: 'tu' + side + k, stat: 'TU' + side + k, side: side, hard: -k, label: nm + ': gol under ' + ln(k + 0.5), p: 1 - po[k] }); });
      });
    }
    var X = extraMarkets(m, tf);
    X.mg.concat(X.mgT).forEach(function (o) { add({ kind: 'res', cat: 'mg', fam: 'mg' + o.key, stat: 'MG' + o.key, label: o.label, p: o.p }); });
    X.combo.forEach(function (o) { add({ kind: 'res', cat: 'combo', fam: 'cb' + o.key, stat: 'CB' + o.key, label: o.label, p: o.p }); });
    X.ht.forEach(function (o) { add({ kind: 'res', cat: 'ht', fam: 'ht' + o.key, stat: o.key, label: o.label, p: o.p }); });
    X.cx.forEach(function (o) { add({ kind: 'res', cat: 'cx', fam: 'cx' + o.key, stat: o.key, label: o.label, p: o.p }); });
    Model.STATS.forEach(function (s) {
      if (!statOk(m.lg, s)) return;
      [['H', hn, m.h], ['A', an, m.a], ['T', 'Totale partita', null]].forEach(function (y) {
        var side = y[0], mean = tf.pr[side][s], rr = side === 'T' ? par.rTot[s] : par.r[s]; if (!(mean > 0)) return;
        var base = { kind: 'team', cat: side === 'T' ? s + 'T' : s, stat: s, side: side, team: y[2] };
        for (var k = 0; k < 80; k++) {
          var po = Model.pOver(k + 0.5, mean, rr); if (po < 0.03) break;
          add(Object.assign({ fam: s + side + 'O', hard: k + 0.5, dir: 'O', line: k + 0.5, label: y[1] + ': ' + STAT_IT[s].toLowerCase() + ' over ' + ln(k + 0.5), p: po }, base));
          add(Object.assign({ fam: s + side + 'U', hard: -(k + 0.5), dir: 'U', line: k + 0.5, label: y[1] + ': ' + STAT_IT[s].toLowerCase() + ' under ' + ln(k + 0.5), p: 1 - po }, base));
        }
      });
    });
    if (pf) [m.h, m.a].forEach(function (t) {
      (pf[t] || []).forEach(function (f) {
        if (f.status === 'out' || f.p.pos === 'G') return;
        if (f.status === 'tit' && f.st.gl) {
          add({ kind: 'player', cat: 'pgl', fam: f.p.id + 'gl', stat: 'gl', team: t, pid: f.p.id, n: 1, line: 0.5, dir: 'O', status: f.status, sure: f.sure, label: f.p.name + ' segna', p: f.st.gl.p1 });
          add({ kind: 'player', cat: 'pyc', fam: f.p.id + 'yc', stat: 'yc', team: t, pid: f.p.id, n: 1, line: 0.5, dir: 'O', status: f.status, sure: f.sure, label: f.p.name + ' ammonito', p: f.st.yc.p1 });
        }
        PST.forEach(function (k) {
          if (!statOk(m.lg, k)) return;
          [1, 2, 3].forEach(function (n) {
            var p = pPlayer(f, k, n, !!DUO[k]), base = { kind: 'player', cat: 'p' + k, stat: k, team: t, pid: f.p.id, n: n, line: n - 0.5, status: f.status, sure: f.sure, duo: !!DUO[k] };
            add(Object.assign({ fam: f.p.id + k + 'O', hard: n, dir: 'O', label: f.p.name + ': ' + n + '+ ' + (n === 1 ? PST_1[k] : PST_IT[k]), p: p }, base));
            add(Object.assign({ fam: f.p.id + k + 'U', hard: -n, dir: 'U', label: f.p.name + ': meno di ' + n + ' ' + (n === 1 ? PST_1[k] : PST_IT[k]), p: 1 - p }, base));
          });
        });
      });
    });
    return out;
  }
  // le giocate della partita: quelle del bookmaker se ci sono le quote, altrimenti quelle del modello
  function allOffers(m, tf, pf) { return bookOf(m) ? offers(m, tf, pf) : modelOffers(m, tf, pf); }
  // per ogni mercato tiene la giocata più "difficile" (quindi che paga di più) che resta nella fascia di probabilità
  function bestOf(list, lo, hi) {
    var best = {};
    list.forEach(function (o) { if (o.p < lo || o.p > hi) return; if (o.kind === 'player' && o.status !== 'tit') return; var b = best[o.fam]; if (!b || (o.hard != null ? o.hard > b.hard : o.p < b.p)) best[o.fam] = o; });
    return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.p - a.p; });
  }
  // schedina: una giocata per partita, le più probabili tra quelle che rispettano i filtri
  function slipCandidates(matches, withPlayers) {
    var res = [], i = 0;
    function next() {
      if (i >= matches.length) return Promise.resolve(res);
      var m = matches[i++];
      return loadComp(m.lg, false).then(function (cd) {
        var tf = teamForecast(cd, m), go = function (pf) { allOffers(m, tf, pf).forEach(function (o) { res.push({ m: m, o: o }); }); };
        if (!withPlayers) { go(null); return; }
        return loadPlayers(cd, m).then(function (pd) { go(playersForecast(pd, tf, m, {})); }, function () { go(null); });
      }, function () {}).then(next);
    }
    return next();
  }
  function buildSlip(cands, opt) {
    var per = {}, pool = [];
    cands.forEach(function (c) {
      var o = c.o; if (!opt.cats[o.cat] || o.odds < opt.minOdds || o.p < (opt.minP || 0.5)) return;
      if (o.kind === 'player' && o.status !== 'tit') return;
      (per[c.m.id] || (per[c.m.id] = [])).push(c);
    });
    Object.keys(per).forEach(function (id) { per[id].sort(function (a, b) { return b.o.p - a.o.p; }); });
    // giro "off": per ogni partita prende la off-esima migliore, così "un'altra schedina" cambia giocate
    var ids = Object.keys(per).sort(function (a, b) { return per[b][0].o.p - per[a][0].o.p; });
    ids.forEach(function (id) { var arr = per[id]; pool.push(arr[Math.min(arr.length - 1, opt.off || 0) % arr.length]); });
    pool.sort(function (a, b) { return b.o.p - a.o.p; });
    var items = pool.slice(0, opt.n), p = 1, odds = 1;
    if (opt.maxCat) {
      // schedina automatica: al massimo maxCat giocate dello stesso tipo, così non escono tutte uguali
      items = []; var used = {}, cnt = {}, sh = opt.off || 0;
      while (items.length < opt.n) {
        var best = null;
        ids.forEach(function (id) {
          if (used[id]) return;
          var arr = per[id].filter(function (x) { return (cnt[x.o.cat] || 0) < opt.maxCat; }); if (!arr.length) return;
          var x = arr[Math.min(arr.length - 1, sh) % arr.length];
          if (!best || x.o.p > best.o.p) best = x;
        });
        if (!best) break;
        used[best.m.id] = 1; cnt[best.o.cat] = (cnt[best.o.cat] || 0) + 1; items.push(best);
      }
    }
    items.forEach(function (c) { p *= c.o.p; odds *= c.o.odds; });
    return { items: items, p: items.length ? p : 0, odds: items.length ? odds : 0, avail: pool.length };
  }
  /* Schedina ottimizzata.
     opt: cats {cat:1}, ids {idPartita:1} o null, from/to (ms), goal 'quota' | 'prob' | 'safe', Q (quota obiettivo), P (probabilità minima),
     N (numero di partite per 'safe'), combo (fino a due giocate nella stessa partita, come MyCombo), all (usa tutte le partite di ids), ban {chiave:1}.
     Per scegliere usa una stima prudente: la più bassa tra la media modello+quote e le sole quote, così non insegue le giocate
     dove solo il modello è ottimista. La probabilità mostrata resta la media. */
  function legKey(m, o) { return m.id + '|' + o.label; }
  function pareto(arr) {
    arr.sort(function (a, b) { return b.odds - a.odds || b.ps - a.ps; });
    var out = [], best = -1; arr.forEach(function (x) { if (x.ps > best + 1e-9) { out.push(x); best = x.ps; } }); return out;
  }
  function comboOk(a, b) {
    if (a.kind === 'res' && b.kind === 'res') return false;
    if (a.stat === b.stat && (a.side === 'T' || b.side === 'T' || a.kind !== b.kind)) return false;
    if (a.kind === 'player' && b.kind === 'player' && a.pid === b.pid) return false;
    return true;
  }
  function optSlip(cands, opt) {
    var now = Date.now(), per = {}, minP0 = opt.minLegP || 0.5, PEN = Math.log(0.95), minF = opt.minLegP != null ? opt.minLegP : 0.6;
    cands.forEach(function (c) {
      var o = c.o, m = c.m;
      if (!opt.cats[o.cat] || (opt.ids && !opt.ids[m.id]) || !(m.d > now) || m.d > (opt.to || Infinity) || m.d < (opt.from || 0)) return;
      if (o.kind === 'player' && o.status !== 'tit') return;
      if (o.odds < 1.04 || o.p > 0.985) return;
      var minP = o.fair ? (opt.minLegP != null ? opt.minLegP : 0.6) : minP0, ps = o.pk > 0 ? Math.min(o.p, o.pk) : o.p; if (ps < minP) return;
      var k = legKey(m, o); if (opt.ban && opt.ban[k]) return;
      (per[m.id] || (per[m.id] = [])).push({ m: m, legs: [o], ps: ps, p: o.p, odds: o.odds, pen: o.fair ? PEN : 0 });
    });
    var ids = Object.keys(per), opts = ids.map(function (id) {
      var singles = per[id];
      if (!opt.combo) return pareto(singles.slice());
      var g = {}; singles.forEach(function (x) { var o = x.legs[0], k = o.kind === 'res' ? 'res' : o.kind === 'player' ? o.pid + o.stat : o.stat + o.side; (g[k] || (g[k] = [])).push(x); });
      var fr = Object.keys(g).map(function (k) { return pareto(g[k].slice()); }), all = singles.slice();
      for (var i = 0; i < fr.length; i++) for (var j = i + 1; j < fr.length; j++) fr[i].forEach(function (a) { fr[j].forEach(function (b) {
        if (a.ps * b.ps >= (a.legs[0].fair ? minF : minP0) * 0.75 && comboOk(a.legs[0], b.legs[0])) all.push({ m: a.m, legs: [a.legs[0], b.legs[0]], ps: a.ps * b.ps, p: a.p * b.p, odds: a.odds * b.odds, pen: a.pen + b.pen });
      }); });
      return pareto(all);
    });
    // N = numero esatto di partite (0 = libero). Con "all" vanno usate tutte le partite scelte.
    var N = opt.all ? opts.length : (opt.N || 0), K = N || 0, Q = opt.goal !== 'prob';
    var S = Q ? 100 : 200, MAX = Q ? Math.ceil(Math.log(Math.max(1.01, opt.Q)) * S) : Math.floor(-Math.log(opt.P) * S), W = MAX + 1, NEG = -1e18;
    if (N && opts.length < N) return { items: [], p: 0, ps: 0, odds: 0, avail: ids.length, impossible: 'poche' };
    var dp = new Float64Array((K + 1) * W).fill(NEG), par = []; dp[0] = 0;
    opts.forEach(function (L) {
      var nd = opt.all ? new Float64Array((K + 1) * W).fill(NEG) : Float64Array.from(dp), pi = new Int32Array((K + 1) * W).fill(-1), pf = new Int32Array((K + 1) * W);
      for (var k = 0; k <= K; k++) for (var w = 0; w <= MAX; w++) {
        var cur = dp[k * W + w]; if (cur <= NEG) continue;
        var k2 = K ? k + 1 : 0; if (k2 > K) continue;
        for (var j = 0; j < L.length; j++) {
          var x = L[j], w2, v;
          if (Q) { w2 = Math.min(MAX, w + Math.floor(Math.log(x.odds) * S)); v = cur + Math.log(x.ps) + x.pen; }
          else { w2 = w + Math.ceil(-Math.log(x.ps) * S); if (w2 > MAX) continue; v = cur + Math.log(x.odds) + x.pen; }
          var at = k2 * W + w2; if (v > nd[at] + 1e-12) { nd[at] = v; pi[at] = j; pf[at] = k * W + w; }
        }
      }
      par.push({ pi: pi, pf: pf }); dp = nd;
    });
    var bs = -1;
    if (Q) bs = dp[K * W + MAX] > NEG ? K * W + MAX : -1;
    else for (var w = 0; w <= MAX; w++) { var at = K * W + w; if (dp[at] > NEG && (bs < 0 || dp[at] > dp[bs])) bs = at; }
    if (bs < 0) { var mx = 1; opts.forEach(function (L) { var b = 1; L.forEach(function (x) { if (x.odds > b) b = x.odds; }); mx *= b; }); return { items: [], p: 0, ps: 0, odds: 0, avail: ids.length, impossible: true, maxOdds: mx }; }
    var pick = [];
    for (var i = opts.length - 1; i >= 0; i--) { var j = par[i].pi[bs]; if (j >= 0) { pick.push(opts[i][j]); bs = par[i].pf[bs]; } }
    pick.sort(function (a, b) { return a.m.d - b.m.d; });
    var p = 1, ps = 1, odds = 1; pick.forEach(function (x) { p *= x.p; ps *= x.ps; odds *= x.odds; });
    return { items: pick, p: pick.length ? p : 0, ps: pick.length ? ps : 0, odds: pick.length ? odds : 0, avail: ids.length, keys: pick.map(function (x) { return x.legs.map(function (o) { return legKey(x.m, o); }); }) };
  }
  // tutte le opzioni su esito e gol; inFamilyBest segna, per ogni famiglia, quella da mostrare tra le giocate in evidenza
  function resOptions(m, tf) {
    var r = tf.res, out = []; if (!r) return out;
    var hn = teams[m.h] ? teams[m.h].n : 'casa', an = teams[m.a] ? teams[m.a].n : 'trasferta', ln = function (x) { return String(x).replace('.', ','); };
    var fam = function (name, opts) { opts.forEach(function (o) { o.fam = name; out.push(o); }); };
    fam('1x2', [{ key: '1', label: 'Vince ' + hn + ' (1)', p: r.h }, { key: 'X', label: 'Pareggio (X)', p: r.d }, { key: '2', label: 'Vince ' + an + ' (2)', p: r.a }]);
    fam('dc', [{ key: '1X', label: 'Doppia chance 1X: ' + hn + ' o pareggio', p: r.h + r.d }, { key: 'X2', label: 'Doppia chance X2: ' + an + ' o pareggio', p: r.a + r.d }, { key: '12', label: 'Doppia chance 12: non finisce pari', p: r.h + r.a }]);
    fam('gg', [{ key: 'GG', label: 'Goal: segnano entrambe', p: r.gg }, { key: 'NG', label: 'No goal: almeno una non segna', p: 1 - r.gg }]);
    [0, 1, 2, 3, 4].forEach(function (k) { fam('ov' + k, [{ key: 'O' + k, grp: 'ov', label: 'Gol totali over ' + ln(k + 0.5), p: r.over[k], hard: k }]); });
    [1, 2, 3, 4].forEach(function (k) { fam('un' + k, [{ key: 'U' + k, grp: 'un', label: 'Gol totali under ' + ln(k + 0.5), p: 1 - r.over[k], hard: -k }]); });
    if (r.ho) [['H', hn, r.ho], ['A', an, r.ao]].forEach(function (y) {
      fam('sg' + y[0], [{ key: 'S' + y[0], label: y[1] + ' segna almeno un gol', p: y[2][0] }]);
      fam('ng' + y[0], [{ key: 'N' + y[0], label: y[1] + ' non segna', p: 1 - y[2][0] }]);
      [1, 2].forEach(function (k) { fam('to' + y[0] + k, [{ key: 'TO' + y[0] + k, grp: 'to' + y[0], label: y[1] + ': gol over ' + ln(k + 0.5), p: y[2][k], hard: k }]);
        fam('tu' + y[0] + k, [{ key: 'TU' + y[0] + k, grp: 'tu' + y[0], label: y[1] + ': gol under ' + ln(k + 0.5), p: 1 - y[2][k], hard: -k }]); });
    });
    // per famiglia: l'opzione più "difficile" (quindi che paga di più) che resta sopra la soglia
    var mark = function (thr, flag) {
      var best = {}; out.forEach(function (o) { if (o.p < thr || o.p > 0.985) return; var g = flag === 'sureBest' ? o.grp || o.fam : o.fam, b = best[g]; if (!b || (o.hard != null ? o.hard > b.hard : o.p < b.p)) best[g] = o; });
      for (var f in best) best[f][flag] = true;
    };
    mark(LO, 'inFamilyBest'); mark(SURE, 'sureBest');
    return out;
  }
  // giocate con probabilità stimata >= 85%: per ogni mercato la linea più alta che resta sopra la soglia
  function surePicks(m, tf, pf, onlyBook) {
    if (onlyBook && bookOf(m)) return bestOf(offers(m, tf, pf), SURE, 0.985);
    var out = [], tn = function (id) { return teams[id] ? teams[id].n : id; }, par = tf.par || Model.PAR;
    Model.STATS.forEach(function (s) {
      if (!statOk(m.lg, s)) return;
      [['H', m.h], ['A', m.a], ['T', null]].forEach(function (x) {
        var mean = tf.pr[x[0]][s], r = x[0] === 'T' ? par.rTot[s] : par.r[s], best = null;
        for (var k = 0; k < 60; k++) { var p = Model.pOver(k + 0.5, mean, r); if (p >= SURE) best = { line: k + 0.5, p: p }; else break; }
        if (best && best.line > 0.5 && best.p <= 0.985) out.push({ kind: 'team', stat: s, side: x[0], team: x[1], line: best.line, p: best.p, label: (x[1] ? tn(x[1]) : 'Totale partita') + ': ' + STAT_IT[s].toLowerCase() + ' over ' + String(best.line).replace('.', ',') });
      });
    });
    resOptions(m, tf).forEach(function (o) { if (o.sureBest) out.push({ kind: 'res', stat: o.key, p: o.p, label: o.label }); });
    if (pf) [m.h, m.a].forEach(function (t) {
      pf[t].forEach(function (f) {
        if (f.status !== 'tit' || f.p.pos === 'G') return;
        PST.forEach(function (k) {
          if (!statOk(m.lg, k)) return;
          var s = f.st[k], n = s.p3 >= SURE ? 3 : s.p2 >= SURE ? 2 : s.p1 >= SURE ? 1 : 0;
          if (n) out.push({ kind: 'player', stat: k, team: t, pid: f.p.id, n: n, p: s['p' + n], label: f.p.name + ': ' + n + '+ ' + (n === 1 ? PST_1[k] : PST_IT[k]) });
        });
      });
    });
    out.sort(function (a, b) { return b.p - a.p; });
    return out;
  }
  /* Occasioni: giocate con quota vera da MINQ_OCC in su, probabilità almeno 50%.
     Per ogni mercato tiene la linea col miglior rapporto probabilità x quota; "occ" se la stima supera quella implicita nella quota. */
  function occasions(m, tf, pf) {
    var best = {};
    allOffers(m, tf, pf).forEach(function (o) {
      if (o.odds < MINQ_OCC || o.odds > 4 || o.p < 0.5 || o.p > 0.985) return;
      if (o.kind === 'player' && o.status !== 'tit') return;
      o.v = o.p * o.odds; o.occ = !o.fair && o.v >= 1.0;
      // senza quote non c'è convenienza da misurare: per ogni mercato la linea più probabile da 1,40 in su
      var b = best[o.fam]; if (!b || (o.fair ? o.p > b.p : o.v > b.v)) best[o.fam] = o;
    });
    return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return a.fair ? b.p - a.p : b.v - a.v || b.p - a.p; });
  }
  /* Pronostico principale della partita: tra le giocate con quota da MINQ_OCC a 2,5, quella su cui modello e bookmaker sono più d'accordo
     che succeda (conta la più bassa delle due stime). Così non vince sempre il mercato dove il modello si discosta di più dalle quote
     (di solito i corner), ma quello più solido. */
  var NOMAIN = { fo: 1, foT: 1, yc: 1, ycT: 1, pfc: 1, pfs: 1, mg: 1, combo: 1, cx: 1, ht: 1, pgl: 1, pyc: 1 };   // falli e cartellini restano nelle liste, ma non fanno da pronostico principale
  var GRP = { res: 'g', tg: 'g', mg: 'g', combo: 'g', ht: 'g', sot: 's', sotT: 's', sh: 's', shT: 's', co: 'c', coT: 'c', cx: 'c' }, GORD = ['g', 's', 'c', 'p'];
  function mainPick(m, tf, pf, band) {
    var best = null, byG = {}, qlo = band ? band[0] : MINQ_OCC, qhi = band ? band[1] : 2.5;
    allOffers(m, tf, pf).forEach(function (o) {
      if (o.odds < qlo || o.odds > qhi || o.p > 0.985 || NOMAIN[o.cat]) return;
      if (o.kind === 'player' && (o.status !== 'tit' || o.dir === 'U')) return;   // dei giocatori solo tiri e tiri in porta "almeno"
      o.ps = o.pk > 0 ? Math.min(o.pm, o.pk) : o.pm; if (o.ps < 0.5) return;
      if (!best || o.ps > best.ps + 1e-9 || (Math.abs(o.ps - best.ps) <= 1e-9 && o.odds > best.odds)) best = o;
      var g = GRP[o.cat] || 'p', bg = byG[g]; if (!bg || o.ps > bg.ps + 1e-9 || (Math.abs(o.ps - bg.ps) <= 1e-9 && o.odds > bg.odds)) byG[g] = o;
    });
    // senza quote i corner hanno tante linee e una cade sempre vicino al limite: a parità (entro un punto e mezzo) vincono gol, poi tiri, poi corner
    if (best && best.fair) { for (var gi = 0; gi < GORD.length; gi++) { var c = byG[GORD[gi]]; if (c && c.ps >= best.ps - 0.015) { best = c; break; } } }
    if (best) { best.v = best.p * best.odds; best.occ = !best.fair && best.v >= 1; }
    return best;
  }
  function occAcross(matches, withPlayers, band) {
    var res = [], i = 0;
    function next() {
      if (i >= matches.length) { res.sort(function (a, b) { return b.pick.v - a.pick.v || b.pick.p - a.pick.p; }); return Promise.resolve(res); }
      var m = matches[i++];
      return loadComp(m.lg, false).then(function (cd) {
        var tf = teamForecast(cd, m), go = function (pf) { if (!bookOf(m)) { var mp = mainPick(m, tf, pf, band); if (mp) res.push({ m: m, pick: mp }); return; } occasions(m, tf, pf).forEach(function (p) { res.push({ m: m, pick: p }); }); };
        if (!withPlayers) { go(null); return; }
        return loadPlayers(cd, m).then(function (pd) { go(playersForecast(pd, tf, m, {})); }, function () { go(null); });
      }, function () {}).then(next);
    }
    return next();
  }
  // le più probabili su più partite (per la schermata iniziale)
  function sureAcross(matches, withPlayers, onProgress) {
    var res = [], i = 0;
    function next() {
      if (i >= matches.length) { res.sort(function (a, b) { return b.pick.p - a.pick.p; }); return Promise.resolve(res); }
      var m = matches[i++];
      return loadComp(m.lg, false).then(function (cd) {
        var tf = teamForecast(cd, m), go = function (pf) { surePicks(m, tf, pf, true).forEach(function (p) { res.push({ m: m, pick: p }); }); if (onProgress) onProgress(i, matches.length); };
        if (!withPlayers) { go(null); return; }
        return loadPlayers(cd, m).then(function (pd) { var pf = playersForecast(pd, tf, m, {}); go(pf); }, function () { go(null); });
      }, function () {}).then(next);
    }
    return next();
  }
  function picks(m, tf, pf, onlyBook) {
    if (onlyBook && bookOf(m)) return bestOf(offers(m, tf, pf).filter(function (o) { return o.odds >= MINQ_TOP; }), 0.5, HI);
    var out = [], tn = function (id) { return teams[id] ? teams[id].n : id; };
    Model.STATS.forEach(function (s) {
      if (!statOk(m.lg, s)) return;
      [['H', m.h], ['A', m.a], ['T', null]].forEach(function (x) {
        var ls = tf.stats[s][x[0]].lines, best = null;
        ls.forEach(function (l) { if (l.over >= LO && l.over <= HI) best = l; });   // linea più alta ancora sopra il 60%
        if (best) out.push({ kind: 'team', stat: s, side: x[0], team: x[1], line: best.line, p: best.over, label: (x[1] ? tn(x[1]) : 'Totale partita') + ': ' + STAT_IT[s].toLowerCase() + ' over ' + String(best.line).replace('.', ',') });
      });
    });
    if (pf) [m.h, m.a].forEach(function (t) {
      pf[t].forEach(function (f) {
        if (f.status !== 'tit' || f.p.pos === 'G') return;
        PST.forEach(function (k) {
          if (!statOk(m.lg, k)) return;
          var s = f.st[k], n = 0, p = 0;
          if (s.p3 >= LO && s.p3 <= HI) { n = 3; p = s.p3; } else if (s.p2 >= LO && s.p2 <= HI) { n = 2; p = s.p2; } else if (s.p1 >= LO && s.p1 <= HI) { n = 1; p = s.p1; }
          if (n) out.push({ kind: 'player', stat: k, team: t, pid: f.p.id, n: n, p: p, label: f.p.name + ': ' + n + '+ ' + (n === 1 ? PST_1[k] : PST_IT[k]) });
        });
      });
    });
    resOptions(m, tf).forEach(function (o) { if (o.inFamilyBest && o.p >= LO && o.p <= HI) out.push({ kind: 'res', stat: o.key, p: o.p, label: o.label }); });
    out.sort(function (a, b) { return b.p - a.p; });
    return out;
  }

  /* ---------- analisi completa della partita ---------- */
  function analysis(cd, m, tf) {
    var tn = function (id) { return teams[id] ? teams[id].n : id; }, f1x = function (x) { return (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); };
    var avg = function (arr, fn) { var s = 0, n = 0; arr.forEach(function (x) { var v = fn(x); if (isFinite(v)) { s += v; n++; } }); return n ? s / n : NaN; };
    var one = function (t, home) {
      var l10 = lastN(cd.played, t, 10), l5 = l10.slice(0, 5), all = lastN(cd.played, t, 40);
      var row = function (x) { var gf = x.f.g, ga = x.c.g, r = !isFinite(gf) || !isFinite(ga) ? '?' : gf > ga ? 'V' : gf < ga ? 'P' : 'N'; return { d: x.m.d, opp: x.opp, home: x.home, gf: gf, ga: ga, r: r }; };
      var last = l10.map(row), f5 = last.slice(0, 5), pts = function (L) { return L.reduce(function (t, x) { return t + (x.r === 'V' ? 3 : x.r === 'N' ? 1 : 0); }, 0); };
      var ven = all.filter(function (x) { return x.home === home; }).slice(0, 6).map(row);
      var cnt = function (L, fn) { return L.filter(fn).length; };
      var o = { id: t, name: tn(t), home: home, last: last, f5: f5, pts5: pts(f5), w5: cnt(f5, function (x) { return x.r === 'V'; }), d5: cnt(f5, function (x) { return x.r === 'N'; }), l5: cnt(f5, function (x) { return x.r === 'P'; }),
        gf5: f5.reduce(function (s, x) { return s + (x.gf || 0); }, 0), ga5: f5.reduce(function (s, x) { return s + (x.ga || 0); }, 0),
        ven: ven, venPts: pts(ven), venGf: ven.reduce(function (s, x) { return s + (x.gf || 0); }, 0), venGa: ven.reduce(function (s, x) { return s + (x.ga || 0); }, 0),
        n10: last.length, over25: cnt(last, function (x) { return x.gf + x.ga > 2.5; }), btts: cnt(last, function (x) { return x.gf > 0 && x.ga > 0; }), cs: cnt(last, function (x) { return x.ga === 0; }), fts: cnt(last, function (x) { return x.gf === 0; }),
        avgF: {}, avgA: {}, rate: {} };
      ['g', 'sh', 'sot', 'co', 'fo', 'yc'].forEach(function (k) { o.avgF[k] = avg(l10, function (x) { return x.f[k]; }); o.avgA[k] = avg(l10, function (x) { return x.c[k]; }); });
      ['g', 'sh', 'sot', 'co'].forEach(function (k) { var F = cd.fit[k]; if (F && F.A[t] != null) o.rate[k] = { a: F.A[t], d: F.D[t] }; });
      return o;
    };
    var H = one(m.h, true), A = one(m.a, false);
    var h2h = cd.played.filter(function (x) { return (x.h === m.h && x.a === m.a) || (x.h === m.a && x.a === m.h); }).slice(-5).reverse()
      .map(function (x) { return { d: x.d, h: x.h, a: x.a, sc: x.sc || [x.H.g, x.A.g] }; });
    var pr = tf.pr, lh = pr.H.g, la = pr.A.g, src = 'modello';
    if (tf.mkt) { lh = tf.mkt.gh; la = tf.mkt.ga; src = 'quote'; }
    var R = isFinite(lh) && isFinite(la) ? Model.outcomes(lh, la, (tf.par || Model.PAR).rho) : tf.res;
    var exp = { gH: lh, gA: la, src: src }; ['sh', 'sot', 'co', 'fo', 'yc'].forEach(function (k) { exp[k] = [pr.H[k], pr.A[k], pr.T[k]]; });
    // testo
    var P = [], pc = function (x) { return Math.round(x * 100) + '%'; };
    var formWord = function (p) { return p >= 12 ? 'in grande forma' : p >= 9 ? 'in buona forma' : p >= 6 ? 'a corrente alternata' : 'in un momento difficile'; };
    var seq = function (o) { return o.f5.map(function (x) { return x.r; }).join(''); };
    var pl = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
    var al = function (x) { var n = Math.round(x * 100); return (n === 8 || n === 11 || (n >= 80 && n < 90) ? 'all\'' : 'al ') + n + '%'; };
    var formTxt = function (o) { return o.name + ' arriva ' + formWord(o.pts5) + ': ' + pl(o.w5, 'vittoria', 'vittorie') + ', ' + pl(o.d5, 'pareggio', 'pareggi') + ' e ' + pl(o.l5, 'sconfitta', 'sconfitte') + ' nelle ultime ' + o.f5.length + ' (' + pl(o.gf5, 'gol fatto', 'gol fatti') + ', ' + o.ga5 + ' subiti).'; };
    if (H.f5.length && A.f5.length) P.push(formTxt(H) + ' ' + formTxt(A));
    if (H.ven.length && A.ven.length) P.push('In casa ' + H.name + ' ha fatto ' + H.venPts + ' punti nelle ultime ' + H.ven.length + ' (gol ' + H.venGf + '-' + H.venGa + '). In trasferta ' + A.name + ' ne ha fatti ' + A.venPts + ' nelle ultime ' + A.ven.length + ' (gol ' + A.venGf + '-' + A.venGa + ').');
    var rt = function (o, k, what) { var r = o.rate[k]; if (!r) return ''; return o.name + ' ' + what + ' ' + vsAvg(r.a, 'in più', 'in meno') + ' e ne concede ' + vsAvg(r.d, 'in più', 'in meno') + '.'; };
    var k0 = shotsOk(m.lg) ? 'sot' : 'g', w0 = k0 === 'sot' ? 'fa tiri in porta' : 'segna';
    var t1 = rt(H, k0, w0), t2 = rt(A, k0, w0); if (t1 || t2) P.push(('Rispetto alla media del campionato (tenendo conto degli avversari affrontati): ' + t1 + ' ' + t2).trim());
    if (H.n10 && A.n10) P.push('Gol: nelle ultime ' + H.n10 + ' di ' + H.name + ' l\'over 2,5 è uscito ' + pl(H.over25, 'volta', 'volte') + ' e hanno segnato entrambe ' + pl(H.btts, 'volta', 'volte') + '; per ' + A.name + ' ' + A.over25 + ' e ' + A.btts + ' su ' + A.n10 + '. ' + H.name + ' non ha subito gol ' + pl(H.cs, 'volta', 'volte') + ', ' + A.name + ' non ha segnato ' + pl(A.fts, 'volta', 'volte') + '.');
    if (R) {
      var fav = R.h >= 0.55 ? H.name + ' è favorita' : R.a >= 0.55 ? A.name + ' è favorita' : R.h + R.d >= 0.7 && R.h > R.a ? H.name + ' parte avanti ma il pareggio è possibile' : R.a + R.d >= 0.7 && R.a > R.h ? A.name + ' parte avanti ma il pareggio è possibile' : 'partita equilibrata';
      var gT = lh + la, gw = gT >= 3.1 ? 'una partita da gol' : gT <= 2.2 ? 'una partita bloccata, con pochi gol' : 'una partita con un numero di gol nella media';
      P.push('Secondo ' + (src === 'quote' ? 'modello e quote' : 'il modello') + ' ' + fav + ': 1 ' + al(R.h) + ', X ' + al(R.d) + ', 2 ' + al(R.a) + '. Gol attesi ' + f1x(lh) + ' - ' + f1x(la) + ', quindi ' + gw + ' (over 2,5 ' + al(R.over[2]) + ', goal ' + al(R.gg) + '). Risultati più probabili: ' + R.scores.map(function (s) { return s[0] + '-' + s[1] + ' (' + pc(s[2]) + ')'; }).join(', ') + '.');
    }
    P.push('Numeri attesi: ' + (shotsOk(m.lg) ? 'tiri ' + f1x(exp.sh[0]) + ' - ' + f1x(exp.sh[1]) + ', tiri in porta ' + f1x(exp.sot[0]) + ' - ' + f1x(exp.sot[1]) + ', ' : '') + 'corner ' + f1x(exp.co[0]) + ' - ' + f1x(exp.co[1]) + ' (totale ' + f1x(exp.co[2]) + '), falli ' + f1x(exp.fo[0]) + ' - ' + f1x(exp.fo[1]) + ', gialli ' + f1x(exp.yc[0]) + ' - ' + f1x(exp.yc[1]) + '.');
    P.push(h2h.length ? 'Precedenti recenti: ' + h2h.map(function (x) { return tn(x.h) + ' - ' + tn(x.a) + ' ' + x.sc[0] + '-' + x.sc[1]; }).join('; ') + '.' : 'Nessun precedente tra le due squadre negli ultimi due anni di dati.');
    return { H: H, A: A, h2h: h2h, exp: exp, res: R, text: P };
  }

  /* ---------- spiegazioni ---------- */
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function vsAvg(mult, more, less) { var d = Math.round((mult - 1) * 100); if (Math.abs(d) < 3) return 'in linea con la media'; return 'il ' + Math.abs(d) + '% ' + (d > 0 ? more : less) + ' della media'; }
  function explainTeam(cd, m, tf, s, side) {
    var S = tf.stats[s], tn = function (id) { return teams[id] ? teams[id].n : id; }, L = [], nm = STAT_IT[s].toLowerCase();
    var one = function (team, opp, home) {
      var mu = home ? S.muH : S.muA, a = home ? S.aH : S.aA, d = home ? S.dA : S.dH, mean = home ? S.H.mean : S.A.mean;
      var conc = s === 'fo' ? 'subisce' : s === 'yc' ? 'fa prendere agli avversari' : 'concede';
      L.push(tn(team) + ' ' + (home ? 'in casa' : 'in trasferta') + ': attesi ' + f1(mean) + ' ' + nm + '.');
      L.push('Media del campionato ' + (home ? 'in casa' : 'in trasferta') + ': ' + f1(mu) + '.');
      if (a != null) L.push(tn(team) + ' ne fa ' + vsAvg(a, 'in più', 'in meno') + ' (partite recenti pesate di più, tenendo conto degli avversari affrontati).');
      else L.push(tn(team) + ': nessuno storico disponibile, stima prudente.');
      if (d != null) L.push(tn(opp) + ' ne ' + conc + ' ' + vsAvg(d, 'in più', 'in meno') + '.');
      var l5 = lastN(cd.played, team, 5).map(function (x) { return x.f[s]; }), c5 = lastN(cd.played, opp, 5).map(function (x) { return x.c[s]; });
      if (l5.length) L.push('Ultime ' + l5.length + ' di ' + tn(team) + ': ' + l5.join(', ') + '.');
      if (c5.length) L.push('Ultime ' + c5.length + ' concesse da ' + tn(opp) + ': ' + c5.join(', ') + '.');
    };
    if (side === 'H') one(m.h, m.a, true); else if (side === 'A') one(m.a, m.h, false);
    else { L.push('Totale atteso: ' + f1(S.T.mean) + ' ' + nm + ' (' + tn(m.h) + ' ' + f1(S.H.mean) + ' + ' + tn(m.a) + ' ' + f1(S.A.mean) + ').'); var t5 = lastN(cd.played, m.h, 5).map(function (x) { return x.f[s] + x.c[s]; }), u5 = lastN(cd.played, m.a, 5).map(function (x) { return x.f[s] + x.c[s]; }); if (t5.length) L.push('Totali nelle ultime ' + t5.length + ' di ' + tn(m.h) + ': ' + t5.join(', ') + '.'); if (u5.length) L.push('Totali nelle ultime ' + u5.length + ' di ' + tn(m.a) + ': ' + u5.join(', ') + '.'); }
    if (s === 'sot') L.push('I tiri in porta sono stimati dai tiri attesi e dalla precisione delle due squadre.');
    if (tf.mkt && tf.mkt.adj[s] && side !== 'T') { var fx = tf.mkt.adj[s][side], dd = Math.round((fx - 1) * 100); if (Math.abs(dd) >= 2) L.push('Le quote del bookmaker si aspettano ' + (dd > 0 ? 'più' : 'meno') + ' gol di questa squadra rispetto al modello: stima ' + (dd > 0 ? 'alzata' : 'abbassata') + ' del ' + Math.abs(dd) + '%.'); }
    if (Math.min(tf.nH, tf.nA) < 6) L.push('Attenzione: poche partite disponibili per almeno una squadra, stima meno affidabile.');
    return L;
  }
  function explainRes(cd, m, tf) {
    var r = tf.res, L = [], tn = function (id) { return teams[id] ? teams[id].n : id; }; if (!r) return L;
    var form = function (t) { return lastN(cd.played, t, 5).map(function (x) { var g = x.home ? x.m.sc : [x.m.sc[1], x.m.sc[0]]; return g[0] + '-' + g[1] + (g[0] > g[1] ? ' V' : g[0] === g[1] ? ' N' : ' P'); }); };
    L.push('Gol attesi dal modello: ' + tn(m.h) + ' ' + f1(r.lh) + ', ' + tn(m.a) + ' ' + f1(r.la) + '.');
    if (tf.mkt) L.push('Gol attesi secondo le quote del bookmaker: ' + tn(m.h) + ' ' + f1(tf.mkt.gh) + ', ' + tn(m.a) + ' ' + f1(tf.mkt.ga) + '. Su esito e gol le quote sono più affidabili del modello: dove ci sono, la percentuale mostrata è quella delle quote senza commissione.');
    L.push('Stimati dai gol fatti e subiti (partite recenti pesate di più, avversari considerati) e dai tiri in porta attesi.');
    L.push('Esito: 1 ' + pct(r.h) + ', X ' + pct(r.d) + ', 2 ' + pct(r.a) + '. Punteggi più probabili: ' + r.scores.map(function (s) { return s[0] + '-' + s[1] + ' (' + pct(s[2]) + ')'; }).join(', ') + '.');
    var fh = form(m.h), fa = form(m.a);
    if (fh.length) L.push('Ultime ' + fh.length + ' di ' + tn(m.h) + ': ' + fh.join(', ') + '.');
    if (fa.length) L.push('Ultime ' + fa.length + ' di ' + tn(m.a) + ': ' + fa.join(', ') + '.');
    L.push('Nel test l\'esito più probabile è uscito circa 1 volta su 2; goal/no goal è quasi imprevedibile.');
    if (Math.min(tf.nH, tf.nA) < 6) L.push('Attenzione: poche partite disponibili per almeno una squadra, stima meno affidabile.');
    return L;
  }
  function explainPlayer(m, tf, f, k, src) {
    var p = f.p, s = f.st[k], home = f.team === m.h, L = [], tn = teams[f.team] ? teams[f.team].n : '', on = teams[home ? m.a : m.h] ? teams[home ? m.a : m.h].n : '';
    var ruolo = { G: 'portiere', D: 'difensore', M: 'centrocampista', F: 'attaccante' }[p.pos] || '';
    L.push(p.name + ' (' + ruolo + '): ' + (f.status === 'tit' ? (f.sure ? 'titolare' + (src === 'ufficiale' ? ', formazione ufficiale' : ' (confermato da te)') : 'titolare probabile: in casi simili parte dal primo minuto circa ' + pct(f.ps) + ' delle volte, e la percentuale ne tiene conto') : 'dalla panchina') + ', minuti attesi ' + Math.round(f.expMin) + '.');
    var tk = k === 'fc' ? 'fo' : k === 'fs' ? 'fo' : k, sideKey = k === 'fs' ? (home ? 'A' : 'H') : (home ? 'H' : 'A'), lamT = tf.pr[sideKey][tk];
    if (k === 'fs') L.push(on + ' è attesa a ' + f1(lamT) + ' falli commessi in questa partita.');
    else L.push(tn + ' è attesa a ' + f1(lamT) + ' ' + (k === 'fc' ? 'falli commessi' : PST_IT[k]) + ' in questa partita.');
    if (p.apps) L.push('Nelle ultime ' + p.apps + ' presenze: ' + p.y[k] + ' ' + PST_IT[k] + ' in ' + Math.round(p.m90 * 90) + ' minuti. Quando è in campo vale circa il ' + pct(s.share) + (k === 'fs' ? ' dei falli subiti dalla squadra.' : ' del totale di squadra.'));
    else L.push('Nessuna presenza recente: stima basata sulla media del ruolo.');
    L.push('Attesi per lui: ' + f1(s.mean) + ' → 1+ ' + pct(s.p1) + ', 2+ ' + pct(s.p2) + ', 3+ ' + pct(s.p3) + '.');
    if (p.last.length) L.push('Ultime ' + p.last.length + ': ' + p.last.map(function (x) { return x[k] + ' (' + x.min + "')"; }).join(', ') + '.');
    if (p.apps < 4) L.push('Attenzione: poche presenze recenti, stima meno affidabile.');
    return L;
  }

  return { COMPS: COMPS, STAT_IT: STAT_IT, PST: PST, PST_IT: PST_IT, teams: teams, comp: comp, store: store, setFetch: setFetch,
    parseEvent: parseEvent, parseSummary: parseSummary, loadUpcoming: loadUpcoming, loadComp: loadComp, resetCache: resetCache, itName: itName, teamForecast: teamForecast,
    loadPlayers: loadPlayers, playersForecast: playersForecast, occasions: occasions, occAcross: occAcross, picks: picks, surePicks: surePicks, sureAcross: sureAcross, resOptions: resOptions, explainRes: explainRes, explainTeam: explainTeam, explainPlayer: explainPlayer,
    lastN: lastN, f1: f1, pct: pct, posGroup: posGroup, buildSquad: buildSquad, lineup: lineup, playerForecast: playerForecast, psOf: psOf, pPlayer: pPlayer, setCompLoader: setCompLoader, setBook: setBook, bookOf: bookOf, bookInfo: bookInfo, offers: offers, bestOf: bestOf, slipCandidates: slipCandidates, analysis: analysis, shotsOk: shotsOk, statOk: statOk, buildSlip: buildSlip, optSlip: optSlip, mainPick: mainPick, extraMarkets: extraMarkets, explainExtra: explainExtra, grpOf: function (c) { return GRP[c] || (NOMAIN[c] ? 'f' : 'p'); }, modelOffers: modelOffers, allOffers: allOffers, legKey: legKey, CAT_IT: CAT_IT, DUO: DUO };
})();
if (typeof module !== 'undefined') module.exports = Core;

/* Modello statistico — funzioni pure, usate sia dall'app sia dai test.
   Partita: {d: data ms, h, a, H:{sh,sot,co,fo,yc}, A:{...}, ref?}
   sh tiri, sot tiri in porta, co corner, fo falli commessi, yc ammonizioni */
var Model = (function () {
  'use strict';
  var STATS = ['sh', 'sot', 'co', 'fo', 'yc'];
  var DAY = 864e5;

  // Parametri tarati sul test storico (vedi backtest.js)
  var PAR = {
    half: { sh: 150, sot: 200, co: 220, fo: 150, yc: 200, g: 400 },   // emivita in giorni del peso delle partite
    k:    { sh: 3, sot: 4, co: 7, fo: 4, yc: 16, g: 3 },             // forza del "prior" (in partite alla media)
    r:    { sh: 22, sot: 45, co: 10, fo: 1e9, yc: 1e9 },        // dispersione binomiale negativa (squadra)
    rTot: { sh: 120, sot: 120, co: 70, fo: 120, yc: 70 },        // dispersione (totale partita)
    sotMix: 0.75,
    gMix: 0.7, rho: -0.08, gStretch: 1.2,                                    // gol: quota stimata dai gol (il resto dai tiri in porta); correzione pareggi                                              // quota del tiri-in-porta stimata dai tiri
    kRef: 35, refPow: 0,                                      // arbitro: nel test non migliora => escluso (refPow 0)
    newTeam: { att: 0.85, def: 1.15 }                               // squadre senza storico (neopromosse)
  };

  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
    var s = 1.000000000190015;
    for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  // pmf binomiale negativa con media m e dimensione r (r grande => Poisson)
  function nbPmf(k, m, r) {
    if (m <= 0) return k === 0 ? 1 : 0;
    if (!isFinite(r) || r > 1e5) return Math.exp(k * Math.log(m) - m - lgamma(k + 1));
    var p = r / (r + m);
    return Math.exp(lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log(1 - p));
  }
  // P(X > linea), es. linea 4.5 => P(X >= 5)
  function pOver(line, m, r) {
    var kmax = Math.floor(line), s = 0;
    for (var k = 0; k <= kmax; k++) s += nbPmf(k, m, r);
    return Math.min(1, Math.max(0, 1 - s));
  }
  function pAtLeast(n, m, r) { return n <= 0 ? 1 : pOver(n - 0.5, m, r); }

  /* Stima forza offensiva (A) e concessa (D) di ogni squadra per una statistica.
     Atteso = media di lega (casa/trasferta) × A squadra × D avversaria.
     Partite recenti pesano di più; poche partite => la stima resta vicina alla media. */
  function fitStat(matches, now, stat, par) {
    par = par || PAR;
    var half = par.half[stat], k = par.k[stat];
    var rows = [], sH = 0, sA = 0, sw = 0, i, m, w;
    for (i = 0; i < matches.length; i++) {
      m = matches[i];
      if (m.d >= now) continue;
      w = Math.pow(0.5, (now - m.d) / DAY / half);
      if (w < 0.01) continue;
      rows.push({ h: m.h, a: m.a, yh: m.H[stat], ya: m.A[stat], w: w });
      sH += w * m.H[stat]; sA += w * m.A[stat]; sw += w;
    }
    var muH = sw ? sH / sw : 0, muA = sw ? sA / sw : 0, mu = (muH + muA) / 2;
    var A = {}, D = {}, n = {}, t;
    rows.forEach(function (r) { A[r.h] = A[r.a] = D[r.h] = D[r.a] = 1; n[r.h] = (n[r.h] || 0) + r.w; n[r.a] = (n[r.a] || 0) + r.w; });
    for (var it = 0; it < 12; it++) {
      var numA = {}, denA = {}, numD = {}, denD = {};
      for (t in A) { numA[t] = denA[t] = numD[t] = denD[t] = k * mu; }
      for (i = 0; i < rows.length; i++) {
        var r = rows[i];
        numA[r.h] += r.w * r.yh; denA[r.h] += r.w * muH * D[r.a];
        numA[r.a] += r.w * r.ya; denA[r.a] += r.w * muA * D[r.h];
        numD[r.h] += r.w * r.ya; denD[r.h] += r.w * muA * A[r.a];
        numD[r.a] += r.w * r.yh; denD[r.a] += r.w * muH * A[r.h];
      }
      for (t in A) { A[t] = numA[t] / denA[t]; D[t] = numD[t] / denD[t]; }
    }
    return { stat: stat, muH: muH, muA: muA, A: A, D: D, n: n, nMatches: rows.length };
  }

  function fitAll(matches, now, par) {
    var f = {}; STATS.forEach(function (s) { f[s] = fitStat(matches, now, s, par); });
    f.ratio = fitRatio(matches, now, par);
    // gol: forza stimata dai gol + conversione media tiri in porta -> gol
    var p = par || PAR, withG = matches.filter(function (x) { return x.H && x.A && isFinite(x.H.g) && isFinite(x.A.g); });
    if (withG.length) {
      f.g = fitStat(withG, now, 'g', p);
      var sg = 0, ss = 0;
      withG.forEach(function (x) { if (x.d >= now) return; var w = Math.pow(0.5, (now - x.d) / DAY / p.half.g); sg += w * (x.H.g + x.A.g); ss += w * (x.H.sot + x.A.sot); });
      f.conv = ss ? sg / ss : 0.3;
    }
    return f;
  }

  // precisione al tiro (tiri in porta / tiri) per squadra, molto smorzata verso la media
  function fitRatio(matches, now, par) {
    par = par || PAR;
    var half = par.half.sot, kS = 60, tot = { s: 0, t: 0 }, F = {}, G = {};
    matches.forEach(function (m) {
      if (m.d >= now) return;
      var w = Math.pow(0.5, (now - m.d) / DAY / half); if (w < 0.01) return;
      [[m.h, m.H, m.a], [m.a, m.A, m.h]].forEach(function (x) {
        var f = F[x[0]] || (F[x[0]] = { s: 0, t: 0 }), g = G[x[2]] || (G[x[2]] = { s: 0, t: 0 });
        f.s += w * x[1].sh; f.t += w * x[1].sot; g.s += w * x[1].sh; g.t += w * x[1].sot;
        tot.s += w * x[1].sh; tot.t += w * x[1].sot;
      });
    });
    var base = tot.s ? tot.t / tot.s : 0.35, acc = {}, accAg = {}, t;
    for (t in F) acc[t] = (F[t].t + kS * base) / (F[t].s + kS) / base;
    for (t in G) accAg[t] = (G[t].t + kS * base) / (G[t].s + kS) / base;
    return { base: base, acc: acc, accAg: accAg };
  }

  function lam(f, team, opp, home, par) {
    par = par || PAR;
    var a = f.A[team], d = f.D[opp];
    if (a == null) a = par.newTeam.att;
    if (d == null) d = par.newTeam.def;
    return (home ? f.muH : f.muA) * a * d;
  }

  /* Previsione squadra per tutte le statistiche. ref = {yc: fattore, fo: fattore} opzionale */
  function predict(fit, home, away, opt, par) {
    par = par || PAR; opt = opt || {};
    var out = { H: {}, A: {}, T: {} };
    STATS.forEach(function (s) {
      out.H[s] = lam(fit[s], home, away, true, par);
      out.A[s] = lam(fit[s], away, home, false, par);
    });
    // tiri in porta: media tra stima diretta e stima "tiri attesi × precisione"
    var R = fit.ratio, mix = par.sotMix;
    if (R && mix > 0) {
      var viaH = out.H.sh * R.base * (R.acc[home] || 1) * (R.accAg[away] || 1);
      var viaA = out.A.sh * R.base * (R.acc[away] || 1) * (R.accAg[home] || 1);
      out.H.sot = (1 - mix) * out.H.sot + mix * viaH;
      out.A.sot = (1 - mix) * out.A.sot + mix * viaA;
    }
    if (opt.ref) {
      ['yc', 'fo'].forEach(function (s) {
        if (opt.ref[s]) { out.H[s] *= opt.ref[s]; out.A[s] *= opt.ref[s]; }
      });
    }
    STATS.forEach(function (s) { out.T[s] = out.H[s] + out.A[s]; });
    if (fit.g) {
      var gm = par.gMix;
      out.H.g = gm * lam(fit.g, home, away, true, par) + (1 - gm) * out.H.sot * fit.conv;
      out.A.g = gm * lam(fit.g, away, home, false, par) + (1 - gm) * out.A.sot * fit.conv;
      out.T.g = out.H.g + out.A.g;
      // il divario tra le due squadre viene allargato (nel test i favoriti vincevano più spesso del previsto); il totale gol resta uguale
      if (par.gStretch && out.H.g > 0 && out.A.g > 0) { var rho = Math.pow(out.H.g / out.A.g, par.gStretch); out.H.g = out.T.g * rho / (1 + rho); out.A.g = out.T.g / (1 + rho); }
    }
    return out;
  }

  /* Esiti dai gol attesi: griglia dei punteggi (Poisson con correzione sui punteggi bassi) */
  function outcomes(lh, la, rho) {
    var N = 10, grid = [], tot = 0, h = 0, d = 0, a = 0, gg = 0, over = [0, 0, 0, 0, 0, 0], ho = [0, 0, 0, 0], ao = [0, 0, 0, 0], sc = [], i, j, p, k;
    rho = rho || 0;
    for (i = 0; i <= N; i++) for (j = 0; j <= N; j++) {
      p = nbPmf(i, lh, Infinity) * nbPmf(j, la, Infinity);
      if (i === 0 && j === 0) p *= 1 - lh * la * rho; else if (i === 0 && j === 1) p *= 1 + lh * rho; else if (i === 1 && j === 0) p *= 1 + la * rho; else if (i === 1 && j === 1) p *= 1 - rho;
      tot += p; if (i > j) h += p; else if (i === j) d += p; else a += p;
      if (i > 0 && j > 0) gg += p;
      for (k = 0; k < 6; k++) if (i + j > k) over[k] += p;
      for (k = 0; k < 4; k++) { if (i > k) ho[k] += p; if (j > k) ao[k] += p; }
      if (i <= 4 && j <= 4) sc.push([i, j, p]);
      (grid[i] || (grid[i] = []))[j] = p;
    }
    sc.sort(function (x, y) { return y[2] - x[2]; });
    return { h: h / tot, d: d / tot, a: a / tot, gg: gg / tot, over: over.map(function (x) { return x / tot; }), ho: ho.map(function (x) { return x / tot; }), ao: ao.map(function (x) { return x / tot; }), scores: sc.slice(0, 3).map(function (x) { return [x[0], x[1], x[2] / tot]; }), grid: grid.map(function (row) { return row.map(function (x) { return x / tot; }); }) };
  }

  /* Gol attesi che le quote del bookmaker sottintendono: dati P(1), P(2) e P(over 2,5) senza margine,
     trova i gol attesi di casa e trasferta che li riproducono */
  function impliedGoals(ph, pa, po, rho) {
    var T = 2.7, s = 0.5, i, o;
    for (i = 0; i < 40; i++) {
      o = outcomes(T * s, T * (1 - s), rho);
      T *= Math.exp(1.2 * (po - o.over[2])); s += 0.5 * ((ph - pa) - (o.h - o.a));
      s = Math.min(0.93, Math.max(0.07, s)); T = Math.min(6, Math.max(1, T));
    }
    return [T * s, T * (1 - s)];
  }

  /* Fattore arbitro: rapporto tra quanto registrato nelle sue partite e quanto atteso, smorzato */
  function refFactor(sumObs, sumExp, nMatches, par) {
    par = par || PAR;
    if (!nMatches || !sumExp) return 1;
    var perMatch = sumExp / nMatches;
    var raw = (sumObs + par.kRef * perMatch) / (sumExp + par.kRef * perMatch);
    return Math.pow(raw, par.refPow);
  }

  return { STATS: STATS, PAR: PAR, DAY: DAY, lgamma: lgamma, nbPmf: nbPmf, pOver: pOver, pAtLeast: pAtLeast,
    fitStat: fitStat, fitAll: fitAll, fitRatio: fitRatio, lam: lam, predict: predict, outcomes: outcomes, impliedGoals: impliedGoals, refFactor: refFactor };
})();
if (typeof module !== 'undefined') module.exports = Model;

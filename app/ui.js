/* Interfaccia */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var T = Core.teams, f1 = Core.f1, pct = Core.pct;
  var FAV = (function () { try { return JSON.parse(localStorage.getItem('overlab_fav') || '{}') || {}; } catch (e) { return {}; } })();
  function saveFav() { try { localStorage.setItem('overlab_fav', JSON.stringify(FAV)); } catch (e) {} }
  var S = { rev: {}, hi70: false, motd: null, comp: 'all', up: null, err: null, loading: false, m: null, cd: null, tf: null, pd: null, pf: null, perr: null, prog: null, tab: 'top', pst: 'sh', pteam: null, ov: {}, open: null, pfil: 'all', hv: 'list', sure: null, ob: true, slip: { cats: { sot: 1, sotT: 1, sh: 1, shT: 1, co: 1, coT: 1, res: 1, tg: 1, psot: 0, psh: 0, pfc: 0, pfs: 0 }, mode: 'auto', when: 'od', goal: 'quota', Q: 5, P: 0.5, N: 0, combo: false, sel: {}, ban: {}, stake: 10 }, cands: null, more: false, token: 0, coll: {} };
  var app = $('#app');
  var SNAP = !!window.OVERLAB_SNAPSHOT, PLAY = !!window.OVERLAB_PLAY, R = '';
  if (PLAY) document.documentElement.classList.add('play');
  function cur() { return SNAP ? R : location.hash.replace(/^#/, ''); }
  function nav(r) { if (SNAP) { R = r; route(); } else if (cur() === r) route(); else location.hash = r; }
  var ROLE = { G: 'POR', D: 'DIF', M: 'CEN', F: 'ATT' };
  var PSHORT = { sh: 'Tiri', sot: 'In porta', fc: 'Falli fatti', fs: 'Falli subiti', yc: 'Giallo', gl: 'Gol' };
  var STT = { tit: 'Titolare', pan: 'Panchina', out: 'Assente' };

  function tn(id) { return T[id] ? T[id].n : 'Squadra'; }
  function logo(id) { var t = T[id], L = SNAP && window.OVERLAB_LOGOS, src = L ? L[id] : (t && t.l); return src ? '<img class="lg" src="' + esc(src) + '" alt="" loading="lazy" width="28" height="28" onerror="this.style.visibility=\'hidden\'">' : '<span class="lg ph" aria-hidden="true">' + esc(((t && t.s) || '').slice(0, 3).toUpperCase()) + '</span>'; }
  // icone (tratto 1,8 su griglia 24)
  var ICO = {
    cal: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    ticket: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6Z"/><path d="M14 5.5v2M14 11v2M14 16.5v2"/>',
    spark: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9Z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
    pick: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.4 1.4L7.5 4.8M3.5 12l1.4 1.4 2.6-2.6M3.5 18l1.4 1.4 2.6-2.6"/>',
    res: '<path d="M2.5 19h19"/><path d="M4.5 19V6.5h15V19"/><path d="M4.5 10.5h15M4.5 14.5h15M9.5 6.5V19M14.5 6.5V19" stroke-width="1.1"/>',
    sh: '<circle cx="15.5" cy="12" r="5.8"/><path d="M15.5 9.3l2.3 1.7-.9 2.7h-2.8l-.9-2.7Z"/><path d="M2.5 9h4.5M3.5 12.5h4M2.5 16h5.5"/>',
    sot: '<circle cx="14" cy="10" r="7"/><circle cx="14" cy="10" r="3"/><path d="M3 21l8.5-8.5"/>',
    co: '<path d="M6 21V3.5"/><path d="M6 4.5h10.5l-3 3.5 3 3.5H6"/><path d="M6 15.5a5.5 5.5 0 0 1 5.5 5.5"/>',
    fo: '<circle cx="9" cy="14.5" r="5"/><path d="M12.3 10.8L20.5 7v4l-6.4 2"/><circle cx="9" cy="14.5" r="1.3" fill="currentColor" stroke="none"/>',
    yc: '<rect x="7.5" y="3.5" width="9.5" height="15" rx="1.8" transform="rotate(10 12 11)"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    team: '<path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6Z"/>',
    bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6Z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>'
  };
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICO[n] || '') + '</svg>'; }
  function cls(p) { return p >= 0.75 ? 'hi' : p >= 0.6 ? 'ok' : p >= 0.45 ? 'mid' : 'lo'; }
  function quota(p) { return p > 0 ? (1 / p).toFixed(2).replace('.', ',') : '-'; }
  function ln(x) { return String(x).replace('.', ','); }
  function q2(x) { return x.toFixed(2).replace('.', ','); }
  function bkName() { var b = Core.bookInfo(); return b ? b.name : ''; }
  // riga piccola sotto la giocata: quota del bookmaker e quota minima
  function oddsTxt(p) { if (PLAY) return ''; if (p.fair) return 'quota giusta ' + quota(p.p); return p.odds ? 'quota ' + q2(p.odds) + (p.p * p.odds >= 1 ? ' · paga più del minimo (' + quota(p.p) + ')' : ' · minima ' + quota(p.p)) : 'quota giusta ' + quota(p.p); }
  function extraWhy(p) {
    var L = [];
    if (p.pk > 0) L.push('Stima usata ' + pct(p.p) + ': media tra il modello (' + pct(p.pm) + ') e quello che indicano le quote (' + pct(p.pk) + ').');
    if (p.duo) L.push('In questa giocata contano anche i tiri di chi lo sostituisce: la stima ne tiene conto.');
    if (p.odds && !p.fair) L.push(p.p * p.odds >= 1 ? 'La quota ' + q2(p.odds) + ' è più alta della minima ' + quota(p.p) + ': secondo la stima paga più del rischio.' : 'La quota ' + q2(p.odds) + ' è più bassa della minima ' + quota(p.p) + ': secondo la stima paga meno del rischio.');
    return L;
  }
  function dayLabel(d) {
    var a = new Date(d), n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), diff = Math.floor((new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() - t0) / 864e5);
    if (diff === 0) return 'Oggi'; if (diff === 1) return 'Domani';
    return a.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function hm(d) { return new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }

  /* ---------- schermata iniziale ---------- */
  function loadHome(force) {
    S.loading = true; S.err = null; render();
    Core.loadUpcoming(force).then(function (up) { S.up = up; S.loading = false; render(); },
      function () { S.loading = false; S.err = 'Non riesco a leggere le partite. Controlla la connessione e riprova.'; render(); });
  }
  function homeHtml() {
    var have = {}; (S.up || []).forEach(function (m) { have[m.lg] = 1; });
    var cs = SNAP && S.up ? Core.COMPS.filter(function (c) { return have[c.id]; }) : Core.COMPS;
    var grp = [], seen = {}; cs.forEach(function (c) { if (!seen[c.grp]) { seen[c.grp] = 1; grp.push(c.grp); } });
    var VH = { list: ['trophy', 'Partite', 'Tocca una partita per l\'analisi completa'], sure: Core.bookInfo() ? ['target', 'Occasioni', 'Quote da 1,40 in su che secondo il modello pagano bene'] : ['target', 'In evidenza', 'Il pronostico principale di ogni partita'], slip: ['spark', 'Schedina IA', 'Scegli obiettivo e budget: l\'IA compone la schedina'] }[S.hv] || ['trophy', 'Partite', ''];
    var h = '<div class="vh"><h1>' + ic(VH[0]) + esc(VH[1]) + '</h1><p>' + esc(VH[2]) + '</p></div>';
    if (+window.OVERLAB_EXPIRES) h += '<div class="note">Versione di prova: funziona fino a <b>' + esc(expTxt(true)) + '</b>.</div>';
    h += dateStrip();
    var sel = '<label class="psel">' + ic('filter') + '<select id="compsel" aria-label="Competizione"><option value="all"' + (S.comp === 'all' ? ' selected' : '') + '>Tutte le competizioni</option>' + grp.map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + cs.filter(function (c) { return c.grp === g; }).map(function (c) { return '<option value="' + c.id + '"' + (S.comp === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select></label>';
    h += '<div class="pills">' + sel + [['od', 'Oggi e domani'], ['weekend', 'Fino a domenica'], ['tutte', 'Tutte']].map(function (x) { return '<button class="pill' + (S.slip.when === x[0] ? ' on' : '') + '" data-swhen="' + x[0] + '">' + (x[0] === 'tutte' ? '' : ic('clock')) + x[1] + '</button>'; }).concat(S.hv === 'sure' ? ['<button class="pill' + (S.hi70 ? ' on' : '') + '" data-act="hi70" aria-pressed="' + S.hi70 + '">Solo sopra il 70%</button>'] : []).join('') + '</div>';
    if (S.err) return h + '<div class="note err">' + esc(S.err) + ' <button class="btn" data-act="reload">Riprova</button></div>';
    if (!S.up) return h + '<div class="note">Carico le prossime partite…</div>' + skel(5);
    var list = S.up.filter(function (m) { return S.comp === 'all' || m.lg === S.comp; });
    if (!list.length) return h + '<div class="note">Nessuna partita in programma per questa competizione nelle prossime settimane.</div>';
    var DW = winOf(S.slip.when);
    if (S.slip.when !== 'tutte' && S.hv !== 'slip') {
      list = list.filter(function (m) { return m.d >= DW[0] && m.d <= DW[1] && (m.d > Date.now() - 3 * 36e5); });
      if (!list.length) return h + '<div class="note">Nessuna partita ' + esc(DAYS_TXT[S.slip.when]) + ' per questa competizione. Scegli un altro giorno qui sopra o «Tutte».</div>';
    }
    if (S.hv === 'sure') return h + sureHtml(list);
    if (S.hv === 'slip') return h + slipHtml(list);
    var horizon = S.slip.when === 'tutte' ? Date.now() + (S.comp === 'all' ? 4 : 11) * 864e5 : Infinity;
    var shown = list.filter(function (m, i) { return m.d <= horizon || i < 8; });
    h += motdHtml(shown) + favHtml(shown);
    h += '<p class="count">' + shown.length + ' partite</p>';
    // per giorno, poi per campionato nell'ordine dell'elenco competizioni
    var days = [], byDay = {}; shown.forEach(function (m) { var dl = dayLabel(m.d); if (!byDay[dl]) { byDay[dl] = []; days.push(dl); } byDay[dl].push(m); });
    var order = {}; Core.COMPS.forEach(function (c, i) { order[c.id] = i; });
    days.forEach(function (dl) {
      if (days.length > 1) h += '<h2 class="day">' + esc(dl) + '</h2>';
      var lgs = [], byLg = {}; byDay[dl].forEach(function (m) { if (!byLg[m.lg]) { byLg[m.lg] = []; lgs.push(m.lg); } byLg[m.lg].push(m); });
      lgs.sort(function (a, b) { return (order[a] || 0) - (order[b] || 0); });
      lgs.forEach(function (lg) {
        var c = Core.comp(lg), k = dl + '|' + lg, closed = !!S.coll[k];
        h += '<section class="lgrp' + (closed ? ' closed' : '') + '"><button class="lgh" data-act="coll" data-k="' + esc(k) + '" aria-expanded="' + !closed + '"><b>' + esc(c ? c.name : lg) + '</b><span>' + byLg[lg].length + '</span>' + ic('down') + '</button>';
        byLg[lg].forEach(function (m) {
          h += '<button class="mrow" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="tm' + (m.st === 'in' ? ' live' : '') + '">' + (m.st === 'in' ? 'LIVE' : hm(m.d)) + '</span><span class="tn"><span class="row">' + logo(m.h) + '<span>' + esc(tn(m.h)) + '</span></span><span class="row">' + logo(m.a) + '<span>' + esc(tn(m.a)) + '</span></span></span>' + ic('chev') + '</button>';
        });
        h += '</section>';
      });
    });
    var when = SNAP && window.OVERLAB_T ? 'Dati aggiornati ' + new Date(window.OVERLAB_T).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.' : 'Dati in diretta.';
    return h + '<p class="foot">' + when + '' + '</p>';
  }
  // le giocate più probabili delle prossime partite (finestra di 36 ore dalla prima in programma)
  // occasioni: giocate con quota da 1,40 in su che secondo la stima pagano bene rispetto al rischio
  function sureHtml(list) {
    var FAIR = !Core.bookInfo();
    var win = (S.slip.when === 'tutte' ? list.filter(function (m) { return m.d <= list[0].d + 36 * 36e5; }) : list).filter(function (m) { return m.d > Date.now() && (FAIR || Core.bookOf(m)); }).slice(0, 40);
    if (!win.length) return '<div class="note">' + (FAIR ? 'Nessuna partita ancora da giocare in questo periodo.' : 'In questo periodo non ho quote per queste partite.') + ' Scegli un altro giorno qui sopra o un\'altra competizione.</div>';
    var key = S.comp + ':' + S.slip.when + ':' + win.length + ':' + win[0].id + ':' + (window.OVERLAB_T || 0) + ':' + S.hi70;
    if (!S.sure || S.sure.key !== key) {
      var job = S.sure = { key: key, items: null };
      Core.occAcross(win, SNAP, FAIR && S.hi70 ? [1.2, 1.43] : null).then(function (items) { job.items = items; if (S.sure === job && S.hv === 'sure' && cur() === '') rerender(); }, function () { job.items = []; if (S.sure === job) rerender(); });
    }
    var h = FAIR ? '<div class="note">' + (S.hi70 ? 'Per ogni partita la giocata più solida <b>sopra il 70%</b> (quota giusta tra 1,20 e 1,43), dalla più probabile.' : 'Il <b>pronostico principale</b> di ogni partita: la giocata più probabile con quota giusta tra 1,40 e 2,50, ordinate dalla più probabile.') + ' Nessuna è sicura.</div>' : '<div class="note">Giocate con <b>quota da 1,40 in su</b> e probabilità stimata di almeno 50%, ordinate dalla più conveniente. <b>Occasione</b> vuol dire che la stima è più alta di quella che indica la quota: secondo il modello paga più del rischio. Non è una garanzia: su tiri, corner e giocatori non ho uno storico delle quote per verificarlo.</div>';
    if (!S.sure.items) return h + '<div class="note">' + (FAIR ? 'Preparo i pronostici di ' : 'Cerco le occasioni in ') + win.length + ' partite…</div>' + skel(5);
    var per = {}, rows = S.sure.items.filter(function (x) { per[x.m.id] = (per[x.m.id] || 0) + 1; return per[x.m.id] <= 2; }).slice(0, 30);
    if (!rows.length) return h + '<div class="note">Nessuna giocata da 1,40 in su con probabilità di almeno 50% in queste partite.</div>';
    h += '<div class="list">' + rows.map(function (x) {
      var m = x.m, p = x.pick;
      return '<div class="pick' + (p.occ ? ' occ' : '') + '"><button class="pick-b" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="pick-l">' + (p.occ ? '<span class="tag gold">Occasione</span>' : '') + '<b>' + esc(p.label) + '</b><small>' + esc(tn(m.h) + ' - ' + tn(m.a)) + ' · ' + esc(dayLabel(m.d).toLowerCase()) + ' ' + hm(m.d) + '</small>' + (FAIR ? '<small>quota giusta ' + quota(p.p) + '</small></span><span class="pp ' + cls(p.p) + '">' + pct(p.p) + '</span>' : '<small>stima <b class="' + cls(p.p) + 't">' + pct(p.p) + '</b> · quota giusta ' + quota(p.p) + '</small></span><span class="pp od2' + (p.occ ? ' gold' : '') + '">' + q2(p.odds) + '</span>') + '</button></div>';
    }).join('') + '</div>';
    return h + '<p class="foot">' + (FAIR ? 'Una per partita.' : 'Al massimo due per partita.') + ' Tocca una riga per aprire la partita e leggere la spiegazione.</p>';
  }
  /* partita del giorno: la prima in programma del campionato più importante, con il suo pronostico */
  function motdHtml(list) {
    var order = {}; Core.COMPS.forEach(function (c, i) { order[c.id] = i; });
    var fut = list.filter(function (m) { return m.d > Date.now(); }); if (!fut.length) return '';
    var d0 = dayLabel(fut[0].d), m = fut.filter(function (x) { return dayLabel(x.d) === d0; }).sort(function (a, b) { return (order[a.lg] != null ? order[a.lg] : 99) - (order[b.lg] != null ? order[b.lg] : 99) || a.d - b.d; })[0];
    if (!S.motd || S.motd.id !== m.id) {
      var job = S.motd = { id: m.id, pick: null, res: null };
      Core.loadComp(m.lg, false).then(function (cd) { var tf = Core.teamForecast(cd, m); job.res = tf.res; job.pick = Core.mainPick(m, tf, null); if (S.motd === job && cur() === '' && S.hv === 'list') rerender(); }, function () {});
    }
    var j = S.motd, c = Core.comp(m.lg), r = j.res, p = j.pick;
    return '<button class="motd" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="motd-k">' + ic('star') + 'Partita del giorno</span><span class="motd-t"><span class="motd-s">' + logo(m.h) + '<b>' + esc(tn(m.h)) + '</b></span><span class="motd-c"><i>VS</i><small>' + esc(dayLabel(m.d)) + ' · ' + hm(m.d) + '</small><small>' + esc(c ? c.name : '') + '</small></span><span class="motd-s">' + logo(m.a) + '<b>' + esc(tn(m.a)) + '</b></span></span>' +
      (r ? '<span class="x12-b motd-b"><i class="h" style="flex:' + r.h.toFixed(3) + '"></i><i class="d" style="flex:' + r.d.toFixed(3) + '"></i><i class="a" style="flex:' + r.a.toFixed(3) + '"></i></span>' : '') +
      (p ? '<span class="motd-p"><small>Pronostico</small><b>' + esc(p.label) + '</b><span>stima ' + pct(p.p) + (PLAY ? '' : ' · quota giusta ' + quota(p.p)) + '</span></span>' : '<span class="motd-p"><small>Preparo il pronostico…</small></span>') + '</button>';
  }
  // le partite delle squadre che segui
  function favHtml(list) {
    var mine = list.filter(function (m) { return FAV[m.h] || FAV[m.a]; }); if (!mine.length) return '';
    return '<h2 class="day">' + ic('heart') + 'Le tue squadre</h2><div class="list">' + mine.slice(0, 6).map(function (m) { return '<button class="mrow fav" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="tm">' + esc(dayLabel(m.d).slice(0, 3)) + ' ' + hm(m.d) + '</span><span class="tn"><span class="row">' + logo(m.h) + '<span>' + esc(tn(m.h)) + '</span></span><span class="row">' + logo(m.a) + '<span>' + esc(tn(m.a)) + '</span></span></span></button>'; }).join('') + '</div>';
  }
  /* temi rapidi della schedina: tipi di giocata già scelti. Marcatori e ammoniti escono di rado per natura: lì ogni giocata basta che esca almeno 12 volte su 100 */
  var THEMES = [['gol', 'Gol', { res: 1, tg: 1, mg: 1, combo: 1, ht: 1 }], ['corner', 'Corner', { co: 1, coT: 1, cx: 1 }], ['tiri', 'Tiri', { sot: 1, sotT: 1, sh: 1, shT: 1, psot: 1, psh: 1 }],
    ['cart', 'Cartellini', { yc: 1, ycT: 1 }], ['amm', 'Ammoniti', { pyc: 1 }, 0.12], ['marc', 'Marcatori', { pgl: 1 }, 0.12], ['falli', 'Falli', { fo: 1, foT: 1, pfc: 1, pfs: 1 }]];
  /* ---------- schedina composta dall'app ---------- */
  function slipHtml(list) {
    var bi = Core.bookInfo(), FAIR = !bi;
    var ms = list.filter(function (m) { return (FAIR || Core.bookOf(m)) && m.d > Date.now(); });
    if (!ms.length) return '<div class="note">Nessuna partita ancora da giocare tra quelle in programma.</div>';
    var key = S.comp + ':' + ms.length + ':' + ms[0].id + ':' + (bi ? bi.t : window.OVERLAB_T || 0);
    if (!S.cands || S.cands.key !== key) {
      var job = S.cands = { key: key, items: null };
      Core.slipCandidates(ms, true).then(function (it) { job.items = it; if (S.cands === job && S.hv === 'slip' && cur() === '') rerender(); }, function () { job.items = []; if (S.cands === job) rerender(); });
    }
    var o = S.slip, auto = o.mode !== 'man', W = winOf(o.when);
    var seg = function (items, cur, attr) { return items.map(function (x) { return '<button class="' + (cur === x[0] ? 'on' : '') + '" data-' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join(''); };
    var chips = function (items, cur, attr) { return '<div class="wrapc">' + items.map(function (x) { return '<button class="chip' + (cur === x[0] ? ' on' : '') + '" data-' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; };
    var top = '<div class="seg">' + seg([['auto', ic('spark') + '<span>Sceglie l\'IA</span>'], ['man', ic('pick') + '<span>Scelgo io</span>']], auto ? 'auto' : 'man', 'smode') + '</div>' +
      '<div class="wrapc themes"><span class="th-l">Tema</span>' + THEMES.map(function (x) { return '<button class="chip' + (o.theme === x[0] ? ' on' : '') + '" data-stheme="' + x[0] + '" aria-pressed="' + (o.theme === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var whenHtml = '';
    var info = '';
    if (!S.cands.items) return top + '<div class="note">Preparo la schedina con ' + ms.length + ' partite…</div>' + skel(4) + whenHtml;
    var have = {}, inWin = {}; S.cands.items.forEach(function (c) { if (c.m.d > Date.now() && c.m.d >= W[0] && c.m.d <= W[1]) { have[c.o.cat] = 1; if (o.cats[c.o.cat]) inWin[c.m.id] = c.m; } });
    var wms = Object.keys(inWin).map(function (k) { return inWin[k]; }).sort(function (a, b) { return a.d - b.d; });
    var catsHtml = '<h2 class="day">Tipo di giocata</h2><div class="wrapc">' + Object.keys(Core.CAT_IT).filter(function (c) { return have[c]; }).map(function (c) { return '<button class="chip' + (o.cats[c] ? ' on' : '') + '" data-scat="' + c + '" aria-pressed="' + !!o.cats[c] + '">' + esc(Core.CAT_IT[c]) + '</button>'; }).join('') + '</div>';
    if (!wms.length) return top + '<div class="note">' + (Object.keys(have).length ? 'Nessuna partita di questo periodo ha giocate dei tipi scelti. Aggiungi un tipo di giocata qui sotto.' : 'Nessuna partita in questo periodo. Scegli un altro giorno qui sopra.') + '</div>' + whenHtml + (Object.keys(have).length ? catsHtml : '');
    // ---- impostazioni (vanno sotto la schedina) ----
    var nsel = 0, selHtml = '';
    if (!auto) {
      var curd = ''; nsel = wms.filter(function (m) { return o.sel[m.id]; }).length;
      selHtml = '<h2 class="day" id="msel">Partite (' + nsel + ' scelte)</h2><div class="wrapc"><button class="chip" data-ssel="__all">Tutte</button><button class="chip" data-ssel="__none">Nessuna</button></div><div class="list">';
      wms.forEach(function (m) {
        var dl = dayLabel(m.d); if (dl !== curd) { curd = dl; selHtml += '<div class="sday">' + esc(dl) + '</div>'; }
        selHtml += '<button class="msel' + (o.sel[m.id] ? ' on' : '') + '" data-ssel="' + esc(m.id) + '" aria-pressed="' + !!o.sel[m.id] + '"><span class="ck" aria-hidden="true">' + (o.sel[m.id] ? '✓' : '') + '</span><span class="msel-n">' + esc(tn(m.h) + ' - ' + tn(m.a)) + '</span><span class="msel-t">' + hm(m.d) + '</span></button>';
      });
      selHtml += '</div>';
    }
    var QS = [2, 5, 10, 20, 50], QV = [2, 3, 5, 10, 20, 30, 50, 100];
    var ctl = '<h2 class="day sett">Imposta la schedina</h2>' + whenHtml + catsHtml + selHtml;
    ctl += '<h2 class="day">Obiettivo</h2><div class="seg small">' + seg([['quota', 'Quota da raggiungere'], ['prob', 'Probabilità minima']], o.goal, 'sgoal') + '</div>';
    if (o.goal === 'quota') ctl += '<div class="wrapc">' + QV.map(function (v) { return '<button class="chip' + (o.Q === v ? ' on' : '') + '" data-sq="' + v + '">' + v + '</button>'; }).join('') + '<label class="stkin qin"><span>Altra</span><input id="qin" type="number" inputmode="decimal" min="1.1" max="10000" step="0.5" value="' + (QV.indexOf(o.Q) < 0 ? o.Q : '') + '" placeholder="quota"></label></div>';
    else ctl += '<div class="wrapc">' + [30, 40, 50, 60, 70, 80].map(function (v) { return '<button class="chip' + (Math.round(o.P * 100) === v ? ' on' : '') + '" data-sp="' + v + '">' + v + ' su 100</button>'; }).join('') + '</div>';
    if (auto) ctl += '<h2 class="day">Quante partite</h2>' + chips([[0, 'Decide l\'IA'], [3, '3'], [5, '5'], [8, '8'], [10, '10'], [15, '15']], o.N, 'sn');
    ctl += '<div class="wrapc"><button class="chip' + (o.combo ? ' on' : '') + '" data-scombo="1" aria-pressed="' + !!o.combo + '">MyCombo: fino a 2 giocate nella stessa partita</button></div>';
    ctl += '<h2 class="day">Budget</h2><div class="stk"><div class="seg small" id="stq">' + QS.map(function (v) { return '<button class="' + (o.stake === v ? 'on' : '') + '" data-stake="' + v + '">' + v + ' €</button>'; }).join('') + '</div><label class="stkin"><span>Altra cifra</span><input id="stakein" type="number" inputmode="decimal" min="1" max="10000" step="1" value="' + (QS.indexOf(o.stake) < 0 ? o.stake : '') + '" placeholder="€"></label></div>';
    ctl += info + '<p class="foot">Per raggiungere l\'obiettivo l\'IA cerca la combinazione con la probabilità più alta (o la quota più alta), ' + (FAIR ? 'usando solo giocate che secondo il modello escono almeno ' + (o.minP ? Math.round(o.minP * 100) + ' volte su 100' : '6 volte su 10') + '. A parità preferisce meno partite: dal bookmaker ogni giocata in più toglie un po\' di quota.' : 'usando solo giocate che secondo modello e quote escono almeno una volta su due.') + ' Nessuna schedina è sicura.</p>';
    // riepilogo delle scelte, in alto
    var goalTxt = o.goal === 'quota' ? 'quota ' + q2(o.Q) : 'almeno ' + Math.round(o.P * 100) + ' su 100';
    var whenTxt = DAYS_TXT[o.when] || 'tutte le date';
    var recap = '<p class="foot recap">' + esc(whenTxt) + ' · ' + esc(goalTxt) + (auto && o.N ? ' · ' + o.N + ' partite' : '') + (o.combo ? ' · MyCombo' : '') + ' · <span class="st-rc">' + esc(stakeTxt()) + '</span> — <a href="#" data-act="slipset">cambia</a></p>';
    if (!auto && !nsel) { S.slipNow = null; return top + '<div class="note">Scegli le partite qui sotto: l\'IA trova in ognuna la giocata migliore per il tuo obiettivo.</div>' + ctl; }
    var opt = { cats: o.cats, from: W[0], to: W[1], goal: o.goal, Q: o.Q, P: o.P, N: auto ? o.N : 0, combo: o.combo, ban: o.ban, ids: auto ? null : o.sel, all: !auto, minLegP: o.minP != null ? o.minP : undefined };
    var s = Core.optSlip(S.cands.items, opt);
    S.slipNow = s.items.length ? s : null;
    if (!s.items.length) {
      var why = s.impossible === 'poche' ? 'Ci sono solo ' + s.avail + ' partite con giocate adatte: scegli meno partite, un periodo più lungo o più tipi di giocata.'
        : o.goal === 'quota' ? 'Con queste partite e questi tipi di giocata non arrivo a quota ' + q2(o.Q) + (s.maxOdds > 1 ? ' (al massimo circa ' + q2(s.maxOdds) + ')' : '') + ' usando giocate che escono almeno ' + (FAIR ? (o.minP ? Math.round(o.minP * 100) + ' volte su 100' : '6 volte su 10') : 'una volta su due') + '. Aggiungi partite o tipi di giocata, attiva MyCombo o abbassa la quota.'
        : 'Con queste partite non arrivo a ' + Math.round(o.P * 100) + ' su 100. Togli qualche partita o abbassa la probabilità minima.';
      return top + recap + '<div class="note">' + why + '</div>' + (Object.keys(o.ban).length ? '<button class="btn wide" data-act="slipfirst">Torna alla prima</button>' : '') + ctl;
    }
    var res = '<h2 class="day">La tua schedina</h2>' + recap + '<div class="list">' + s.items.map(function (x) {
      var m = x.m, combo = x.legs.length > 1;
      return '<div class="pick' + (combo ? ' combo' : '') + '"><button class="pick-b" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="pick-l">' + (combo ? '<span class="tag">MyCombo</span>' : '') + x.legs.map(function (p) { return '<b>' + esc(p.label) + (combo ? ' <span class="lq">' + q2(p.odds) + '</span>' : '') + '</b>'; }).join('') + '<small>' + esc(tn(m.h) + ' - ' + tn(m.a)) + ' · ' + esc(dayLabel(m.d).toLowerCase()) + ' ' + hm(m.d) + ' · stima ' + pct(x.p) + '</small></span><span class="pp od2">' + q2(x.odds) + '</span></button></div>';
    }).join('') + '</div>';
    var ev = s.p * s.odds, ncombo = s.items.filter(function (x) { return x.legs.length > 1; }).length;
    res += '<div class="sum"><div><small>' + (FAIR ? 'Quota giusta' : 'Quota totale') + '</small><b>' + q2(s.odds) + '</b></div><div><small>Probabilità stimata</small><b>' + pct(s.p) + '</b></div><div><small id="st-lab">' + stakeLab() + '</small><b id="st-win">' + eur(o.stake * s.odds) + '</b></div></div>';
    res += '<div class="note" id="st-note">' + stakeNote(s) + '</div>';
    res += '<div class="note">' + s.items.length + ' partite, ' + s.items.reduce(function (t, x) { return t + x.legs.length; }, 0) + ' giocate. Esce tutta circa ' + chance(s.p) + (Math.abs(s.ps - s.p) > 0.005 ? ' (stima prudente ' + chance(s.ps) + ')' : '') + '. ' + (FAIR ? 'Sono le quote giuste del modello: dal bookmaker saranno un po\' più basse, e così la vincita.' : ev >= 1 ? 'Secondo la stima la quota paga più del rischio.' : 'La quota paga meno del rischio, come quasi sempre: è il margine del bookmaker.') + (ncombo ? ' Nei MyCombo la quota viene ricalcolata, di solito un po\' più bassa del prodotto.' : '') + '</div>';
    if (auto && o.N && s.items.length < o.N) res += '<div class="note">Ho trovato solo ' + s.items.length + ' partite adatte.</div>';
    if (!auto) { var used = {}; s.items.forEach(function (x) { used[x.m.id] = 1; }); var miss = wms.filter(function (m) { return o.sel[m.id] && !used[m.id]; });
      if (miss.length) res += '<div class="note">Senza giocate adatte ai tipi scelti (o che escono almeno una volta su due): ' + esc(miss.map(function (m) { return tn(m.h) + ' - ' + tn(m.a); }).join(', ')) + '. Aggiungi un tipo di giocata per usarle.</div>'; }
    res += '<button class="btn wide pri" data-act="slipnext">' + ic('spark') + 'Dammene un\'altra</button>' + (Object.keys(o.ban).length ? '<button class="btn wide" data-act="slipfirst">Torna alla prima</button>' : '');
    res += '<p class="foot">Tocca una giocata per aprire la partita e leggere la spiegazione.</p>';
    var bar = '<button class="sbar" data-act="slipup">' + ic('ticket') + '<span>Quota <b>' + q2(s.odds) + '</b> · ' + pct(s.p) + ' · ' + '<span class="st-rc">' + esc(stakeTxt()) + '</span> → <b id="st-win2">' + eur(o.stake * s.odds) + '</b></span>' + ic('up') + '</button>';
    return top + '<div id="slipres">' + res + '</div>' + ctl + bar;
  }
  var DAYS_TXT = { oggi: 'oggi', domani: 'domani', od: 'oggi e domani', weekend: 'fino a domenica', tutte: '' };
  function dayKey(n) { return n === 0 ? 'oggi' : n === 1 ? 'domani' : 'd' + n; }
  function dateStrip() {
    var d = new Date(), cnt = {}, s0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    (S.up || []).forEach(function (m) { if (S.comp !== 'all' && m.lg !== S.comp) return; var n = Math.floor((m.d - s0) / 864e5); if (n >= 0 && n < 7 && m.d > Date.now() - 3 * 36e5) cnt[n] = (cnt[n] || 0) + 1; });
    var h = '<div class="dstrip" role="group" aria-label="Giorno">';
    for (var n = 0; n < 7; n++) {
      var dt = new Date(s0 + n * 864e5 + 3 * 36e5), k = dayKey(n);
      DAYS_TXT[k] = n < 2 ? DAYS_TXT[k] : dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' });
      h += '<button class="dcard' + (S.slip.when === k ? ' on' : '') + '" data-swhen="' + k + '" aria-pressed="' + (S.slip.when === k) + '"><small>' + (n === 0 ? 'Oggi' : n === 1 ? 'Domani' : esc(dt.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''))) + '</small><b>' + dt.getDate() + '</b><i>' + (cnt[n] ? cnt[n] + ' partite' : '—') + '</i></button>';
    }
    return h + '</div>';
  }
  function chance(p) { return p >= 0.095 ? Math.max(1, Math.round(p * 10)) + ' volte su 10' : Math.max(1, Math.round(p * 100)) + ' volte su 100'; }
  // periodo: [da, a] in millisecondi, ora locale
  function winOf(k) {
    var d = new Date(), s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), day = 864e5;
    if (k === 'oggi') return [0, s + day - 1];
    if (k === 'domani') return [s + day, s + 2 * day - 1];
    if (k === 'od') return [0, s + 2 * day - 1];
    if (/^d\d$/.test(k)) { var n = +k.slice(1); return [s + n * day, s + (n + 1) * day - 1]; }
    if (k === 'weekend') return [0, s + ((7 - d.getDay()) % 7 + 1) * day - 1];
    return [0, Infinity];
  }
  function eur(v) { return q2(Math.round(v * 100) / 100) + ' €'; }
  function stakeTxt() { var v = S.slip.stake; return (Math.round(v) === v ? String(v) : q2(v)) + ' €'; }
  function stakeLab() { return 'Con ' + stakeTxt() + ' incassi'; }
  function stakeNote(s) { var v = S.slip.stake; return 'Giochi <b>' + stakeTxt() + '</b>: se esce tutta incassi ' + eur(v * s.odds) + ' (guadagno ' + eur(v * s.odds - v) + '), se ne sbagli anche una sola perdi ' + stakeTxt() + '. La cifra la decidi tu: metti solo soldi che puoi permetterti di perdere.'; }
  function updStake(v, fromInput) {
    if (!(v >= 1)) return; S.slip.stake = Math.min(10000, Math.round(v * 100) / 100);
    var s = S.slipNow, g = function (id) { return document.getElementById(id); }; if (!s || !g('st-win')) return;
    g('st-win').textContent = eur(S.slip.stake * s.odds); g('st-lab').textContent = stakeLab(); g('st-note').innerHTML = stakeNote(s);
    if (g('st-win2')) g('st-win2').textContent = eur(S.slip.stake * s.odds);
    [].forEach.call(document.querySelectorAll('.st-rc'), function (x) { x.textContent = stakeTxt(); });
    [].forEach.call(document.querySelectorAll('#stq button'), function (b) { b.classList.toggle('on', +b.dataset.stake === S.slip.stake); });
    if (!fromInput && g('stakein')) g('stakein').value = '';
  }
  function skel(n) { var s = ''; for (var i = 0; i < n; i++) s += '<div class="skel"></div>'; return s; }

  /* ---------- partita ---------- */
  function openMatch(lg, id) {
    var tok = ++S.token, find = function () { return (S.up || []).filter(function (m) { return m.id === id; })[0]; };
    S.m = find() || null; S.cd = S.tf = S.pd = S.pf = null; S.perr = S.merr = null; S.prog = null; S.open = null; S.ov = {}; S.more = false; S.tab = 'top';
    render();
    var p = S.m ? Promise.resolve() : Core.loadUpcoming(false).then(function (up) { S.up = up; S.m = find(); });
    p.then(function () {
      if (tok !== S.token) return;
      if (!S.m) throw new Error('Partita non trovata tra quelle in programma.');
      S.pteam = S.m.h;
      return Core.loadComp(lg, false);
    }).then(function (cd) {
      if (tok !== S.token || !cd) return;
      S.cd = cd; S.tf = Core.teamForecast(cd, S.m); render();
      return Core.loadPlayers(cd, S.m, function (a, b) { if (tok === S.token) { S.prog = [a, b]; var el = $('#prog'); if (el) el.style.width = Math.round(100 * a / b) + '%'; } });
    }).then(function (pd) {
      if (tok !== S.token || !pd) return;
      S.pd = pd; recalc(); render();
    }).catch(function (e) {
      if (tok !== S.token) return;
      if (S.tf) S.perr = 'Non riesco a leggere i dati dei giocatori. I pronostici di squadra restano validi.'; else S.merr = (e && e.message && e.message.indexOf('Partita') === 0) ? e.message : 'Non riesco a leggere i dati di questa competizione. Controlla la connessione e riprova.';
      render();
    });
  }
  function recalc() { S.pf = Core.playersForecast(S.pd, S.tf, S.m, S.ov); [S.m.h, S.m.a].forEach(function (t) { S.pf[t].forEach(function (f) { f.team = t; }); }); }

  function why(key, lines) { return S.open === key ? '<div class="why"><b>Perché</b><ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : ''; }
  function findPF(pid) { var r = null; [S.m.h, S.m.a].forEach(function (t) { (S.pf && S.pf[t] || []).forEach(function (f) { if (f.p.id === pid) r = f; }); }); return r; }

  function obOn() { return S.ob && !!Core.bookOf(S.m); }
  function obBar() {
    var b = Core.bookOf(S.m); if (!b) return Core.bookInfo() ? '<div class="note">Per questa partita non ho le quote: vedi tutte le linee del modello.</div>' : '';
    var st = b.mk && (b.mk.sotT || b.mk.shT || b.mk.sot1), pl = b.pl && Object.keys(b.pl.sh || {}).length + Object.keys(b.pl.sot || {}).length;
    return '<div class="wrapc"><button class="chip' + (S.ob ? ' on' : '') + '" data-act="ob" aria-pressed="' + S.ob + '">Solo giocabili</button></div>' +
      (S.ob && (!st || !pl) ? '<div class="note">Non sono ancora uscite ' + (!st && !pl ? 'le quote su tiri e giocatori' : !st ? 'le quote sui tiri di squadra' : 'le quote sui giocatori') + ' per questa partita: di solito arrivano a ridosso. Togli il filtro per vedere le linee del modello.</div>' : '');
  }
  function topHtml() {
    var ob = obOn(), all = Core.picks(S.m, S.tf, S.pf, ob).filter(function (p) { return !S.hi70 || p.p >= 0.7; }), list = all.filter(function (p) { return S.pfil === 'all' || p.kind === S.pfil; });
    var h = obBar() + '<div class="wrapc"><button class="chip' + (S.hi70 ? ' on' : '') + '" data-act="hi70" aria-pressed="' + S.hi70 + '">Solo sopra il 70%</button></div><div class="seg small">' + [['all', 'Tutte'], ['res', 'Esito e gol'], ['team', 'Squadre'], ['player', 'Giocatori']].map(function (x) { return '<button class="' + (S.pfil === x[0] ? 'on' : '') + '" data-pfil="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (!S.pf && !S.perr) h += '<div class="note">Carico i dati dei giocatori… <div class="bar"><i id="prog" style="width:' + (S.prog ? Math.round(100 * S.prog[0] / S.prog[1]) : 3) + '%"></i></div></div>';
    if (S.perr) h += '<div class="note err">' + esc(S.perr) + '</div>';
    var row = function (pre) { return function (p) {
      var key = pre + ':' + p.kind + ':' + p.stat + ':' + (p.side || p.pid || '') + ':' + (p.line != null ? p.line : p.n || '') + (p.dir || ''), sub, lines = [];
      if (p.kind === 'team') { sub = Core.STAT_IT[p.stat]; if (S.open === key) lines = Core.explainTeam(S.cd, S.m, S.tf, p.stat, p.side); }
      else if (p.kind === 'res') { sub = p.cat && p.cat !== 'res' && p.cat !== 'tg' ? Core.CAT_IT[p.cat] : 'Esito e gol'; if (S.open === key) lines = p.cat === 'cx' ? Core.explainTeam(S.cd, S.m, S.tf, 'co', 'H').concat(Core.explainTeam(S.cd, S.m, S.tf, 'co', 'A')) : Core.explainRes(S.cd, S.m, S.tf); }
      else { sub = tn(p.team); if (S.open === key) { var f = findPF(p.pid); lines = f ? Core.explainPlayer(S.m, S.tf, f, p.stat, S.pd.lu[p.team].src) : []; } }
      if (S.open === key) lines = extraWhy(p).concat(lines);
      return '<div class="pick' + (S.open === key ? ' open' : '') + (p.occ ? ' occ' : '') + '"><button class="pick-b" data-exp="' + esc(key) + '" aria-expanded="' + (S.open === key) + '"><span class="pick-l"><b>' + esc(p.label) + '</b><small>' + esc(sub) + (oddsTxt(p) ? ' · ' + esc(oddsTxt(p)) : '') + '</small></span><span class="pp ' + cls(p.p) + '">' + pct(p.p) + '</span></button>' + why(key, lines) + '</div>';
    }; };
    var sec = function (title, arr, pre) { return arr.length ? '<h2 class="day">' + title + '</h2><div class="list">' + arr.map(row(pre)).join('') + '</div>' : ''; };
    var kind = function (k, n) { return all.filter(function (p) { return p.kind === k; }).slice(0, n); };
    if (S.pfil === 'all' && !S.more) {
      var fair = !Core.bookInfo(), hasQ = ob && Core.bookOf(S.m), gc = {}, sure = hasQ || fair ? Core.occasions(S.m, S.tf, S.pf).filter(function (p) { if (S.hi70 && p.p < 0.7) return false; if (!fair) return true; if (p.kind === 'player' && p.dir === 'U') return false; var g = Core.grpOf(p.cat); gc[g] = (gc[g] || 0) + 1; return gc[g] <= 2; }).slice(0, 6) : Core.surePicks(S.m, S.tf, S.pf, ob).slice(0, 6);
      h += sec(PLAY ? 'Le più solide' : fair ? 'Le più solide (quota giusta da 1,40)' : hasQ ? 'Occasioni (quota da 1,40)' : 'Più probabili (85% e oltre)', sure, 's');
      if (sure.length) h += '<p class="foot">' + (PLAY ? 'Le più probabili tra quelle non scontate, al massimo due per tipo di giocata. Nessuna è sicura.' : fair ? 'Le più probabili con quota giusta da 1,40 in su, al massimo due per tipo di giocata. Nessuna è sicura.' : hasQ ? 'Ordinate dalla più conveniente. Il bordo dorato segna quelle che secondo il modello pagano più del rischio. Nessuna è sicura.' : 'Nei test quelle sopra il 90% sono uscite circa 9 volte su 10. Pagano poco e nessuna è sicura.') + '</p>';
      h += sec('Esito e gol', kind('res', 6), 'k') + sec('Squadre', kind('team', 6), 'k') + sec('Giocatori', kind('player', 8), 'k') + extraHtml();
      if (list.length) h += '<button class="btn wide" data-act="more">Mostra tutte (' + list.length + ')</button>';
      else if (!sure.length) h += '<div class="note">Nessuna giocata sopra il 60% per questa partita.</div>';
    } else {
      if (!list.length) return h + '<div class="note">Nessuna giocata adatta per questo filtro.</div>';
      var show = S.more ? list : list.slice(0, 14);
      h += '<div class="list">' + show.map(row('k')).join('') + '</div>';
      if (list.length > show.length) h += '<button class="btn wide" data-act="more">Mostra tutte (' + list.length + ')</button>';
    }
    return h + '<p class="foot">' + (PLAY ? 'Tocca una giocata per leggere perché.' : (ob ? 'Solo giocate con quota. La percentuale è una media tra il modello e le quote. ' : '') + 'La quota giusta è 1 diviso la probabilità: la giocata conviene solo se il bookmaker paga di più.') + '</p>';
  }

  function resCard(of) {
    var r = S.tf.res; if (!r) return '';
    var key = 't:res', opts = Core.resOptions(S.m, S.tf), byK = {}; (of || []).forEach(function (o) { if (o.kind === 'res') byK[o.stat] = o; });
    var P = function (k, pm) { return byK[k] ? byK[k].p : pm; }, chip = function (lab, k, pm) { var o = byK[k], p = P(k, pm); return '<span class="ln ' + cls(p) + (o && o.p * o.odds >= 1 ? ' val' : '') + '"><small>' + lab + '</small><b>' + pct(p) + '</b>' + (o ? '<small class="od">' + q2(o.odds) + '</small>' : '') + '</span>'; };
    var h = '<section class="card"><h3>' + ic('res') + 'Risultato e gol</h3><div class="trow"><button class="trow-h" data-exp="' + key + '" aria-expanded="' + (S.open === key) + '"><span>' + esc(tn(S.m.h)) + ' - ' + esc(tn(S.m.a)) + '</span><span class="exp">gol attesi <b>' + f1(r.lh) + ' - ' + f1(r.la) + '</b></span></button>' +
      '<div class="lines">' + chip('1', '1', r.h) + chip('X', 'X', r.d) + chip('2', '2', r.a) + chip('1X', '1X', r.h + r.d) + chip('12', '12', r.h + r.a) + chip('X2', 'X2', r.a + r.d) + '</div>' +
      '<div class="lines" style="margin-top:6px">' + chip('goal', 'GG', r.gg) + chip('no goal', 'NG', 1 - r.gg) + [0, 1, 2, 3].map(function (k) { return chip('over ' + ln(k + 0.5), 'O' + k, r.over[k]); }).join('') + '</div>';
    if (S.open === key) h += '<div class="why"><b>Perché</b><ul>' + Core.explainRes(S.cd, S.m, S.tf).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + (of ? '<li>Con le quote la percentuale è una media tra modello e quote.</li>' : '') + '</ul><table class="qt"><tr><th>Giocata</th><th>Prob.</th><th class="qm">minima</th>' + (of ? '<th>Quota</th>' : '') + '</tr>' +
      opts.map(function (o) { var b = byK[o.key], p = b ? b.p : o.p; return (of && !b) ? '' : '<tr><td>' + esc(o.label) + '</td><td>' + pct(p) + '</td><td class="qm">' + quota(p) + '</td>' + (of ? '<td>' + q2(b.odds) + '</td>' : '') + '</tr>'; }).join('') + '</table></div>';
    return h + '</div></section>';
  }
  var UO_OK = { fo: 1, yc: 1 };   // under mostrati solo per falli e cartellini
  function teamsHtml() {
    var ob = obOn(), of = ob ? Core.offers(S.m, S.tf, S.pf) : null, h = obBar() + resCard(of), missing = [];
    if (!Core.shotsOk(S.m.lg)) h += '<div class="note">In questo campionato tiri e tiri in porta non si possono giocare: li ho tolti. Restano risultato, gol, corner, falli e cartellini.</div>';
    Model.STATS.forEach(function (s) {
      if (!Core.statOk(S.m.lg, s)) return;
      var st = S.tf.stats[s], body = '';
      [['H', tn(S.m.h)], ['A', tn(S.m.a)], ['T', 'Totale partita']].forEach(function (x) {
        var r = st[x[0]], key = 't:' + s + ':' + x[0], lines;
        if (ob) {
          lines = of.filter(function (o) { return o.kind === 'team' && o.stat === s && o.side === x[0] && o.dir === 'O' && o.p > 0.06 && o.p < 0.975; }).sort(function (a, b) { return a.line - b.line; }).map(function (o) { return { line: o.line, over: o.p, under: 1 - o.p, odds: o.odds, val: o.p * o.odds >= 1 }; });
          if (!lines.length) return;
        } else lines = r.lines;
        body += '<div class="trow"><button class="trow-h" data-exp="' + key + '" aria-expanded="' + (S.open === key) + '"><span>' + esc(x[1]) + '</span><span class="exp">attesi <b>' + f1(r.mean) + '</b></span></button>' +
          '<div class="lines">' + lines.map(function (l) { return '<span class="ln ' + cls(l.over) + (l.val ? ' val' : '') + '"><small>over ' + ln(l.line) + '</small><b>' + pct(l.over) + '</b>' + (l.odds ? '<small class="od">' + q2(l.odds) + '</small>' : '') + '</span>'; }).join('') + '</div>';
        if (S.open === key) body += '<div class="why"><b>Perché</b><ul>' + Core.explainTeam(S.cd, S.m, S.tf, s, x[0]).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + (ob ? '<li>La percentuale è una media tra il modello e le quote.</li>' : '') + '</ul><table class="qt"><tr><th>Linea</th><th>Over</th><th class="qm">minima</th>' + (ob ? '<th>Quota</th>' : UO_OK[s] ? '<th>Under</th><th class="qm">minima</th>' : '') + '</tr>' +
          lines.map(function (l) { return '<tr><td>' + ln(l.line) + '</td><td>' + pct(l.over) + '</td><td class="qm">' + quota(l.over) + '</td>' + (ob ? '<td>' + q2(l.odds) + '</td>' : UO_OK[s] ? '<td>' + pct(l.under) + '</td><td class="qm">' + quota(l.under) + '</td>' : '') + '</tr>'; }).join('') + '</table></div>';
        body += '</div>';
      });
      if (body) h += '<section class="card"><h3>' + ic(s) + esc(Core.STAT_IT[s]) + '</h3>' + body + '</section>'; else missing.push(Core.STAT_IT[s].toLowerCase());
    });
    if (ob && missing.length) h += '<div class="note">' + 'Al momento non ci sono quote per: ' + esc(missing.join(', ')) + '. Togli il filtro per vedere le stime del modello.</div>';
    return h + '<p class="foot">Tocca una riga per la spiegazione.' + (ob ? ' Sotto ogni percentuale c\'è la quota; il bordo giallo segna quelle che pagano più della quota minima.' : '') + '</p>';
  }

  function playersHtml() {
    if (S.perr) return '<div class="note err">' + esc(S.perr) + '</div>';
    if (!S.pf) return '<div class="note">Carico i dati dei giocatori dalle ultime partite… <div class="bar"><i id="prog" style="width:' + (S.prog ? Math.round(100 * S.prog[0] / S.prog[1]) : 3) + '%"></i></div></div>' + skel(6);
    var PS = Core.PST.filter(function (x) { return Core.statOk(S.m.lg, x); }).concat(['yc', 'gl']), EXT = S.pst === 'yc' || S.pst === 'gl';
    if (PS.indexOf(S.pst) < 0) S.pst = PS[0];
    var t = S.pteam, lu = S.pd.lu[t], k = S.pst, ob = obOn() && !EXT, byP = {};
    if (ob) Core.offers(S.m, S.tf, S.pf).forEach(function (o) { if (o.kind === 'player' && o.stat === k && o.dir === 'O') (byP[o.pid] || (byP[o.pid] = {}))[o.n] = o; });
    var h = obBar() + '<div class="seg">' + [S.m.h, S.m.a].map(function (id) { return '<button class="' + (t === id ? 'on' : '') + '" data-pteam="' + id + '">' + esc(T[id] ? T[id].s : id) + '</button>'; }).join('') + '</div>' +
      '<div class="seg small">' + PS.map(function (x) { return '<button class="' + (k === x ? 'on' : '') + '" data-pst="' + x + '">' + PSHORT[x] + '</button>'; }).join('') + '</div>' + (PS.length < Core.PST.length ? '<div class="note">In questo campionato tiri e tiri in porta dei giocatori non si possono giocare: restano i falli.</div>' : '') +
      '<div class="note ' + (lu.src === 'ufficiale' ? 'good' : '') + '">Formazione <b>' + lu.src + '</b>' + (lu.src === 'ufficiale' ? '.' : ': stimata dalle ultime partite. Le percentuali tengono già conto che un titolare probabile non sempre parte dal primo minuto.' + (SNAP ? '' : ' Quella ufficiale arriva circa un\'ora prima del calcio d\'inizio.')) + ' Tocca lo stato di un giocatore per confermarlo titolare, metterlo in panchina o assente.' + (ob && Core.DUO[k] ? ' In questa giocata contano anche i tiri di chi sostituisce il giocatore.' : '') + '</div>';
    var list = S.pf[t].slice().sort(function (a, b) { var o = { tit: 0, pan: 1, out: 2 }; return o[a.status] - o[b.status] || b.st[k].mean - a.st[k].mean; });
    var shown = list.filter(function (f) { return f.status !== 'out' || S.ov[f.p.id]; }), hidden = list.length - shown.length;
    if (S.more) shown = list;
    var cell = function (f, n) {
      if (f.status === 'out') return '<span class="pc">-</span>';
      if (ob) { var o = byP[f.p.id] && byP[f.p.id][n]; return o ? '<span class="pc ' + cls(o.p) + (o.p * o.odds >= 1 ? ' val' : '') + '">' + pct(o.p) + '<small class="od">' + q2(o.odds) + '</small></span>' : '<span class="pc">–</span>'; }
      if (k === 'yc' && n > 1) return '<span class="pc">–</span>';
      var p = f.st[k]['p' + n]; return '<span class="pc ' + cls(p) + '">' + pct(p) + '</span>';
    };
    h += '<div class="plist"><div class="phead"><span>Giocatore</span><span>1+</span><span>2+</span><span>3+</span></div>' + shown.map(function (f) {
      var s = f.st[k], key = 'p:' + f.p.id + ':' + k, off = f.status === 'out', o1 = ob && byP[f.p.id] && (byP[f.p.id][1] || byP[f.p.id][2] || byP[f.p.id][3]);
      return '<div class="pl ' + f.status + '"><div class="pl-r"><button class="pl-n" data-exp="' + key + '" aria-expanded="' + (S.open === key) + '"><b>' + esc(f.p.name) + '</b><small>' + (ROLE[f.p.pos] || '') + (off ? '' : ' · ' + Math.round(f.expMin) + "' attesi · " + f1(s.mean) + ' attesi') + '</small></button>' + cell(f, 1) + cell(f, 2) + cell(f, 3) + '</div>' +
        '<button class="stt ' + f.status + (f.status === 'tit' && !f.sure ? ' prob' : '') + '" data-cyc="' + esc(f.p.id) + '" aria-label="Cambia stato di ' + esc(f.p.name) + '">' + (f.status === 'tit' && !f.sure ? 'Titolare probabile' : STT[f.status]) + '</button>' +
        (S.open === key && !off ? why(key, EXT ? Core.explainExtra(S.m, S.tf, f, k) : (o1 ? extraWhy(o1) : []).concat(Core.explainPlayer(S.m, S.tf, f, k, lu.src))) : '') + '</div>';
    }).join('') + '</div>';
    if (hidden > 0 && !S.more) h += '<button class="btn wide" data-act="more">Mostra anche gli altri ' + hidden + ' in rosa</button>';
    return h + '<p class="foot">Percentuali per ' + Core.PST_IT[k] + ' del singolo giocatore in questa partita' + (ob ? ', con la quota sotto. Il trattino indica una giocata senza quota' : '') + '. Basate sulle ultime ' + S.pd.loaded + ' partite delle due squadre.</p>';
  }

  function matchHtml() {
    var m = S.m, h = '<button class="back" data-nav="">' + ic('back') + 'Partite</button>';
    if (S.merr) return h + '<div class="note err">' + esc(S.merr) + ' <button class="btn" data-act="retry">Riprova</button></div>';
    if (!m) return h + '<div class="note">Carico la partita…</div>' + skel(4);
    var c = Core.comp(m.lg);
    if (m.d > Date.now() && m.d - Date.now() < 7 * 864e5) h += '<div class="kob">' + ic('clock') + '<span>Calcio d\'inizio tra <b data-ko="' + m.d + '">' + koTxt(m.d - Date.now()) + '</b></span></div>';
    h += '<div class="favs">' + [m.h, m.a].map(function (t) { return '<button class="chip' + (FAV[t] ? ' on' : '') + '" data-act="fav" data-team="' + esc(t) + '" aria-pressed="' + !!FAV[t] + '">' + ic('heart') + (FAV[t] ? 'Segui già ' : 'Segui ') + esc(tn(t)) + '</button>'; }).join('') + '</div>';
    h += '<header class="mh"><div class="mh-t">' + logo(m.h) + '<b>' + esc(tn(m.h)) + '</b></div><div class="mh-c"><i class="vs">VS</i><span>' + esc(dayLabel(m.d)) + ' · ' + hm(m.d) + '</span><span>' + esc(c ? c.name : '') + '</span></div><div class="mh-t">' + logo(m.a) + '<b>' + esc(tn(m.a)) + '</b></div></header>';
    if (!S.tf) return h + '<div class="note">Analizzo lo storico della competizione…</div>' + skel(5);
    if (c && c.nat) h += '<div class="note">Nazionali: poche partite all\'anno, quindi stime più incerte rispetto ai campionati.</div>';
    h += bar1x2() + '<h2 class="sec-h">' + ic('trend') + 'Analisi di OverLab</h2>' + heroHtml() + pitchHtml();
    h += '<nav class="tabs">' + [['top', 'Pronostici'], ['an', 'Analisi'], ['teams', 'Squadre'], ['players', 'Giocatori']].map(function (x) { return '<button class="' + (S.tab === x[0] ? 'on' : '') + '" data-tab="' + x[0] + '"><span>' + x[1] + '</span></button>'; }).join('') + '</nav>';
    h += S.tab === 'top' ? topHtml() : S.tab === 'an' ? anHtml() : S.tab === 'teams' ? teamsHtml() : playersHtml();
    return h;
  }

  // barra 1X2: casa, pareggio e trasferta in un'unica striscia
  function bar1x2() {
    var r = S.tf && S.tf.res; if (!r) return '';
    return '<div class="x12" role="img" aria-label="Probabilità: 1 ' + pct(r.h) + ', X ' + pct(r.d) + ', 2 ' + pct(r.a) + '"><div class="x12-b"><i class="h" style="flex:' + r.h.toFixed(3) + '"></i><i class="d" style="flex:' + r.d.toFixed(3) + '"></i><i class="a" style="flex:' + r.a.toFixed(3) + '"></i></div>' +
      '<div class="x12-l"><span class="h"><b>1</b> ' + esc(T[S.m.h] ? T[S.m.h].s : '') + ' <em>' + pct(r.h) + '</em></span><span class="d"><b>X</b> <em>' + pct(r.d) + '</em></span><span class="a"><b>2</b> ' + esc(T[S.m.a] ? T[S.m.a].s : '') + ' <em>' + pct(r.a) + '</em></span></div></div>';
  }
  // multigol, risultato esatto, combo, corner 1X2 e handicap, primo tempo
  function extraHtml() {
    var X; try { X = Core.extraMarkets(S.m, S.tf); } catch (e) { return ''; } if (!X.exact.length) return '';
    var qs = function (x) { return PLAY ? '' : '<small>' + x + '</small>'; };
    var row = function (o) { return '<div class="xr"><span>' + esc(o.label) + '</span><b class="' + cls(o.p) + 't">' + pct(o.p) + '</b>' + qs(quota(o.p)) + '</div>'; };
    var card = function (title, icon, body, note) { return '<section class="card xm"><h3>' + ic(icon) + esc(title) + '</h3>' + body + (note ? '<p class="foot">' + note + '</p>' : '') + '</section>'; };
    var hd = '<div class="xr xh"><span></span><b>Stima</b>' + qs('Quota giusta') + '</div>';
    var h = card('Risultato esatto', 'target', '<div class="exg">' + X.exact.map(function (o) { return '<div class="ex"><b>' + o.sc + '</b><span>' + pct(o.p) + '</span>' + qs(quota(o.p)) + '</div>'; }).join('') + '</div>', 'I sei punteggi più probabili.');
    var r = S.tf.res, hn = tn(S.m.h), an = tn(S.m.a), cupM = !!(Core.comp(S.m.lg) || {}).cup;
    if (r && r.ho) h += card('Goal / No goal', 'res', hd + [{ label: 'Goal: segnano entrambe', p: r.gg }, { label: 'No goal: almeno una non segna', p: 1 - r.gg }, { label: 'Segna ' + hn, p: r.ho[0] }, { label: 'Segna ' + an, p: r.ao[0] }, { label: 'Non segna ' + hn, p: 1 - r.ho[0] }, { label: 'Non segna ' + an, p: 1 - r.ao[0] }].map(row).join(''), 'Goal vuol dire che segnano tutte e due le squadre. ' + (cupM ? 'Nelle coppe provato su 1.494 partite: è la giocata più incerta.' : 'Verificato su 26.396 partite.'));
    h += card('Multigol', 'res', hd + X.mg.map(row).join('') + '<h4 class="xs">Multigol squadra</h4>' + X.mgT.map(row).join(''));
    h += card('Combo', 'spark', hd + X.combo.slice().sort(function (a, b) { return b.p - a.p; }).slice(0, 10).map(row).join(''), 'Le dieci combo più probabili tra esito o doppia chance e over, calcolate sui punteggi. Verificate su ' + (cupM ? '1.494 partite di coppa e ' : '') + '26.396 partite. Le combo con goal/no goal non le metto: nel test non reggevano.');
    if (X.cx.length) h += card('Corner 1X2 e handicap', 'co', hd + X.cx.map(row).join(''));
    h += card('Primo tempo', 'clock', hd + X.ht.map(row).join(''), 'Stima approssimata: nei dati non ci sono i gol divisi per tempo, quindi conto il 45% dei gol attesi nel primo tempo, come in media nei campionati.');
    return h;
  }
  // conto alla rovescia (si aggiorna ogni secondo)
  function koTxt(ms) { if (ms <= 0) return 'iniziata'; var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), p2 = function (x) { return (x < 10 ? '0' : '') + x; }; s -= d * 86400; return (d ? d + 'g ' : '') + p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s % 3600 / 60)) + ':' + p2(s % 60); }
  setInterval(function () { [].forEach.call(document.querySelectorAll('[data-ko]'), function (el) { el.textContent = koTxt(+el.getAttribute('data-ko') - Date.now()); }); }, 1000);
  function shortN(n) { var t = String(n || '').trim().split(/\s+/); return t.length < 2 ? t[0] || '' : t.length > 2 && t[t.length - 2].length <= 3 ? t.slice(-2).join(' ') : t[t.length - 1]; }
  function initN(n) { var t = String(n || '').trim().split(/\s+/); return t.length < 2 ? t[0] || '' : t[0].charAt(0) + '. ' + t.slice(1).join(' '); }
  /* campo con le formazioni: casa in alto, trasferta in basso. Sui giocatori: chi rischia di più il giallo, il marcatore più probabile
     e chi tira di più in porta (quest'ultimo solo dove i tiri si giocano) */
  function pitchHtml() {
    var m = S.m, head = function (src) { return '<div class="lu-h"><div class="lu-t home"><b><i></i>' + esc(tn(m.h)) + '</b><small>' + (src ? form(m.h) : '') + '</small></div><div class="lu-t away"><b>' + esc(tn(m.a)) + '<i></i></b><small>' + (src ? form(m.a) : '') + '</small></div></div>' + (src ? '<div class="lu-srcw"><span class="lu-src' + (src === 'ufficiale' ? ' off' : '') + '">' + (src === 'ufficiale' ? 'Ufficiali' : 'Probabili') + '</span></div>' : ''); };
    var form = function (t) { var r = xiRows(t); return [r.D.length, r.M.length, r.F.length].filter(function (x) { return x; }).join('-'); };
    if (S.perr) return '';
    if (!S.pf || !S.pd) return '<section class="lu"><div class="lu-h"><div class="lu-t home"><b><i></i>' + esc(tn(m.h)) + '</b></div><div class="lu-t away"><b>' + esc(tn(m.a)) + '<i></i></b></div></div><div class="note">Carico le formazioni… <div class="bar"><i id="prog" style="width:' + (S.prog ? Math.round(100 * S.prog[0] / S.prog[1]) : 3) + '%"></i></div></div></section>';
    var sot = Core.shotsOk(m.lg), rev = !!S.rev[m.id], mark = rev ? standouts(m).mark : {};
    var Y = { H: { G: 7, D: 18, M: 29, M2: 37, F: 40.5 }, A: { G: 93, D: 82, M: 71, M2: 63, F: 59.5 } }, nodes = '';
    [[m.h, 'H'], [m.a, 'A']].forEach(function (x) {
      var t = x[0], side = x[1], rows = xiRows(t);
      ['G', 'D', 'M', 'F'].forEach(function (k) { rows[k].sort(function (a, b) { return (+a.p.jersey || 99) - (+b.p.jersey || 99); }); });
      var lines = [['G', rows.G], ['D', rows.D]];
      if (rows.M.length >= 6) { var h1 = Math.ceil(rows.M.length / 2); lines.push(['M', rows.M.slice(0, h1)], ['M2', rows.M.slice(h1)]); } else lines.push(['M', rows.M]);
      lines.push(['F', rows.F]);
      var yy = Y[side]; if (rows.M.length >= 6) yy = side === 'H' ? { G: 7, D: 16.5, M: 26, M2: 35, F: 43.5 } : { G: 93, D: 83.5, M: 74, M2: 65, F: 56.5 };
      lines.forEach(function (L) {
        var n = L[1].length; L[1].forEach(function (f, i) {
          var mk = mark[f.p.id] || {}, xp = (i + 1) / (n + 1) * 100;
          nodes += '<button class="pn ' + (side === 'H' ? 'home' : 'away') + '" style="left:' + xp.toFixed(1) + '%;top:' + yy[L[0]] + '%" data-ptap="' + esc(f.p.id) + '" data-pt="' + esc(t) + '" aria-label="' + esc(f.p.name) + '"><i>' + esc(f.p.jersey || '') +
            (mk.yc || mk.fc || mk.fs ? '<span class="pbl">' + (mk.yc ? '<em class="ycard"></em>' : '') + (mk.fc ? '<em class="foul"></em>' : '') + (mk.fs ? '<em class="fouled"></em>' : '') + '</span>' : '') + (mk.gl || mk.sot || mk.sh ? '<span class="pbr">' + (mk.gl ? '<em class="ball"></em>' : '') + (mk.sot ? '<em class="tgt"></em>' : '') + (mk.sh ? '<em class="shot"></em>' : '') + '</span>' : '') + '</i><b>' + esc(shortN(f.p.name)) + '</b></button>';
        });
      });
    });
    var src = S.pd.lu[m.h].src === 'ufficiale' && S.pd.lu[m.a].src === 'ufficiale' ? 'ufficiale' : 'probabile';
    var h = '<section class="lu">' + head(src) + '<div class="simbar" id="simbar" hidden></div><div class="pitch"><div class="pl-lines"><i class="pc1"></i><i class="pc2"></i><i class="bx t"></i><i class="bx b"></i><i class="sb t"></i><i class="sb b"></i></div>' + nodes + '</div>';
    var se = S.simEnd && S.simEnd.id === m.id ? S.simEnd : null;
    h += '<div class="simz">' + (se ? simSummary(se) : '') + '<button class="btn wide pri simbtn" data-act="sim"' + (S.simOn ? ' disabled' : '') + '><em class="ball"></em>' + (S.simOn ? 'Partita in corso…' : se ? 'Rigioca la partita' : 'Scopri chi segnerà, chi riceverà il cartellino e chi farà fallo') + '</button>' +
      (!rev || S.simOn ? '<button class="btn wide simskip" data-act="simskip">' + ic('bolt') + (S.simOn ? 'Salta e scopri tutto' : 'Scopri tutto subito') + '</button>' : '') + '</div>';
    h += rev ? '<p class="lu-leg"><span><em class="ycard"></em>rischia il giallo</span><span><em class="ball"></em>probabile marcatore</span>' + (sot ? '<span><em class="tgt"></em>più tiri in porta</span><span><em class="shot"></em>più tiri</span>' : '') + '<span><em class="foul"></em>più falli fatti</span><span><em class="fouled"></em>più falli subiti</span></p>'
      : '<p class="lu-lock">Marcatori, cartellini, ' + (sot ? 'tiri in porta, tiri, ' : '') + 'falli fatti e subiti sono da scoprire: gioca la partita o scoprili subito.</p>';
    return h + (rev ? topPickHtml(sot) : '<div class="tp locked"><span class="tp-pill">' + ic('star') + 'Top pick della partita</span><p class="tp-w">Si sblocca a fine partita.</p></div>') + '</section>';
  }
  /* titolari per reparto. Nei dati i ruoli sono solo portiere, difensore, centrocampista e attaccante, e gli esterni a tutta fascia
     o certe punte finiscono a centrocampo: si rimette ordine perché i difensori siano da 3 a 5 e gli attaccanti da 1 a 3 */
  function xiRows(t) {
    var rows = { G: [], D: [], M: [], F: [] };
    (S.pf[t] || []).forEach(function (f) { if (f.status === 'tit') (rows[f.p.pos] || rows.M).push(f); });
    var sh = function (k, f) { var n = f.p.posN || {}, tot = 0; for (var z in n) tot += n[z]; return tot ? (n[k] || 0) / tot : 0; };
    var tiri = function (f) { return f.st.sh ? f.st.sh.per90 : 0; };
    var move = function (from, to, score) { var b = null; rows[from].forEach(function (f) { if (!b || score(f) > score(b)) b = f; }); if (!b) return false; rows[from].splice(rows[from].indexOf(b), 1); rows[to].push(b); return true; };
    while (rows.D.length < 3 && rows.M.length > 3) move('M', 'D', function (f) { return sh('D', f) * 10 - tiri(f); });
    while (rows.D.length > 5) move('D', 'M', function (f) { return sh('M', f) * 10 + tiri(f); });
    while (rows.F.length < 1 && rows.M.length > 3) move('M', 'F', function (f) { return sh('F', f) * 10 + tiri(f); });
    while (rows.F.length > 3) move('F', 'M', function (f) { return sh('M', f) * 10 - tiri(f); });
    return rows;
  }
  /* chi spicca in ogni squadra: giallo, gol, falli fatti e subiti, e tiri dove si giocano */
  function standouts(m) {
    var sot = Core.shotsOk(m.lg), best = function (t, k) { var b = null, v = function (f) { return k === 'yc' || k === 'gl' ? f.st[k].p1 : f.st[k].mean; }; (S.pf[t] || []).forEach(function (f) { if (f.status === 'tit' && f.p.pos !== 'G' && (!b || v(f) > v(b))) b = f; }); return b; };
    var mark = {}, who = {}, put = function (t, f, k) { if (!f) return; (mark[f.p.id] = mark[f.p.id] || {})[k] = 1; (who[t] = who[t] || {})[k] = f; };
    [m.h, m.a].forEach(function (t) { var a = best(t, 'yc'); if (a && a.st.yc.p1 >= 0.12) put(t, a, 'yc'); put(t, best(t, 'gl'), 'gl'); put(t, best(t, 'fc'), 'fc'); put(t, best(t, 'fs'), 'fs'); if (sot) { put(t, best(t, 'sot'), 'sot'); put(t, best(t, 'sh'), 'sh'); } });
    return { mark: mark, who: who };
  }
  /* Simulazione: una partita animata costruita sul pronostico. Finisce con l'esito più probabile, con un punteggio estratto secondo le probabilità del modello, e segnano
     i marcatori più probabili; durante la partita si scoprono anche chi rischia il giallo, chi tira e chi fa e subisce più falli.
     È un modo di vedere la stima, non una certezza. */
  function simPlan(m) {
    var top = Core.simScore(S.tf, m) || { sc: '0-0', p: 0 }, sc = top.sc.split('-').map(Number);
    var seed = 0; String(m.id).split('').forEach(function (c) { seed = (seed * 31 + c.charCodeAt(0)) >>> 0; }); seed = (seed + 7919 * (S.simN = (S.simN || 0) + 1)) >>> 0;   // ogni replay cambia passaggi e minuti, non risultato e protagonisti
    var rnd = function () { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    var rank = function (t) { return (S.pf[t] || []).filter(function (f) { return f.status === 'tit' && f.p.pos !== 'G'; }).sort(function (a, b) { return b.st.gl.p1 - a.st.gl.p1; }); };
    var so = standouts(m), W = so.who, ev = [], hs = rank(m.h), as = rank(m.a), i, side = function (t) { return t === m.h ? 'H' : 'A'; }, other = function (t) { return t === m.h ? m.a : m.h; };
    for (i = 0; i < sc[0]; i++) if (hs.length) ev.push({ k: 'gol', t: m.h, side: 'H', f: hs[i % Math.min(2, hs.length)], rv: [[hs[i % Math.min(2, hs.length)], 'gl']] });
    for (i = 0; i < sc[1]; i++) if (as.length) ev.push({ k: 'gol', t: m.a, side: 'A', f: as[i % Math.min(2, as.length)], rv: [[as[i % Math.min(2, as.length)], 'gl']] });
    [m.h, m.a].forEach(function (t) {
      var w = W[t] || {}, o = W[other(t)] || {};
      if (w.yc) ev.push({ k: 'giallo', t: t, side: side(t), f: w.yc, rv: [[w.yc, 'yc']] });
      if (w.sot) ev.push({ k: 'tiro', t: t, side: side(t), f: w.sot, rv: [[w.sot, 'sot']] });
      if (w.sh) ev.push({ k: 'tirot', t: t, side: side(t), f: w.sh, rv: [[w.sh, 'sh']] });
      if (w.fc) ev.push({ k: 'fallo', t: t, side: side(t), f: w.fc, f2: o.fs || null, rv: [[w.fc, 'fc']].concat(o.fs ? [[o.fs, 'fs']] : []) });
    });
    var used = {}; ev.forEach(function (e) { var mi; do { mi = 4 + Math.floor(rnd() * 86); } while (used[mi] || used[mi - 1] || used[mi + 1]); used[mi] = 1; e.min = mi; });
    ev.sort(function (a, b) { return a.min - b.min; });
    return { id: m.id, sc: sc, p: top.p, ev: ev, rnd: rnd, best: hs.concat(as).sort(function (a, b) { return b.st.gl.p1 - a.st.gl.p1; })[0] };
  }
  var EV = { gol: ['ball', 'Gol'], giallo: ['ycard', 'Ammonito'], tiro: ['tgt', 'Tiro in porta'], tirot: ['shot', 'Tiro'], fallo: ['foul', 'Fallo'] };
  function simSummary(se) {
    var m = S.m, nm = function (t) { return T[t] ? T[t].s : tn(t); }, f2 = function (x) { return (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); };
    var val = function (e) { return e.k === 'gol' ? pct(e.f.st.gl.p1) : e.k === 'giallo' ? pct(e.f.st.yc.p1) : e.k === 'tiro' ? pct(e.f.st.sot.p1) : e.k === 'tirot' ? f2(e.f.st.sh.mean) + ' attesi' : f2(e.f.st.fc.mean) + ' attesi'; };
    var rows = se.ev.map(function (e) { return '<div class="sim-e"><span class="sim-m">' + e.min + '\'</span><em class="' + EV[e.k][0] + '"></em><b>' + esc(initN(e.f.p.name)) + (e.k === 'fallo' && e.f2 ? ' <small>su ' + esc(initN(e.f2.p.name)) + '</small>' : '') + '</b><small class="' + (e.side === 'H' ? 'home' : 'away') + '">' + EV[e.k][1] + '</small><span class="sim-p">' + val(e) + '</span></div>'; }).join('');
    return '<div class="sim-end"><small>Finale simulato</small><div class="sim-sc"><span class="home">' + esc(nm(m.h)) + '</span><b>' + se.sc[0] + ' - ' + se.sc[1] + '</b><span class="away">' + esc(nm(m.a)) + '</span></div>' + rows +
      (se.sc[0] + se.sc[1] === 0 && se.best ? '<p class="tp-w">Nessun gol nel risultato simulato. Il marcatore più probabile resta ' + esc(initN(se.best.p.name)) + ' (' + pct(se.best.st.gl.p1) + ').</p>' : '') +
      '<p class="foot">Partita simulata sul pronostico: finisce con l\'esito più probabile secondo il modello; il punteggio è estratto tra quelli di quell\'esito con le loro probabilità, quindi cambia da partita a partita (questo: ' + pct(se.p) + '). I protagonisti sono i giocatori che spiccano nelle stime; accanto a ogni nome la sua probabilità o quanto ne fa in media. È un modo di vedere la stima, non una certezza.</p></div>';
  }
  function simReveal(plan) { S.simOn = false; S.simSkip = false; S.rev[plan.id] = true; S.simEnd = { id: plan.id, sc: plan.sc, p: plan.p, ev: plan.ev, best: plan.best }; rerender(); var z = document.querySelector('.sim-end'); if (z) z.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function simSkip() { if (S.simOn) { S.simSkip = true; return; } if (!S.pf || !S.m) return; simReveal(simPlan(S.m)); }
  function runSim() {
    var m = S.m, pitch = document.querySelector('.pitch'), bar = document.getElementById('simbar'); if (!pitch || !S.pf || S.simOn) return;
    var plan = simPlan(m), rnd = plan.rnd, nm = function (t) { return T[t] ? T[t].s : tn(t); }, score = [0, 0], minute = 0, poss = 'H', holder = null;
    S.simOn = true; S.simSkip = false; S.simEnd = null;
    var btn = document.querySelector('.simbtn'); if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Partita in corso…'; }
    var sk = document.querySelector('.simskip'); if (sk) sk.lastChild.textContent = 'Salta e scopri tutto'; else { var z0 = document.querySelector('.simz'); if (z0) z0.insertAdjacentHTML('beforeend', '<button class="btn wide simskip" data-act="simskip">' + ic('bolt') + 'Salta e scopri tutto</button>'); }
    var old = document.querySelector('.sim-end'); if (old) old.remove();
    [].forEach.call(pitch.querySelectorAll('.pbl,.pbr'), function (x) { x.remove(); });   // si riparte da zero
    var ball = document.createElement('i'); ball.className = 'sball'; pitch.appendChild(ball);
    var fx = document.createElement('div'); fx.className = 'simfx'; pitch.appendChild(fx);
    var nodes = {}; [].forEach.call(pitch.querySelectorAll('.pn'), function (n) { var sd = n.getAttribute('data-pt') === m.h ? 'H' : 'A'; (nodes[sd] = nodes[sd] || []).push(n); });
    var byId = function (id) { return pitch.querySelector('.pn[data-ptap="' + id + '"]'); };
    var CLS = { yc: 'ycard', fc: 'foul', fs: 'fouled', gl: 'ball', sot: 'tgt', sh: 'shot' };
    var badge = function (f, k) { var n = byId(f.p.id); if (!n) return; var ii = n.querySelector('i'), left = k === 'yc' || k === 'fc' || k === 'fs', box = ii.querySelector(left ? '.pbl' : '.pbr');
      if (!box) { box = document.createElement('span'); box.className = left ? 'pbl' : 'pbr'; ii.appendChild(box); } if (box.querySelector('.' + CLS[k])) return; var em = document.createElement('em'); em.className = CLS[k] + ' pop'; box.appendChild(em); };
    var draw = function () { bar.hidden = false; bar.innerHTML = '<span class="home">' + esc(nm(m.h)) + '</span><b>' + score[0] + ' - ' + score[1] + '</b><span class="away">' + esc(nm(m.a)) + '</span><i>' + Math.min(90, Math.round(minute)) + '\'</i>'; };
    var place = function (n) { if (holder) holder.classList.remove('hasball'); holder = n; if (n) { n.classList.add('hasball'); ball.style.left = n.style.left; ball.style.top = n.style.top; } };
    var alive = function () { return document.body.contains(pitch); };
    var flash = function (html, cls) { fx.className = 'simfx on ' + (cls || ''); fx.innerHTML = html; };
    var unflash = function () { fx.className = 'simfx'; };
    var stop = function () { S.simOn = false; if (holder) holder.classList.remove('hasball'); };
    var go = function (fn, ms) { setTimeout(function () { if (!alive()) return stop(); if (S.simSkip) return simReveal(plan); fn(); }, ms); };
    var ei = 0, STEP = 560, PER = 90 / 30;   // circa 30 passaggi per 90 minuti
    ball.style.left = '50%'; ball.style.top = '50%'; draw();
    var tick = function () {
      var e = plan.ev[ei];
      if (e && minute >= e.min) {
        ei++; minute = e.min; draw();
        var n = byId(e.f.p.id), goalY = e.side === 'H' ? '96.5%' : '3.5%', who = esc(initN(e.f.p.name)) + ' ' + e.min + '\'';
        poss = e.side; place(n);
        if (e.k === 'gol' || e.k === 'tiro' || e.k === 'tirot') {
          go(function () {
            if (holder) holder.classList.remove('hasball');
            ball.style.left = e.k === 'tirot' ? (rnd() < 0.5 ? '30%' : '70%') : '50%'; ball.style.top = e.k === 'tiro' ? (e.side === 'H' ? '91%' : '9%') : goalY;
            go(function () {
              if (e.k === 'gol') { score[e.side === 'H' ? 0 : 1]++; draw(); flash('<b>GOL!</b><span>' + who + '</span><small>' + esc(nm(e.t)) + ' ' + score[0] + '-' + score[1] + '</small>', e.side === 'H' ? 'home' : 'away'); }
              else flash('<em class="' + (e.k === 'tiro' ? 'tgt' : 'shot') + ' big"></em><span>' + who + '</span><small>' + (e.k === 'tiro' ? 'Tiro in porta, para il portiere' : 'Tiro, fuori di poco') + '</small>', e.side === 'H' ? 'home' : 'away');
              e.rv.forEach(function (r) { badge(r[0], r[1]); });
              go(function () { unflash(); holder = null; ball.style.left = '50%'; ball.style.top = '50%'; poss = e.side === 'H' ? 'A' : 'H'; go(tick, STEP); }, e.k === 'gol' ? 1900 : 1250);
            }, 620);
          }, STEP);
        } else {
          flash(e.k === 'giallo' ? '<em class="ycard big"></em><span>' + who + '</span><small>Ammonito</small>' : '<em class="foul big"></em><span>Fallo di ' + who + '</span><small>' + (e.f2 ? 'su ' + esc(initN(e.f2.p.name)) : '') + '</small>', e.k === 'giallo' ? 'card' : (e.side === 'H' ? 'home' : 'away'));
          e.rv.forEach(function (r) { badge(r[0], r[1]); });
          go(function () { unflash(); go(tick, STEP); }, 1300);
        }
        return;
      }
      if (minute >= 90) { flash('<b>Fischio finale</b><span>' + esc(nm(m.h)) + ' ' + score[0] + ' - ' + score[1] + ' ' + esc(nm(m.a)) + '</span>', 'end'); go(function () { simReveal(plan); }, 1700); return; }
      if (rnd() < 0.28) poss = poss === 'H' ? 'A' : 'H';
      var list = nodes[poss] || []; if (list.length) { var n2; do { n2 = list[Math.floor(rnd() * list.length)]; } while (list.length > 1 && n2 === holder); place(n2); }
      minute += PER; draw(); go(tick, STEP);
    };
    go(tick, 400);
  }
  /* Card verticale (1080x1920) da condividere: pronostico, barra 1X2, campo con le formazioni e chi spicca */
  var SHARE = null;
  function shareCard() {
    var m = S.m, tf = S.tf; if (!m || !tf) return;
    var p = null; try { p = Core.mainPick(m, tf, S.pf) || Core.picks(m, tf, S.pf, false)[0]; } catch (e) { p = null; }
    var W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
    var ready = document.fonts && document.fonts.load ? Promise.all(['800 64px "Saira Condensed"', '700 40px "Saira Semi Condensed"', '600 30px "Public Sans"'].map(function (f) { return document.fonts.load(f).catch(function () {}); })) : Promise.resolve();
    ready.then(function () {
      var D = '"Saira Condensed", "Arial Narrow", sans-serif', NUM = '"Saira Semi Condensed", "Arial Narrow", sans-serif', B = '"Public Sans", system-ui, sans-serif';
      var rr = function (x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
      var fit = function (txt, max, size, weight, fam) { var sz = size; do { c.font = weight + ' ' + sz + 'px ' + fam; sz -= 2; } while (c.measureText(txt).width > max && sz > 20); };
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1114'); g.addColorStop(1, '#0c1b15'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      var rg = c.createRadialGradient(W / 2, 640, 40, W / 2, 640, 620); rg.addColorStop(0, 'rgba(243,182,63,.16)'); rg.addColorStop(1, 'rgba(243,182,63,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
      // logo
      var lg = c.createLinearGradient(80, 70, 170, 160); lg.addColorStop(0, '#2fd47f'); lg.addColorStop(1, '#16b5c6'); c.fillStyle = lg; rr(80, 70, 92, 92, 24); c.fill();
      c.fillStyle = 'rgba(4,35,26,.9)'; [[96, 128, 14, 22], [116, 114, 14, 36], [136, 100, 14, 50]].forEach(function (b) { rr(b[0], b[1], b[2], b[3], 4); c.fill(); }); c.beginPath(); c.arc(155, 92, 9, 0, 7); c.fill();
      c.font = '800 76px ' + D; c.textBaseline = 'middle'; c.fillStyle = '#f2f4f5'; c.fillText('OVER', 196, 118); var ow = c.measureText('OVER').width; var tg = c.createLinearGradient(196 + ow, 0, 196 + ow + 140, 0); tg.addColorStop(0, '#2fd47f'); tg.addColorStop(1, '#16b5c6'); c.fillStyle = tg; c.fillText('LAB', 196 + ow, 118);
      var comp = Core.comp(m.lg); c.textAlign = 'center'; c.font = '600 32px ' + B; c.fillStyle = '#8b9299'; c.fillText((comp ? comp.name + ' · ' : '') + dayLabel(m.d) + ' · ' + hm(m.d), W / 2, 236);
      // squadre
      c.fillStyle = '#4fd8e6'; fit(tn(m.h).toUpperCase(), 400, 70, 800, D); c.textAlign = 'right'; c.fillText(tn(m.h).toUpperCase(), W / 2 - 70, 330);
      c.fillStyle = '#ff8f63'; fit(tn(m.a).toUpperCase(), 400, 70, 800, D); c.textAlign = 'left'; c.fillText(tn(m.a).toUpperCase(), W / 2 + 70, 330);
      c.textAlign = 'center'; c.font = '800 54px ' + D; c.fillStyle = '#5d646b'; c.fillText('VS', W / 2, 332);
      // barra 1X2
      var r = tf.res; if (r) { var x0 = 80, bw = W - 160, y0 = 400, parts = [[r.h, '#16b5c6'], [r.d, '#858d98'], [r.a, '#ff6a3d']], xx = x0;
        parts.forEach(function (q) { var w = Math.max(10, q[0] * (bw - 12)); c.fillStyle = q[1]; rr(xx, y0, w, 22, 11); c.fill(); xx += w + 6; });
        c.font = '700 34px ' + NUM; c.textAlign = 'left'; c.fillStyle = '#4fd8e6'; c.fillText('1  ' + pct(r.h), x0, 462); c.textAlign = 'center'; c.fillStyle = '#c9cdd1'; c.fillText('X  ' + pct(r.d), W / 2, 462); c.textAlign = 'right'; c.fillStyle = '#ff8f63'; c.fillText('2  ' + pct(r.a), W - x0, 462); }
      // pronostico
      c.textAlign = 'center'; c.fillStyle = 'rgba(36,39,43,.92)'; rr(80, 520, W - 160, 400, 36); c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(243,182,63,.55)'; c.stroke();
      c.font = '700 30px ' + B; c.fillStyle = '#f3b63f'; c.fillText('P R O N O S T I C O', W / 2, 580);
      if (p) {
        var words = p.label.toUpperCase().split(' '), lines = [], cur = '', size = 86; c.font = '900 ' + size + 'px ' + D;
        words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (c.measureText(t).width > W - 240 && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur);
        if (lines.length > 3) { size = 64; c.font = '900 ' + size + 'px ' + D; lines = []; cur = ''; words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (c.measureText(t).width > W - 240 && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur); }
        var gg = c.createLinearGradient(0, 620, 0, 860); gg.addColorStop(0, '#ffd77f'); gg.addColorStop(1, '#f5a524'); c.fillStyle = gg; c.shadowColor = 'rgba(245,165,36,.45)'; c.shadowBlur = 30;
        var ly = 720 - (lines.length - 1) * size * 0.5; lines.forEach(function (l, i) { c.fillText(l, W / 2, ly + i * size * 1.02); }); c.shadowBlur = 0;
        c.font = '600 34px ' + B; c.fillStyle = '#c9cdd1'; c.fillText('stima ' + pct(p.p) + (PLAY ? '' : '   ·   quota giusta ' + quota(p.p)), W / 2, 880);
      }
      // campo
      var py = 950, ph = 770, px = 80, pw = W - 160;
      c.save(); rr(px, py, pw, ph, 30); c.clip();
      for (var k = 0; k < 10; k++) { c.fillStyle = k % 2 ? '#22884a' : '#1c7a3d'; c.fillRect(px, py + k * ph / 10, pw, ph / 10 + 1); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.strokeRect(px + 24, py + 20, pw - 48, ph - 40); c.beginPath(); c.moveTo(px + 24, py + ph / 2); c.lineTo(px + pw - 24, py + ph / 2); c.stroke(); c.beginPath(); c.arc(px + pw / 2, py + ph / 2, 70, 0, 7); c.stroke();
      c.strokeRect(px + pw * 0.27, py + 20, pw * 0.46, 80); c.strokeRect(px + pw * 0.27, py + ph - 100, pw * 0.46, 80); c.restore();
      if (S.pf) {
        var mark = {}, best = function (t, kk) { var b0 = null; (S.pf[t] || []).forEach(function (f) { if (f.status === 'tit' && f.p.pos !== 'G' && (!b0 || f.st[kk].p1 > b0.st[kk].p1)) b0 = f; }); return b0; };
        [m.h, m.a].forEach(function (t) { var a = best(t, 'yc'), s2 = best(t, 'gl'); if (a) (mark[a.p.id] = mark[a.p.id] || {}).yc = 1; if (s2) (mark[s2.p.id] = mark[s2.p.id] || {}).gl = 1; });
        var Y = { H: { G: 6, D: 18.5, M: 31, M2: 38, F: 43.5 }, A: { G: 90.5, D: 79.5, M: 68.5, M2: 62, F: 56.5 } };
        [[m.h, 'H', '#16b5c6'], [m.a, 'A', '#ff6a3d']].forEach(function (x) {
          var rows = xiRows(x[0]), ln2 = [['G', rows.G], ['D', rows.D]]; if (rows.M.length >= 6) { var h1 = Math.ceil(rows.M.length / 2); ln2.push(['M', rows.M.slice(0, h1)], ['M2', rows.M.slice(h1)]); } else ln2.push(['M', rows.M]); ln2.push(['F', rows.F]);
          ln2.forEach(function (L) { var n = L[1].length; L[1].forEach(function (f, i) {
            var cx = px + pw * (i + 1) / (n + 1), cy = py + ph * Y[x[1]][L[0]] / 100;
            c.beginPath(); c.arc(cx, cy, 25, 0, 7); c.fillStyle = x[2]; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.25)'; c.stroke();
            c.fillStyle = '#fff'; c.font = '800 26px ' + NUM; c.textAlign = 'center'; c.fillText(String(f.p.jersey || ''), cx, cy + 1);
            var nm2 = shortN(f.p.name); c.font = '600 20px ' + B; var tw = Math.min(170, c.measureText(nm2).width + 16); c.fillStyle = 'rgba(6,12,16,.85)'; rr(cx - tw / 2, cy + 30, tw, 28, 8); c.fill(); c.fillStyle = '#fff'; c.fillText(nm2, cx, cy + 45, 160);
            var mk = mark[f.p.id] || {}; if (mk.yc) { c.fillStyle = '#ffd400'; rr(cx - 40, cy - 34, 15, 21, 3); c.fill(); } if (mk.gl) { c.beginPath(); c.arc(cx + 30, cy - 24, 12, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#111'; c.stroke(); c.beginPath(); c.arc(cx + 30, cy - 24, 4.5, 0, 7); c.fillStyle = '#111'; c.fill(); }
          }); });
        });
        // chi spicca
        var all = [].concat(S.pf[m.h] || [], S.pf[m.a] || []).filter(function (f) { return f.status === 'tit' && f.p.pos !== 'G'; }), top = function (kk) { var b0 = null; all.forEach(function (f) { if (!b0 || f.st[kk].p1 > b0.st[kk].p1) b0 = f; }); return b0; };
        var a1 = top('yc'), g1 = top('gl'); c.textAlign = 'left'; c.font = '600 34px ' + B;
        if (g1) { c.beginPath(); c.arc(104, 1772, 16, 0, 7); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(104, 1772, 6, 0, 7); c.fillStyle = '#111'; c.fill(); c.fillStyle = '#f3b63f'; c.fillText('Probabile marcatore', 136, 1774); c.fillStyle = '#f2f4f5'; c.textAlign = 'right'; c.fillText(initN(g1.p.name) + '  ' + pct(g1.st.gl.p1), W - 80, 1774); c.textAlign = 'left'; }
        if (a1) { c.fillStyle = '#ffd400'; rr(94, 1810, 20, 28, 4); c.fill(); c.fillStyle = '#f3b63f'; c.fillText('Rischia il giallo', 136, 1826); c.fillStyle = '#f2f4f5'; c.textAlign = 'right'; c.fillText(initN(a1.p.name) + '  ' + pct(a1.st.yc.p1), W - 80, 1826); }
      }
      c.textAlign = 'center'; c.font = '500 26px ' + B; c.fillStyle = '#6f777f'; c.fillText('Probabilità stimate dal modello OverLab, non certezze · 18+ · gioca responsabile', W / 2, 1888);
      cv.toBlob(function (blob) {
        if (!blob) return; SHARE = { blob: blob, name: 'overlab-' + (tn(m.h) + '-' + tn(m.a)).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png' };
        var url = URL.createObjectURL(blob), canShare = false; try { canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([blob], SHARE.name, { type: 'image/png' })] })); } catch (e) { canShare = false; }
        var ov = document.querySelector('.shov'); if (ov) ov.remove(); ov = document.createElement('div'); ov.className = 'shov';
        ov.innerHTML = '<div class="shbox" role="dialog" aria-label="Card da condividere"><img src="' + url + '" alt="Card del pronostico"><div class="shbtns">' + (canShare ? '<button class="btn pri" data-act="shsend">' + ic('share') + 'Condividi</button>' : '') + '<button class="btn' + (canShare ? '' : ' pri') + '" data-act="shsave">Salva immagine</button><button class="btn" data-act="shclose">Chiudi</button></div><p class="foot" id="shmsg">' + (canShare ? 'Condividi la manda direttamente su WhatsApp, Instagram e le altre app.' : 'Salva l\'immagine e poi pubblicala dove vuoi.') + '</p></div>';
        document.body.appendChild(ov);
      }, 'image/png');
    });
  }
  function shareOut(act) {
    if (!SHARE) return; var msg = document.getElementById('shmsg'), say = function (t) { if (msg) msg.textContent = t; };
    if (act === 'shsend') { var f = new File([SHARE.blob], SHARE.name, { type: 'image/png' }); navigator.share({ files: [f], title: 'OverLab' }).catch(function () {}); return; }
    var fallback = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(SHARE.blob); a.download = SHARE.name; document.body.appendChild(a); a.click(); a.remove(); say('Se il download non parte, tieni premuto sull\'immagine per salvarla.'); };
    if (!window.claude || !window.claude.use) return fallback();
    window.claude.use('downloads').then(function (dl) {
      if (!dl) return fallback();
      dl.save({ filename: SHARE.name, data: SHARE.blob }).then(function () { say('Immagine salvata.'); }, function (e) { say(e && e.code === 'declined' ? 'Salvataggio annullato.' : 'Non riesco a salvarla qui: tieni premuto sull\'immagine per salvarla.'); });
    }, fallback);
  }
  function topPickHtml(sot) {
    var m = S.m, all = [].concat(S.pf[m.h] || [], S.pf[m.a] || []).filter(function (f) { return f.status === 'tit' && f.p.pos !== 'G'; });
    var top = function (k) { var b = null; all.forEach(function (f) { if (!b || f.st[k].p1 > b.st[k].p1) b = f; }); return b; };
    var f2 = function (x) { return (Math.round(x * 100) / 100).toFixed(2).replace('.', ','); }, role = { D: 'difensore', M: 'centrocampista', F: 'attaccante' };
    var rows = [], a = top('yc'), g = top('gl'), s2 = sot && top('sot');
    if (a) rows.push(['ycard', 'Cartellino: chi rischia', a, a.st.yc.p1, (a.p.yc || 0) + ' gialli nelle ultime ' + (a.p.apps || 0) + ' presenze. ' + (role[a.p.pos] ? 'Gioca da ' + role[a.p.pos] + '; ' : '') + 'la sua squadra dovrebbe prendere ' + f2(a.st.yc.teamYc || 0) + ' gialli. Il giallo del singolo è molto casuale: nel test il più a rischio lo ha preso circa 1 volta su 6.']);
    if (g) rows.push(['ball', 'Probabile marcatore', g, g.st.gl.p1, 'Dovrebbe fare ' + f2(g.st.sot.mean) + ' tiri in porta, il più pericoloso della partita; la sua squadra ha ' + f2(g.team === m.h ? S.tf.res.lh : S.tf.res.la) + ' gol attesi. Stima non verificata: nei dati non ci sono i gol dei singoli giocatori.']);
    if (s2) rows.push(['tgt', 'Tiri in porta: almeno uno', s2, s2.st.sot.p1, 'Tira in porta ' + f2(s2.st.sot.per90 * 90) + ' volte ogni 90 minuti in questa partita; minuti attesi ' + Math.round(s2.expMin) + '.']);
    var topM = function (k) { var b = null; all.forEach(function (f) { if (!b || f.st[k].mean > b.st[k].mean) b = f; }); return b; };
    var lineN = function (st) { return st.p3 >= 0.55 ? 3 : st.p2 >= 0.55 ? 2 : 1; };
    [sot ? ['sh', 'shot', 'Tiri totali', 'tiri', 'Fa'] : null, ['fc', 'foul', 'Falli fatti', 'falli', 'Commette'], ['fs', 'fouled', 'Falli subiti', 'falli', 'Subisce']].forEach(function (x) {
      if (!x) return; var f = topM(x[0]); if (!f) return; var st = f.st[x[0]], n = lineN(st);
      rows.push([x[1], x[2] + ': almeno ' + n, f, st['p' + n], x[4] + ' ' + f2(st.per90 * 90) + ' ' + x[3] + ' ogni 90 minuti; in questa partita ne sono attesi ' + f2(st.mean) + '.']);
    });
    var duel = '';
    if (sot) {
      var bestSh = function (t) { var b = null; (S.pf[t] || []).forEach(function (f) { if (f.status === 'tit' && f.p.pos !== 'G' && (!b || f.st.sh.mean > b.st.sh.mean)) b = f; }); return b; };
      var A1 = bestSh(m.h), B1 = bestSh(m.a);
      if (A1 && B1) {
        var pois = function (l) { var a = [], t = Math.exp(-l); for (var k = 0; k <= 25; k++) { a.push(t); t *= l / (k + 1); } return a; };
        var pa = pois(A1.st.sh.mean), pb = pois(B1.st.sh.mean), w = 0, d = 0; pa.forEach(function (x, i) { pb.forEach(function (y, j) { if (i > j) w += x * y; else if (i === j) d += x * y; }); });
        duel = '<div class="tp-r"><h4><em class="shot"></em>Testa a testa: chi tira di più</h4><div class="duel"><span class="home"><b>' + esc(initN(A1.p.name)) + '</b>' + pct(w) + '</span><span class="dx"><b>Pari</b>' + pct(d) + '</span><span class="away"><b>' + esc(initN(B1.p.name)) + '</b>' + pct(1 - w - d) + '</span></div><p class="tp-w">Tiri attesi: ' + f2(A1.st.sh.mean) + ' contro ' + f2(B1.st.sh.mean) + '. I due che tirano di più nelle due squadre.</p></div>';
      }
    }
    if (!rows.length && !duel) return '';
    return '<div class="tp"><span class="tp-pill">' + ic('star') + 'Top pick della partita</span>' + rows.map(function (r) {
      return '<div class="tp-r"><h4><em class="' + r[0] + '"></em>' + r[1] + '</h4><p class="tp-n"><span class="' + (r[2].team === m.h ? 'home' : 'away') + '">' + esc(T[r[2].team] ? T[r[2].team].s : tn(r[2].team)) + ':</span> ' + esc(initN(r[2].p.name)) + ' <small>(' + pct(r[3]) + ')</small></p><p class="tp-w">' + esc(r[4]) + '</p></div>';
    }).join('') + duel + '</div>';
  }
  /* Card dei protagonisti accanto al pronostico: una alla volta, entra girando, mostra la giocata del giocatore
     (segna, ammonito, tiro in porta...) e lascia il posto alla successiva. Tocca la card per passare alla prossima. */
  var XC = { tick: 0 }, ROLE = { G: 'Portiere', D: 'Difensore', M: 'Centrocampista', F: 'Attaccante' };
  function heroCards(m) {
    if (!S.pf) return '';
    var so; try { so = standouts(m); } catch (e) { return ''; }
    var W = so.who, shot = Core.shotsOk(m.lg) ? 'sot' : 'sh', seen = {}, list = [];
    var EVT = { gl: ['SEGNA', 'gold'], yc: ['AMMONITO', 'yel'], sot: ['TIRO IN PORTA', 'grn'], sh: ['TIRI', 'grn'], fc: ['FALLI', 'org'] };
    [[m.h, 'gl'], [m.a, 'gl'], [m.h, 'yc'], [m.a, 'yc'], [m.h, shot], [m.a, shot], [m.h, 'fc'], [m.a, 'fc']].forEach(function (x) {
      var f = (W[x[0]] || {})[x[1]]; if (!f || seen[f.p.id] || list.length >= 6) return; seen[f.p.id] = 1; list.push({ t: x[0], k: x[1], f: f });
    });
    if (!list.length) return '';
    var ini = function (n) { var w = String(n || '').trim().split(/\s+/); return ((w[0] || '').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase(); };
    var cards = list.map(function (c, i) {
      var f = c.f, st = f.st, k = c.k, ev = EVT[k], val = k === 'sh' || k === 'fc' ? f1(st[k].mean) : pct(st[k].p1), unit = k === 'sh' || k === 'fc' ? 'attesi' : '';
      return '<div class="xcc ' + (c.t === m.h ? 'h' : 'a') + ' ' + ev[1] + (i === XC.tick % list.length ? ' on' : '') + '" role="group" aria-label="' + esc(f.p.name + ': ' + ev[0].toLowerCase() + ' ' + val + (unit ? ' ' + unit : '')) + '">' +
        '<div class="xc-f">' +
        '<div class="xc-top">' + logo(c.t) + '<span class="xc-n">' + esc(f.p.jersey || '') + '</span></div>' +
        '<div class="xc-av"><span>' + esc(ini(f.p.name)) + '</span></div>' +
        '<div class="xc-nm"><b>' + esc(shortN(f.p.name)) + '</b><small>' + esc(ROLE[f.p.pos] || '') + '</small></div>' +
        '<div class="xc-ev"><small>' + ev[0] + '</small><b>' + val + (unit ? '<i>' + unit + '</i>' : '') + '</b></div>' +
        '<div class="xc-st"><span><small>GOL</small>' + pct(st.gl.p1) + '</span><span><small>TIRI</small>' + f1(st.sh.mean) + '</span><span><small>GIALLO</small>' + pct(st.yc.p1) + '</span></div><i class="xc-sh"></i></div></div>';
    }).join('');
    return '<button class="xc" data-act="xcnext" aria-label="Protagonisti della partita: tocca per il prossimo">' + cards + '</button>';
  }
  function xcStep() {
    XC.tick++;
    [].forEach.call(document.querySelectorAll('.xc'), function (w) {
      var cs = w.querySelectorAll('.xcc'); if (cs.length < 2) return;
      var cur = XC.tick % cs.length, prev = (cur - 1 + cs.length) % cs.length;
      [].forEach.call(cs, function (c, i) { c.classList.toggle('on', i === cur); c.classList.toggle('off', i === prev); });
    });
  }
  setInterval(function () { if (!document.hidden && document.querySelector('.xc')) xcStep(); }, 3400);
  // il pronostico principale della partita, con fiducia, rischio e analisi
  function heroHtml() {
    var ob = obOn(), has = ob && Core.bookOf(S.m), p = null;
    try { p = (has || !Core.bookOf(S.m) ? Core.mainPick(S.m, S.tf, S.pf) : null) || (has ? Core.occasions(S.m, S.tf, S.pf)[0] : null) || Core.picks(S.m, S.tf, S.pf, ob)[0] || null; } catch (e) { p = null; }
    if (!p) return '';
    var lines = [];
    try {
      if (p.kind === 'team') lines = Core.explainTeam(S.cd, S.m, S.tf, p.stat, p.side);
      else if (p.kind === 'res') lines = Core.explainRes(S.cd, S.m, S.tf);
      else { var f = findPF(p.pid); lines = f && S.pd ? Core.explainPlayer(S.m, S.tf, f, p.stat, S.pd.lu[p.team].src) : []; }
    } catch (e) { lines = []; }
    var fid = p.p >= 0.72 ? ['Alta', 'hit', 'Basso', 'hit'] : p.p >= 0.58 ? ['Media', 'okt', 'Medio', 'midt'] : ['Bassa', 'midt', 'Alto', 'midt'];
    var story = ''; try { story = Core.analysis(S.cd, S.m, S.tf).text[0] || ''; } catch (e) { story = ''; }
    var xc = heroCards(S.m);
    return '<section class="hero">' + (xc ? '<div class="hero-top">' : '') + '<div class="hero-p"><small>Pronostico</small><b class="' + (p.label.length > 18 ? 'lng' : '') + '">' + esc(p.label) + '</b><span>stima ' + pct(p.p) + (p.occ ? ' · occasione' : '') + '</span></div>' + (xc ? xc + '</div>' : '') +
      '<div class="hero-k"><div><small>Fiducia</small><b class="' + fid[1] + '">' + fid[0] + '</b></div><div><small>Rischio</small><b class="' + fid[3] + '">' + fid[2] + '</b></div><div><small>' + (PLAY ? 'Probabilità' : p.odds && !p.fair ? 'Quota' : 'Quota giusta') + '</small><b>' + (PLAY ? pct(p.p) : p.odds && !p.fair ? q2(p.odds) : quota(p.p)) + '</b></div></div>' +
      (story ? '<div class="hero-a"><h2>' + ic('star') + 'Analisi</h2><p class="story">' + esc(story) + '</p></div>' : '') +
      (lines.length ? '<div class="hero-a"><h2>' + ic('spark') + 'Perché questa giocata</h2><ul>' + lines.slice(0, 5).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<button class="btn wide shbtn" data-act="share">' + ic('share') + 'Crea la card da condividere</button>' + (S.tab !== 'an' ? '<button class="btn wide pri" data-tab="an">' + ic('chart') + 'Analisi completa della partita</button>' : '') + '</section>';
  }
  // analisi completa: racconto, confronto tra le squadre, ultime partite, precedenti, numeri attesi, giocate
  function anHtml() {
    var a; try { a = Core.analysis(S.cd, S.m, S.tf); } catch (e) { return '<div class="note err">Non riesco a preparare l\'analisi di questa partita.</div>'; }
    var H = a.H, A = a.A, f1 = function (x) { return isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1).replace('.', ',') : '-'; };
    var badge = function (r) { return '<i class="fm ' + ({ V: 'w', N: 'd', P: 'l' }[r] || '') + '">' + r + '</i>'; };
    var h = '<section class="an"><h2 class="an-h">' + ic('spark') + 'Il racconto della partita</h2>' + a.text.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</section>';
    // confronto
    // better: 1 = più alto è meglio, -1 = più basso è meglio, 0 = nessun confronto
    var cell = function (v, w, better) { return better && isFinite(v) && isFinite(w) && Math.abs(v - w) > 0.05 && (better > 0 ? v > w : v < w) ? ' class="bt"' : ''; };
    var row = function (lab, x, y, better, vx, vy) { vx = vx != null ? vx : x; vy = vy != null ? vy : y; return '<tr><td' + cell(vx, vy, better) + '>' + x + '</td><th>' + lab + '</th><td' + cell(vy, vx, better) + '>' + y + '</td></tr>'; };
    var rowv = function (lab, x, y, better) { return row(lab, f1(x), f1(y), better, x, y); };
    var form = function (o) { return o.f5.map(function (x) { return badge(x.r); }).join(''); };
    h += '<section class="an"><h2 class="an-h">' + ic('team') + 'Confronto</h2><div class="cmp-wrap"><table class="cmp"><thead><tr><td>' + logo(S.m.h) + '<b>' + esc(T[S.m.h] ? T[S.m.h].s : H.name) + '</b></td><th></th><td>' + logo(S.m.a) + '<b>' + esc(T[S.m.a] ? T[S.m.a].s : A.name) + '</b></td></tr></thead><tbody>' +
      '<tr><td><span class="fms">' + form(H) + '</span></td><th>Forma (ultime 5)</th><td><span class="fms">' + form(A) + '</span></td></tr>' +
      row('Punti ultime 5', H.pts5, A.pts5, 1) + row('Punti in casa / in trasferta', H.venPts + ' su ' + 3 * H.ven.length, A.venPts + ' su ' + 3 * A.ven.length, 1, H.ven.length ? H.venPts / H.ven.length : NaN, A.ven.length ? A.venPts / A.ven.length : NaN) +
      rowv('Gol fatti (media)', H.avgF.g, A.avgF.g, 1) + rowv('Gol subiti (media)', H.avgA.g, A.avgA.g, -1) +
      row('Over 2,5', H.over25 + '/' + H.n10, A.over25 + '/' + A.n10, 0) + row('Segnano entrambe', H.btts + '/' + H.n10, A.btts + '/' + A.n10, 0) +
      row('Porta inviolata', H.cs + '/' + H.n10, A.cs + '/' + A.n10, 0) +
      rowv('Tiri (media)', H.avgF.sh, A.avgF.sh, 1) + rowv('Tiri in porta (media)', H.avgF.sot, A.avgF.sot, 1) + rowv('Tiri in porta concessi', H.avgA.sot, A.avgA.sot, -1) +
      rowv('Corner (media)', H.avgF.co, A.avgF.co, 1) + rowv('Corner concessi', H.avgA.co, A.avgA.co, -1) + rowv('Falli (media)', H.avgF.fo, A.avgF.fo, 0) + rowv('Gialli (media)', H.avgF.yc, A.avgF.yc, 0) +
      '</tbody></table></div><p class="foot">Forma e ultime partite dalla più recente. Medie sulle ultime ' + Math.max(H.n10, A.n10) + ' partite della competizione. In verde la squadra messa meglio.</p></section>';
    h += radarHtml() + formChart(H, A);
    // ultime partite
    var lastL = function (o) { return '<div class="lastl"><h3>' + esc(o.name) + '</h3>' + o.last.slice(0, 6).map(function (x) { return '<div class="lrow">' + badge(x.r) + '<span class="lo-o">' + (x.home ? '' : '@ ') + esc(tn(x.opp)) + '</span><b>' + x.gf + '-' + x.ga + '</b><small>' + new Date(x.d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + '</small></div>'; }).join('') + '</div>'; };
    h += '<section class="an"><h2 class="an-h">' + ic('cal') + 'Ultime partite</h2><div class="lastg">' + lastL(H) + lastL(A) + '</div><p class="foot">«@» = in trasferta.</p></section>';
    // precedenti
    if (a.h2h.length) h += '<section class="an"><h2 class="an-h">' + ic('res') + 'Precedenti</h2>' + a.h2h.map(function (x) { return '<div class="lrow"><span class="lo-o">' + esc(tn(x.h) + ' - ' + tn(x.a)) + '</span><b>' + x.sc[0] + '-' + x.sc[1] + '</b><small>' + new Date(x.d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' }) + '</small></div>'; }).join('') + '</section>';
    // numeri attesi
    var R = a.res, bar = function (lab, p, cl) { return '<div class="pb"><span>' + lab + '</span><div class="pb-t"><i class="' + cl + '" style="width:' + Math.round(p * 100) + '%"></i></div><b>' + pct(p) + '</b></div>'; };
    if (R) h += '<section class="an"><h2 class="an-h">' + ic('target') + 'Cosa dicono i numeri</h2>' + bar('1 ' + esc(T[S.m.h] ? T[S.m.h].s : ''), R.h, 'g1') + bar('X', R.d, 'g2') + bar('2 ' + esc(T[S.m.a] ? T[S.m.a].s : ''), R.a, 'g3') + bar('Over 2,5', R.over[2], 'g1') + bar('Goal', R.gg, 'g2') +
      '<div class="xg"><div><small>Gol attesi</small><b>' + f1(a.exp.gH) + ' - ' + f1(a.exp.gA) + '</b></div><div><small>Risultato più probabile</small><b>' + R.scores[0][0] + '-' + R.scores[0][1] + '</b></div><div><small>Corner attesi</small><b>' + f1(a.exp.co[2]) + '</b></div></div>' +
      '<p class="foot">' + (a.exp.src === 'quote' ? 'Risultato e gol: stima che combina modello e quote del bookmaker, che nei test sono state la previsione migliore.' : 'Stima del modello.') + '</p></section>';
    // giocate suggerite
    var ob = obOn(), list = (ob ? Core.occasions(S.m, S.tf, S.pf) : []).slice(0, 3); if (list.length < 3) list = list.concat(Core.picks(S.m, S.tf, S.pf, ob).filter(function (p) { return list.indexOf(p) < 0; }).slice(0, 3 - list.length));
    if (list.length) h += '<section class="an"><h2 class="an-h">' + ic('bolt') + 'Le giocate dell\'analisi</h2>' + list.map(function (p) { return '<div class="lrow"><span class="lo-o">' + esc(p.label) + '</span><b class="' + cls(p.p) + 't">' + pct(p.p) + '</b><small>' + (PLAY ? '' : p.odds ? 'quota ' + q2(p.odds) : 'minima ' + quota(p.p)) + '</small></div>'; }).join('') + '<p class="foot">Nessuna giocata è sicura: sono probabilità.</p></section>';
    return h;
  }
  // radar: le due squadre rispetto alla media del campionato (1 = nella media), per questa partita
  function radarHtml() {
    var cd = S.cd, tf = S.tf, r = tf.res, G = cd.fit && cd.fit.g, st = tf.stats; if (!r || !G || !st || !st.co) return '';
    var v = function (side) { var H = side === 'H', mu = function (s) { return H ? st[s].muH : st[s].muA; };
      return [H ? r.lh / G.muH : r.la / G.muA, H ? G.muA / Math.max(0.2, r.la) : G.muH / Math.max(0.2, r.lh), tf.pr[side].sh / mu('sh'), tf.pr[side].co / mu('co'), tf.pr[side].fo / mu('fo'), tf.pr[side].yc / mu('yc')]; };
    var L = ['Attacco', 'Difesa', 'Tiri', 'Corner', 'Falli', 'Gialli'], N = L.length, cx = 150, cy = 128, R = 92;
    var pt = function (i, val) { var a = -Math.PI / 2 + i * 2 * Math.PI / N, k = (Math.min(1.6, Math.max(0.4, val)) - 0.4) / 1.2 * R; return [cx + k * Math.cos(a), cy + k * Math.sin(a)]; };
    var poly = function (vals) { return vals.map(function (x, i) { return pt(i, x).map(function (z) { return z.toFixed(1); }).join(','); }).join(' '); };
    var grid = [0.7, 1, 1.3, 1.6].map(function (g) { return '<polygon points="' + poly(L.map(function () { return g; })) + '" class="rg' + (g === 1 ? ' avg' : '') + '"/>'; }).join('');
    var axes = L.map(function (l, i) { var e = pt(i, 1.6), t = pt(i, 1.8); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" class="rg"/><text x="' + t[0].toFixed(1) + '" y="' + (t[1] + 4).toFixed(1) + '" text-anchor="middle">' + l + '</text>'; }).join('');
    var vh = v('H'), va = v('A');
    return '<section class="an"><h2 class="an-h">' + ic('team') + 'Radar delle squadre</h2><svg class="radar" viewBox="0 0 300 262" role="img" aria-label="Radar delle due squadre">' + grid + axes +
      '<polygon points="' + poly(vh) + '" class="rp home"/><polygon points="' + poly(va) + '" class="rp away"/></svg>' +
      '<p class="lu-leg"><span><em class="dot home"></em>' + esc(tn(S.m.h)) + '</span><span><em class="dot away"></em>' + esc(tn(S.m.a)) + '</span></p>' +
      '<p class="foot">In questa partita, rispetto alla media del campionato: il contorno chiaro più marcato è la media. Più fuori vuol dire più gol, più solidità in difesa, più tiri, corner, falli e gialli.</p></section>';
  }
  // forma: gol fatti (sopra) e subiti (sotto) nelle ultime 10, dalla più vecchia alla più recente
  function formChart(H, A) {
    var one = function (o, cl) {
      var L = o.last.slice(0, 10).reverse(), W = 300, mid = 46, u = 11, n = Math.max(1, L.length), bw = W / n;
      var bars = L.map(function (x, i) { var X0 = i * bw + bw * 0.22, w = bw * 0.56, gf = Math.min(4, x.gf || 0), ga = Math.min(4, x.ga || 0);
        return '<rect x="' + X0.toFixed(1) + '" y="' + (mid - gf * u - 1).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (gf * u + 1).toFixed(1) + '" rx="2" class="fb ' + cl + '"/><rect x="' + X0.toFixed(1) + '" y="' + mid + '" width="' + w.toFixed(1) + '" height="' + (ga * u + 1).toFixed(1) + '" rx="2" class="fa"/><circle cx="' + (X0 + w / 2).toFixed(1) + '" cy="' + (mid + 4 * u + 9) + '" r="4" class="fr ' + ({ V: 'w', N: 'd', P: 'l' }[x.r] || '') + '"/>'; }).join('');
      return '<div class="fc"><h3><em class="dot ' + cl + '"></em>' + esc(o.name) + '</h3><svg viewBox="0 0 300 104" class="fsvg" role="img" aria-label="Gol fatti e subiti di ' + esc(o.name) + ' nelle ultime partite"><line x1="0" x2="300" y1="' + mid + '" y2="' + mid + '" class="rg"/>' + bars + '</svg></div>';
    };
    return '<section class="an"><h2 class="an-h">' + ic('trend') + 'Andamento</h2>' + one(H, 'home') + one(A, 'away') + '<p class="foot">Ultime 10 partite, dalla più vecchia (a sinistra) alla più recente. Sopra la linea i gol fatti, sotto quelli subiti; il pallino è il risultato: verde vittoria, giallo pareggio, rosso sconfitta.</p></section>';
  }
  function infoHtml() { return '<button class="back" data-nav="">' + ic('back') + 'Partite</button>' + $('#info-tpl').innerHTML; }

  // schermata di apertura: resta almeno 1,3 secondi, poi sfuma quando i dati sono pronti
  var T0 = Date.now();
  function hideSplash() {
    var s = document.getElementById('splash'); if (!s || hideSplash.done) return; hideSplash.done = true;
    setTimeout(function () { s.classList.add('out'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 600); }, Math.max(0, 1300 - (Date.now() - T0)));
  }
  setTimeout(hideSplash, 6000);
  function render() {
    if (+window.OVERLAB_EXPIRES && Date.now() > +window.OVERLAB_EXPIRES) { if (window.OverLabStart) window.OverLabStart(); return; }
    var r = cur(), y = window.scrollY;
    app.innerHTML = r === 'info' ? infoHtml() : r.indexOf('m/') === 0 ? matchHtml() : homeHtml();
    document.body.dataset.view = r.indexOf('m/') === 0 ? 'match' : r === 'info' ? 'info' : 'home';
    if (S.up || S.err || r !== '') hideSplash();
    [].forEach.call(document.querySelectorAll('.bnav button'), function (b) { var on = r === 'info' ? b.dataset.bn === 'info' : b.dataset.hv === S.hv; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (render.keep) { window.scrollTo(0, y); render.keep = false; }
  }
  function rerender() { render.keep = true; render(); }
  function route() {
    var r = cur(), p = r.split('/');
    window.scrollTo(0, 0);
    if (p[0] === 'm' && p[1] && p[2]) { openMatch(p[1], p[2]); return; }
    S.token++;
    if (r !== 'info' && !S.up && !S.loading) { loadHome(false); return; }
    render();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-nav],[data-hv],[data-smode],[data-swhen],[data-sgoal],[data-sq],[data-sp],[data-scombo],[data-ssel],[data-stake],[data-scat],[data-sn],[data-smin],[data-comp],[data-act],[data-tab],[data-exp],[data-pfil],[data-pteam],[data-pst],[data-cyc],[data-ptap],[data-stheme]'); if (!t) return;
    var d = t.dataset;
    if ('nav' in d) { nav(d.nav); return; }
    if (d.hv) { S.hv = d.hv; if (cur() !== '') nav(''); else { window.scrollTo(0, 0); render(); } return; }
    if (d.scat) { S.slip.cats[d.scat] = S.slip.cats[d.scat] ? 0 : 1; S.slip.ban = {}; S.slip.theme = null; S.slip.minP = null; rerender(); return; }
    if (d.stheme) { var th = THEMES.filter(function (x) { return x[0] === d.stheme; })[0]; if (!th) return; if (S.slip.theme === th[0]) { S.slip.theme = null; S.slip.minP = null; S.slip.cats = { sot: 1, sotT: 1, sh: 1, shT: 1, co: 1, coT: 1, res: 1, tg: 1 }; } else { S.slip.theme = th[0]; S.slip.cats = Object.assign({}, th[2]); S.slip.minP = th[3] || null; } S.slip.ban = {}; rerender(); return; }
    if (d.smode) { S.slip.mode = d.smode; S.slip.ban = {}; rerender(); return; }
    if (d.swhen) { S.slip.when = d.swhen; S.slip.ban = {}; rerender(); return; }
    if (d.sgoal) { S.slip.goal = d.sgoal; S.slip.ban = {}; rerender(); return; }
    if (d.sq) { S.slip.Q = +d.sq; S.slip.ban = {}; rerender(); return; }
    if (d.sp) { S.slip.P = +d.sp / 100; S.slip.ban = {}; rerender(); return; }
    if (d.scombo) { S.slip.combo = !S.slip.combo; S.slip.ban = {}; rerender(); return; }
    if (d.ssel) { var W = winOf(S.slip.when); if (d.ssel === '__all' || d.ssel === '__none') { S.slip.sel = {}; if (d.ssel === '__all' && S.cands && S.cands.items) S.cands.items.forEach(function (c) { if (c.m.d > Date.now() && c.m.d >= W[0] && c.m.d <= W[1]) S.slip.sel[c.m.id] = 1; }); } else if (S.slip.sel[d.ssel]) delete S.slip.sel[d.ssel]; else S.slip.sel[d.ssel] = 1; S.slip.ban = {}; rerender(); return; }
    if (d.stake) { updStake(+d.stake); return; }
    if (d.sn != null && d.sn !== '') { S.slip.N = +d.sn; S.slip.ban = {}; rerender(); return; }
    if (d.act === 'slipnext') { var cs = S.slipNow; if (cs) { var worst = null; cs.items.forEach(function (x) { if (!worst || x.ps < worst.ps) worst = x; }); if (worst) worst.legs.forEach(function (p) { S.slip.ban[Core.legKey(worst.m, p)] = 1; }); } rerender(); return; }
    if (d.act === 'slipfirst') { S.slip.ban = {}; rerender(); return; }
    if (d.act === 'coll') { S.coll[d.k] = !S.coll[d.k]; rerender(); return; }
    if (d.act === 'slipup') { var r = document.getElementById('slipres'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (d.act === 'slipset') { e.preventDefault(); var st = document.querySelector('.sett'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (d.act === 'sim') { runSim(); return; }
    if (d.act === 'simskip') { simSkip(); return; }
    if (d.act === 'xcnext') { xcStep(); return; }
    if (d.act === 'hi70') { S.hi70 = !S.hi70; S.sure = null; rerender(); return; }
    if (d.act === 'fav') { if (FAV[d.team]) delete FAV[d.team]; else FAV[d.team] = 1; saveFav(); rerender(); return; }
    if (d.act === 'share') { shareCard(); return; }
    if (d.act === 'shclose') { var ov = document.querySelector('.shov'); if (ov) ov.remove(); return; }
    if (d.act === 'shsave' || d.act === 'shsend') { shareOut(d.act); return; }
    if (d.ptap) { if (S.simOn) return; S.tab = 'players'; S.pteam = d.pt; S.pst = 'yc'; S.open = 'p:' + d.ptap + ':yc'; rerender(); var tb = document.querySelector('.tabs'); if (tb) tb.scrollIntoView({ behavior: 'smooth' }); return; }
    if (d.act === 'ob') { S.ob = !S.ob; S.open = null; S.more = false; rerender(); return; }
    if (d.comp) { S.comp = d.comp; rerender(); }
    else if (d.act === 'reload') loadHome(true);
    else if (d.act === 'retry') route();
    else if (d.act === 'more') { S.more = true; rerender(); }
    else if (d.tab) { S.tab = d.tab; S.open = null; S.more = false; rerender(); }
    else if (d.exp) { S.open = S.open === d.exp ? null : d.exp; rerender(); }
    else if (d.pfil) { S.pfil = d.pfil; S.more = false; rerender(); }
    else if (d.pteam) { S.pteam = d.pteam; S.more = false; S.open = null; rerender(); }
    else if (d.pst) { S.pst = d.pst; S.open = null; rerender(); }
    else if (d.cyc) { var f = findPF(d.cyc); if (f) { S.ov[d.cyc] = f.status === 'tit' ? (f.sure ? 'pan' : 'tit') : f.status === 'pan' ? 'out' : 'tit'; recalc(); rerender(); } }
  });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'stakein') updStake(parseFloat(String(e.target.value).replace(',', '.')), true); });
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'qin') { var v = parseFloat(String(e.target.value).replace(',', '.')); if (v >= 1.1 && v <= 10000) { S.slip.Q = Math.round(v * 100) / 100; S.slip.ban = {}; rerender(); } } });
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'compsel') { S.comp = e.target.value; S.slip.off = 0; rerender(); } });
  window.addEventListener('hashchange', route);
  $('#refresh').addEventListener('click', function () {
    var r = cur(), p = r.split('/'), again = function () { if (p[0] === 'm') openMatch(p[1], p[2]); else loadHome(true); };
    if (SNAP) { S.up = null; S.err = null; render(); window.OverLabReload().then(function () { Core.resetCache(); again(); }, function () { S.err = 'Non riesco a ricaricare i dati. Riprova tra poco.'; render(); }); return; }
    if (p[0] === 'm') Core.loadComp(p[1], true).then(again, again); else again();
  });
  // versione di prova con scadenza: dopo la data l'app si blocca
  var EXPIRES = +window.OVERLAB_EXPIRES || 0;
  // "domenica 11 ottobre alle 13:00" (con giorno della settimana) oppure "11 ottobre alle 13:00"
  function expTxt(wd) { var d = new Date(+window.OVERLAB_EXPIRES), o = { day: 'numeric', month: 'long' }; if (wd) o.weekday = 'long';
    return d.toLocaleDateString('it-IT', o) + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
  function expired() { return EXPIRES && Date.now() > EXPIRES; }
  function lockApp() {
    var s = document.getElementById('splash'); if (s && s.parentNode) s.parentNode.removeChild(s);
    var n = document.querySelector('.bnav'); if (n) n.hidden = true;
    app.innerHTML = '<section class="hero" style="margin-top:24px;text-align:center"><div class="hero-p"><small>Versione di prova</small><b>Prova scaduta</b><span>Il periodo di prova di OverLab è finito ' + expTxt(false).replace(/^(\d)/, 'il $1').replace(/^il (8|11)/, "l'$1") + '. Chiedi a chi te l\'ha mandata come continuare a usarla.</span></div></section>';
  }
  if (EXPIRES) setInterval(function () { if (expired()) lockApp(); }, 60000);
  window.OverLabStart = function () { if (expired()) { lockApp(); return; } route(); };
  if (!SNAP) route();
})();

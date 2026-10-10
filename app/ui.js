/* Interfaccia */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var T = Core.teams, f1 = Core.f1, pct = Core.pct;
  var S = { comp: 'all', up: null, err: null, loading: false, m: null, cd: null, tf: null, pd: null, pf: null, perr: null, prog: null, tab: 'top', pst: 'sh', pteam: null, ov: {}, open: null, pfil: 'all', hv: 'list', sure: null, ob: true, slip: { cats: { sot: 1, sotT: 1, sh: 1, shT: 1, co: 1, coT: 1, res: 0, psot: 0, psh: 0, pfc: 0, pfs: 0 }, mode: 'auto', when: 'od', goal: 'quota', Q: 5, P: 0.5, N: 0, combo: false, sel: {}, ban: {}, stake: 10 }, cands: null, more: false, token: 0, coll: {} };
  var app = $('#app');
  var SNAP = !!window.OVERLAB_SNAPSHOT, PLAY = !!window.OVERLAB_PLAY, R = '';
  if (PLAY) document.documentElement.classList.add('play');
  function cur() { return SNAP ? R : location.hash.replace(/^#/, ''); }
  function nav(r) { if (SNAP) { R = r; route(); } else if (cur() === r) route(); else location.hash = r; }
  var ROLE = { G: 'POR', D: 'DIF', M: 'CEN', F: 'ATT' };
  var PSHORT = { sh: 'Tiri', sot: 'In porta', fc: 'Falli fatti', fs: 'Falli subiti' };
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
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>'
  };
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICO[n] || '') + '</svg>'; }
  function cls(p) { return p >= 0.75 ? 'hi' : p >= 0.6 ? 'ok' : p >= 0.45 ? 'mid' : 'lo'; }
  function quota(p) { return p > 0 ? (1 / p).toFixed(2).replace('.', ',') : '-'; }
  function ln(x) { return String(x).replace('.', ','); }
  function q2(x) { return x.toFixed(2).replace('.', ','); }
  function bkName() { var b = Core.bookInfo(); return b ? b.name : ''; }
  // riga piccola sotto la giocata: quota del bookmaker e quota minima
  function oddsTxt(p) { if (PLAY) return ''; return p.odds ? 'quota ' + q2(p.odds) + (p.p * p.odds >= 1 ? ' · paga più del minimo (' + quota(p.p) + ')' : ' · minima ' + quota(p.p)) : 'quota minima ' + quota(p.p); }
  function extraWhy(p) {
    var L = [];
    if (p.pk > 0) L.push('Stima usata ' + pct(p.p) + ': media tra il modello (' + pct(p.pm) + ') e quello che indicano le quote (' + pct(p.pk) + ').');
    if (p.duo) L.push('In questa giocata contano anche i tiri di chi lo sostituisce: la stima ne tiene conto.');
    if (p.odds) L.push(p.p * p.odds >= 1 ? 'La quota ' + q2(p.odds) + ' è più alta della minima ' + quota(p.p) + ': secondo la stima paga più del rischio.' : 'La quota ' + q2(p.odds) + ' è più bassa della minima ' + quota(p.p) + ': secondo la stima paga meno del rischio.');
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
    var VH = { list: ['trophy', 'Partite', 'Tocca una partita per l\'analisi completa'], sure: ['target', 'Occasioni', 'Quote da 1,40 in su che secondo il modello pagano bene'], slip: ['spark', 'Schedina IA', 'Scegli obiettivo e budget: l\'IA compone la schedina'] }[S.hv] || ['trophy', 'Partite', ''];
    var h = '<div class="vh"><h1>' + ic(VH[0]) + esc(VH[1]) + '</h1><p>' + esc(VH[2]) + '</p></div>';
    h += dateStrip();
    var sel = '<label class="psel">' + ic('filter') + '<select id="compsel" aria-label="Competizione"><option value="all"' + (S.comp === 'all' ? ' selected' : '') + '>Tutte le competizioni</option>' + grp.map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + cs.filter(function (c) { return c.grp === g; }).map(function (c) { return '<option value="' + c.id + '"' + (S.comp === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select></label>';
    h += '<div class="pills">' + sel + [['od', 'Oggi e domani'], ['weekend', 'Fino a domenica'], ['tutte', 'Tutte']].map(function (x) { return '<button class="pill' + (S.slip.when === x[0] ? ' on' : '') + '" data-swhen="' + x[0] + '">' + (x[0] === 'tutte' ? '' : ic('clock')) + x[1] + '</button>'; }).join('') + '</div>';
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
    return h + '<p class="foot">' + when + (PLAY ? ' Statistiche e probabilità a scopo informativo. Vietato ai minori di 18 anni. OverLab non è un bookmaker e non accetta scommesse.' : '') + '</p>';
  }
  // le giocate più probabili delle prossime partite (finestra di 36 ore dalla prima in programma)
  // occasioni: giocate con quota da 1,40 in su che secondo la stima pagano bene rispetto al rischio
  function sureHtml(list) {
    var win = (S.slip.when === 'tutte' ? list.filter(function (m) { return m.d <= list[0].d + 36 * 36e5; }) : list).filter(function (m) { return m.d > Date.now() && Core.bookOf(m); }).slice(0, 40);
    if (!win.length) return '<div class="note">In questo periodo non ho quote per queste partite. Scegli un altro giorno qui sopra o un\'altra competizione.</div>';
    var key = S.comp + ':' + S.slip.when + ':' + win.length + ':' + win[0].id + ':' + (window.OVERLAB_T || 0);
    if (!S.sure || S.sure.key !== key) {
      var job = S.sure = { key: key, items: null };
      Core.occAcross(win, SNAP).then(function (items) { job.items = items; if (S.sure === job && S.hv === 'sure' && cur() === '') rerender(); }, function () { job.items = []; if (S.sure === job) rerender(); });
    }
    var h = '<div class="note">Giocate con <b>quota da 1,40 in su</b> e probabilità stimata di almeno 50%, ordinate dalla più conveniente. <b>Occasione</b> vuol dire che la stima è più alta di quella che indica la quota: secondo il modello paga più del rischio. Non è una garanzia: su tiri, corner e giocatori non ho uno storico delle quote per verificarlo.</div>';
    if (!S.sure.items) return h + '<div class="note">Cerco le occasioni in ' + win.length + ' partite…</div>' + skel(5);
    var per = {}, rows = S.sure.items.filter(function (x) { per[x.m.id] = (per[x.m.id] || 0) + 1; return per[x.m.id] <= 2; }).slice(0, 30);
    if (!rows.length) return h + '<div class="note">Nessuna giocata da 1,40 in su con probabilità di almeno 50% in queste partite.</div>';
    h += '<div class="list">' + rows.map(function (x) {
      var m = x.m, p = x.pick;
      return '<div class="pick' + (p.occ ? ' occ' : '') + '"><button class="pick-b" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="pick-l">' + (p.occ ? '<span class="tag gold">Occasione</span>' : '') + '<b>' + esc(p.label) + '</b><small>' + esc(tn(m.h) + ' - ' + tn(m.a)) + ' · ' + esc(dayLabel(m.d).toLowerCase()) + ' ' + hm(m.d) + '</small><small>stima <b class="' + cls(p.p) + 't">' + pct(p.p) + '</b> · quota giusta ' + quota(p.p) + '</small></span><span class="pp od2' + (p.occ ? ' gold' : '') + '">' + q2(p.odds) + '</span></button></div>';
    }).join('') + '</div>';
    return h + '<p class="foot">Al massimo due per partita. Tocca una riga per aprire la partita e leggere la spiegazione.</p>';
  }
  /* ---------- schedina composta dall'app ---------- */
  function slipHtml(list) {
    var bi = Core.bookInfo();
    if (!bi) return '<div class="note">Per comporre la schedina servono le quote del bookmaker. Chiedi a Claude in chat: «aggiorna le quote».</div>';
    var ms = list.filter(function (m) { return Core.bookOf(m) && m.d > Date.now(); });
    if (!ms.length) return '<div class="note">Nessuna partita con quote tra quelle in programma. Chiedi a Claude in chat: «aggiorna le quote».</div>';
    var key = S.comp + ':' + ms.length + ':' + ms[0].id + ':' + bi.t;
    if (!S.cands || S.cands.key !== key) {
      var job = S.cands = { key: key, items: null };
      Core.slipCandidates(ms, true).then(function (it) { job.items = it; if (S.cands === job && S.hv === 'slip' && cur() === '') rerender(); }, function () { job.items = []; if (S.cands === job) rerender(); });
    }
    var o = S.slip, auto = o.mode !== 'man', W = winOf(o.when);
    var seg = function (items, cur, attr) { return items.map(function (x) { return '<button class="' + (cur === x[0] ? 'on' : '') + '" data-' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join(''); };
    var chips = function (items, cur, attr) { return '<div class="wrapc">' + items.map(function (x) { return '<button class="chip' + (cur === x[0] ? ' on' : '') + '" data-' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; };
    var top = '<div class="seg">' + seg([['auto', ic('spark') + '<span>Sceglie l\'IA</span>'], ['man', ic('pick') + '<span>Scelgo io</span>']], auto ? 'auto' : 'man', 'smode') + '</div>';
    var whenHtml = '';
    var info = '';
    if (!S.cands.items) return top + '<div class="note">Preparo la schedina con ' + ms.length + ' partite…</div>' + skel(4) + whenHtml;
    var have = {}, inWin = {}; S.cands.items.forEach(function (c) { if (c.m.d > Date.now() && c.m.d >= W[0] && c.m.d <= W[1]) { have[c.o.cat] = 1; if (o.cats[c.o.cat]) inWin[c.m.id] = c.m; } });
    var wms = Object.keys(inWin).map(function (k) { return inWin[k]; }).sort(function (a, b) { return a.d - b.d; });
    var catsHtml = '<h2 class="day">Tipo di giocata</h2><div class="wrapc">' + Object.keys(Core.CAT_IT).filter(function (c) { return have[c]; }).map(function (c) { return '<button class="chip' + (o.cats[c] ? ' on' : '') + '" data-scat="' + c + '" aria-pressed="' + !!o.cats[c] + '">' + esc(Core.CAT_IT[c]) + '</button>'; }).join('') + '</div>';
    if (!wms.length) return top + '<div class="note">' + (Object.keys(have).length ? 'Nessuna partita di questo periodo ha quote per i tipi di giocata scelti. Aggiungi un tipo di giocata qui sotto.' : 'Nessuna partita con quote in questo periodo. Scegli un altro giorno qui sopra.') + '</div>' + whenHtml + (Object.keys(have).length ? catsHtml : '');
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
    ctl += info + '<p class="foot">Per raggiungere l\'obiettivo l\'IA cerca la combinazione con la probabilità più alta (o la quota più alta), usando solo giocate che secondo modello e quote escono almeno una volta su due. Nessuna schedina è sicura.</p>';
    // riepilogo delle scelte, in alto
    var goalTxt = o.goal === 'quota' ? 'quota ' + q2(o.Q) : 'almeno ' + Math.round(o.P * 100) + ' su 100';
    var whenTxt = DAYS_TXT[o.when] || 'tutte le date';
    var recap = '<p class="foot recap">' + esc(whenTxt) + ' · ' + esc(goalTxt) + (auto && o.N ? ' · ' + o.N + ' partite' : '') + (o.combo ? ' · MyCombo' : '') + ' · <span class="st-rc">' + esc(stakeTxt()) + '</span> — <a href="#" data-act="slipset">cambia</a></p>';
    if (!auto && !nsel) { S.slipNow = null; return top + '<div class="note">Scegli le partite qui sotto: l\'IA trova in ognuna la giocata migliore per il tuo obiettivo.</div>' + ctl; }
    var opt = { cats: o.cats, from: W[0], to: W[1], goal: o.goal, Q: o.Q, P: o.P, N: auto ? o.N : 0, combo: o.combo, ban: o.ban, ids: auto ? null : o.sel, all: !auto };
    var s = Core.optSlip(S.cands.items, opt);
    S.slipNow = s.items.length ? s : null;
    if (!s.items.length) {
      var why = s.impossible === 'poche' ? 'Ci sono solo ' + s.avail + ' partite con giocate adatte: scegli meno partite, un periodo più lungo o più tipi di giocata.'
        : o.goal === 'quota' ? 'Con queste partite e questi tipi di giocata non arrivo a quota ' + q2(o.Q) + (s.maxOdds > 1 ? ' (al massimo circa ' + q2(s.maxOdds) + ')' : '') + ' usando giocate che escono almeno una volta su due. Aggiungi partite o tipi di giocata, attiva MyCombo o abbassa la quota.'
        : 'Con queste partite non arrivo a ' + Math.round(o.P * 100) + ' su 100. Togli qualche partita o abbassa la probabilità minima.';
      return top + recap + '<div class="note">' + why + '</div>' + (Object.keys(o.ban).length ? '<button class="btn wide" data-act="slipfirst">Torna alla prima</button>' : '') + ctl;
    }
    var res = '<h2 class="day">La tua schedina</h2>' + recap + '<div class="list">' + s.items.map(function (x) {
      var m = x.m, combo = x.legs.length > 1;
      return '<div class="pick' + (combo ? ' combo' : '') + '"><button class="pick-b" data-nav="m/' + m.lg + '/' + esc(m.id) + '"><span class="pick-l">' + (combo ? '<span class="tag">MyCombo</span>' : '') + x.legs.map(function (p) { return '<b>' + esc(p.label) + (combo ? ' <span class="lq">' + q2(p.odds) + '</span>' : '') + '</b>'; }).join('') + '<small>' + esc(tn(m.h) + ' - ' + tn(m.a)) + ' · ' + esc(dayLabel(m.d).toLowerCase()) + ' ' + hm(m.d) + ' · stima ' + pct(x.p) + '</small></span><span class="pp od2">' + q2(x.odds) + '</span></button></div>';
    }).join('') + '</div>';
    var ev = s.p * s.odds, ncombo = s.items.filter(function (x) { return x.legs.length > 1; }).length;
    res += '<div class="sum"><div><small>Quota totale</small><b>' + q2(s.odds) + '</b></div><div><small>Probabilità stimata</small><b>' + pct(s.p) + '</b></div><div><small id="st-lab">' + stakeLab() + '</small><b id="st-win">' + eur(o.stake * s.odds) + '</b></div></div>';
    res += '<div class="note" id="st-note">' + stakeNote(s) + '</div>';
    res += '<div class="note">' + s.items.length + ' partite, ' + s.items.reduce(function (t, x) { return t + x.legs.length; }, 0) + ' giocate. Esce tutta circa ' + chance(s.p) + (Math.abs(s.ps - s.p) > 0.005 ? ' (stima prudente ' + chance(s.ps) + ')' : '') + '. ' + (ev >= 1 ? 'Secondo la stima la quota paga più del rischio.' : 'La quota paga meno del rischio, come quasi sempre: è il margine del bookmaker.') + (ncombo ? ' Nei MyCombo la quota viene ricalcolata, di solito un po\' più bassa del prodotto.' : '') + '</div>';
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
    var ob = obOn(), all = Core.picks(S.m, S.tf, S.pf, ob), list = all.filter(function (p) { return S.pfil === 'all' || p.kind === S.pfil; });
    var h = obBar() + '<div class="seg small">' + [['all', 'Tutte'], ['res', 'Esito e gol'], ['team', 'Squadre'], ['player', 'Giocatori']].map(function (x) { return '<button class="' + (S.pfil === x[0] ? 'on' : '') + '" data-pfil="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (!S.pf && !S.perr) h += '<div class="note">Carico i dati dei giocatori… <div class="bar"><i id="prog" style="width:' + (S.prog ? Math.round(100 * S.prog[0] / S.prog[1]) : 3) + '%"></i></div></div>';
    if (S.perr) h += '<div class="note err">' + esc(S.perr) + '</div>';
    var row = function (pre) { return function (p) {
      var key = pre + ':' + p.kind + ':' + p.stat + ':' + (p.side || p.pid || '') + ':' + (p.line != null ? p.line : p.n || '') + (p.dir || ''), sub, lines = [];
      if (p.kind === 'team') { sub = Core.STAT_IT[p.stat]; if (S.open === key) lines = Core.explainTeam(S.cd, S.m, S.tf, p.stat, p.side); }
      else if (p.kind === 'res') { sub = 'Esito e gol'; if (S.open === key) lines = Core.explainRes(S.cd, S.m, S.tf); }
      else { sub = tn(p.team); if (S.open === key) { var f = findPF(p.pid); lines = f ? Core.explainPlayer(S.m, S.tf, f, p.stat, S.pd.lu[p.team].src) : []; } }
      if (S.open === key) lines = extraWhy(p).concat(lines);
      return '<div class="pick' + (S.open === key ? ' open' : '') + (p.occ ? ' occ' : '') + '"><button class="pick-b" data-exp="' + esc(key) + '" aria-expanded="' + (S.open === key) + '"><span class="pick-l"><b>' + esc(p.label) + '</b><small>' + esc(sub) + (oddsTxt(p) ? ' · ' + esc(oddsTxt(p)) : '') + '</small></span><span class="pp ' + cls(p.p) + '">' + pct(p.p) + '</span></button>' + why(key, lines) + '</div>';
    }; };
    var sec = function (title, arr, pre) { return arr.length ? '<h2 class="day">' + title + '</h2><div class="list">' + arr.map(row(pre)).join('') + '</div>' : ''; };
    var kind = function (k, n) { return all.filter(function (p) { return p.kind === k; }).slice(0, n); };
    if (S.pfil === 'all' && !S.more) {
      var hasQ = ob && Core.bookOf(S.m), sure = hasQ ? Core.occasions(S.m, S.tf, S.pf).slice(0, 6) : Core.surePicks(S.m, S.tf, S.pf, ob).slice(0, 6);
      h += sec(hasQ ? 'Occasioni (quota da 1,40)' : 'Più probabili (85% e oltre)', sure, 's');
      if (sure.length) h += '<p class="foot">' + (hasQ ? 'Ordinate dalla più conveniente. Il bordo dorato segna quelle che secondo il modello pagano più del rischio. Nessuna è sicura.' : 'Nei test quelle sopra il 90% sono uscite circa 9 volte su 10. Pagano poco e nessuna è sicura.') + '</p>';
      h += sec('Esito e gol', kind('res', 4), 'k') + sec('Squadre', kind('team', 6), 'k') + sec('Giocatori', kind('player', 8), 'k');
      if (list.length) h += '<button class="btn wide" data-act="more">Mostra tutte (' + list.length + ')</button>';
      else if (!sure.length) h += '<div class="note">Nessuna giocata sopra il 60% per questa partita.</div>';
    } else {
      if (!list.length) return h + '<div class="note">Nessuna giocata adatta per questo filtro.</div>';
      var show = S.more ? list : list.slice(0, 14);
      h += '<div class="list">' + show.map(row('k')).join('') + '</div>';
      if (list.length > show.length) h += '<button class="btn wide" data-act="more">Mostra tutte (' + list.length + ')</button>';
    }
    return h + '<p class="foot">' + (PLAY ? 'Tocca una giocata per leggere perché.' : (ob ? 'Solo giocate con quota. La percentuale è una media tra il modello e le quote. ' : '') + 'La giocata conviene solo se la quota del bookmaker è più alta della quota minima.') + '</p>';
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
        if (S.open === key) body += '<div class="why"><b>Perché</b><ul>' + Core.explainTeam(S.cd, S.m, S.tf, s, x[0]).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + (ob ? '<li>La percentuale è una media tra il modello e le quote.</li>' : '') + '</ul><table class="qt"><tr><th>Linea</th><th>Over</th><th class="qm">minima</th>' + (ob ? '<th>Quota</th>' : '<th>Under</th><th class="qm">minima</th>') + '</tr>' +
          lines.map(function (l) { return '<tr><td>' + ln(l.line) + '</td><td>' + pct(l.over) + '</td><td class="qm">' + quota(l.over) + '</td>' + (ob ? '<td>' + q2(l.odds) + '</td>' : '<td>' + pct(l.under) + '</td><td class="qm">' + quota(l.under) + '</td>') + '</tr>'; }).join('') + '</table></div>';
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
    var PS = Core.PST.filter(function (x) { return Core.statOk(S.m.lg, x); });
    if (PS.indexOf(S.pst) < 0) S.pst = PS[0];
    var t = S.pteam, lu = S.pd.lu[t], k = S.pst, ob = obOn(), byP = {};
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
      var p = f.st[k]['p' + n]; return '<span class="pc ' + cls(p) + '">' + pct(p) + '</span>';
    };
    h += '<div class="plist"><div class="phead"><span>Giocatore</span><span>1+</span><span>2+</span><span>3+</span></div>' + shown.map(function (f) {
      var s = f.st[k], key = 'p:' + f.p.id + ':' + k, off = f.status === 'out', o1 = ob && byP[f.p.id] && (byP[f.p.id][1] || byP[f.p.id][2] || byP[f.p.id][3]);
      return '<div class="pl ' + f.status + '"><div class="pl-r"><button class="pl-n" data-exp="' + key + '" aria-expanded="' + (S.open === key) + '"><b>' + esc(f.p.name) + '</b><small>' + (ROLE[f.p.pos] || '') + (off ? '' : ' · ' + Math.round(f.expMin) + "' attesi · " + f1(s.mean) + ' attesi') + '</small></button>' + cell(f, 1) + cell(f, 2) + cell(f, 3) + '</div>' +
        '<button class="stt ' + f.status + (f.status === 'tit' && !f.sure ? ' prob' : '') + '" data-cyc="' + esc(f.p.id) + '" aria-label="Cambia stato di ' + esc(f.p.name) + '">' + (f.status === 'tit' && !f.sure ? 'Titolare probabile' : STT[f.status]) + '</button>' +
        (S.open === key && !off ? why(key, (o1 ? extraWhy(o1) : []).concat(Core.explainPlayer(S.m, S.tf, f, k, lu.src))) : '') + '</div>';
    }).join('') + '</div>';
    if (hidden > 0 && !S.more) h += '<button class="btn wide" data-act="more">Mostra anche gli altri ' + hidden + ' in rosa</button>';
    return h + '<p class="foot">Percentuali per ' + Core.PST_IT[k] + ' del singolo giocatore in questa partita' + (ob ? ', con la quota sotto. Il trattino indica una giocata senza quota' : '') + '. Basate sulle ultime ' + S.pd.loaded + ' partite delle due squadre.</p>';
  }

  function matchHtml() {
    var m = S.m, h = '<button class="back" data-nav="">' + ic('back') + 'Partite</button>';
    if (S.merr) return h + '<div class="note err">' + esc(S.merr) + ' <button class="btn" data-act="retry">Riprova</button></div>';
    if (!m) return h + '<div class="note">Carico la partita…</div>' + skel(4);
    var c = Core.comp(m.lg);
    h += '<header class="mh"><div class="mh-t">' + logo(m.h) + '<b>' + esc(tn(m.h)) + '</b></div><div class="mh-c"><span>' + esc(dayLabel(m.d)) + '</span><b>' + hm(m.d) + '</b><span>' + esc(c ? c.name : '') + '</span></div><div class="mh-t">' + logo(m.a) + '<b>' + esc(tn(m.a)) + '</b></div></header>';
    if (!S.tf) return h + '<div class="note">Analizzo lo storico della competizione…</div>' + skel(5);
    if (c && c.nat) h += '<div class="note">Nazionali: poche partite all\'anno, quindi stime più incerte rispetto ai campionati.</div>';
    h += heroHtml();
    h += '<nav class="tabs">' + [['top', 'Pronostici'], ['an', 'Analisi'], ['teams', 'Squadre'], ['players', 'Giocatori']].map(function (x) { return '<button class="' + (S.tab === x[0] ? 'on' : '') + '" data-tab="' + x[0] + '"><span>' + x[1] + '</span></button>'; }).join('') + '</nav>';
    h += S.tab === 'top' ? topHtml() : S.tab === 'an' ? anHtml() : S.tab === 'teams' ? teamsHtml() : playersHtml();
    return h;
  }

  // il pronostico principale della partita, con fiducia, rischio e analisi
  function heroHtml() {
    var ob = obOn(), has = ob && Core.bookOf(S.m), p = null;
    try { p = (has ? Core.occasions(S.m, S.tf, S.pf)[0] : null) || Core.picks(S.m, S.tf, S.pf, ob)[0] || null; } catch (e) { p = null; }
    if (!p) return '';
    var lines = [];
    try {
      if (p.kind === 'team') lines = Core.explainTeam(S.cd, S.m, S.tf, p.stat, p.side);
      else if (p.kind === 'res') lines = Core.explainRes(S.cd, S.m, S.tf);
      else { var f = findPF(p.pid); lines = f && S.pd ? Core.explainPlayer(S.m, S.tf, f, p.stat, S.pd.lu[p.team].src) : []; }
    } catch (e) { lines = []; }
    var fid = p.p >= 0.72 ? ['Alta', 'hit', 'Basso', 'hit'] : p.p >= 0.58 ? ['Media', 'okt', 'Medio', 'midt'] : ['Bassa', 'midt', 'Alto', 'midt'];
    return '<section class="hero"><div class="hero-p"><small>Pronostico</small><b>' + esc(p.label) + '</b><span>stima ' + pct(p.p) + (p.occ ? ' · occasione' : '') + '</span></div>' +
      '<div class="hero-k"><div><small>Fiducia</small><b class="' + fid[1] + '">' + fid[0] + '</b></div><div><small>Rischio</small><b class="' + fid[3] + '">' + fid[2] + '</b></div><div><small>' + (PLAY ? 'Probabilità' : p.odds ? 'Quota' : 'Quota giusta') + '</small><b>' + (PLAY ? pct(p.p) : p.odds ? q2(p.odds) : quota(p.p)) + '</b></div></div>' +
      (lines.length ? '<div class="hero-a"><h2>' + ic('spark') + 'Perché questa giocata</h2><ul>' + lines.slice(0, 5).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : '') +
      (S.tab !== 'an' ? '<button class="btn wide pri" data-tab="an">' + ic('chart') + 'Analisi completa della partita</button>' : '') + '</section>';
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
  function infoHtml() { return '<button class="back" data-nav="">' + ic('back') + 'Partite</button>' + $('#info-tpl').innerHTML; }

  // schermata di apertura: resta almeno 1,3 secondi, poi sfuma quando i dati sono pronti
  var T0 = Date.now();
  function hideSplash() {
    var s = document.getElementById('splash'); if (!s || hideSplash.done) return; hideSplash.done = true;
    setTimeout(function () { s.classList.add('out'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 600); }, Math.max(0, 1300 - (Date.now() - T0)));
  }
  setTimeout(hideSplash, 6000);
  function render() {
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
    var t = e.target.closest('[data-nav],[data-hv],[data-smode],[data-swhen],[data-sgoal],[data-sq],[data-sp],[data-scombo],[data-ssel],[data-stake],[data-scat],[data-sn],[data-smin],[data-comp],[data-act],[data-tab],[data-exp],[data-pfil],[data-pteam],[data-pst],[data-cyc]'); if (!t) return;
    var d = t.dataset;
    if ('nav' in d) { nav(d.nav); return; }
    if (d.hv) { S.hv = d.hv; if (cur() !== '') nav(''); else { window.scrollTo(0, 0); render(); } return; }
    if (d.scat) { S.slip.cats[d.scat] = S.slip.cats[d.scat] ? 0 : 1; S.slip.ban = {}; rerender(); return; }
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
  window.OverLabStart = route;
  if (!SNAP) route();
})();

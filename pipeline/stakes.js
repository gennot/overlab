// Posta in palio: dalla classifica (punti e zone: qualificazione, promozione, retrocessione) e dalle partite che restano,
// per ogni squadra cosa può ancora ottenere o perdere: già qualificata, già eliminata, deve vincere, le basta un pareggio,
// vincendo si assicura..., in corsa, niente in palio. Calcolo "matematico" classico: si guarda chi può ancora superare chi
// con i punti che restano (gli scontri diretti e la differenza reti non si considerano: in caso di parità vale il caso peggiore).
'use strict';

// verso della zona: 1 buona (qualificazione, promozione, turno successivo), -1 cattiva (retrocessione, eliminazione), 0 nessuna
function pol(desc) {
  const d = String(desc || '').toLowerCase();
  if (!d) return 0;
  if (/relegat|retroc|elimin|demot/.test(d)) return -1;
  if (/promot|qualif|champions|europa|conference|libertadores|sudamericana|next round|round of|knockout|quarter|semi|final|play.?off|world cup|euro|league phase|championship round|title|winner|cup/.test(d)) return 1;
  return 0;
}
// nome breve della zona, in italiano
function label(desc) {
  const d = String(desc || '').toLowerCase(), po = /play.?off/.test(d);
  if (/relegat|retroc/.test(d)) return po ? 'spareggio salvezza' : 'retrocessione';
  if (/elimin/.test(d)) return 'eliminazione';
  if (/champions league/.test(d)) return po ? 'playoff di Champions' : /round of 16|1\/8/.test(d) ? 'ottavi di Champions' : 'Champions League';
  if (/europa league/.test(d)) return po ? 'playoff di Europa League' : /round of 16|1\/8/.test(d) ? 'ottavi di Europa League' : 'Europa League';
  if (/conference league/.test(d)) return po ? 'playoff di Conference' : /round of 16|1\/8/.test(d) ? 'ottavi di Conference' : 'Conference League';
  if (/libertadores/.test(d)) return 'Libertadores';
  if (/sudamericana/.test(d)) return 'Sudamericana';
  if (/world cup/.test(d)) return po ? 'spareggi mondiali' : 'Mondiali';
  if (/euro|european championship/.test(d) && !/europa/.test(d)) return po ? 'spareggi europei' : 'Europei';
  if (/round of 16|1\/8|eighth/.test(d)) return 'ottavi';
  if (/quarter/.test(d)) return 'quarti';
  if (/semi/.test(d)) return 'semifinali';
  if (/promot/.test(d)) return po ? 'playoff promozione' : 'promozione';
  if (/championship round|title|champion/.test(d)) return 'poule scudetto';
  if (/play.?off/.test(d)) return 'playoff';
  if (/final/.test(d)) return 'fase finale';
  return 'turno successivo';
}
// zone della classifica: righe ordinate per posizione, ognuna con la sua descrizione (vuota = nessuna zona)
function zones(descs) {
  const z = [];
  descs.forEach((d, i) => {
    const k = String(d || ''), last = z[z.length - 1];
    if (last && last.k === k) last.to = i + 1; else z.push({ k: k, from: i + 1, to: i + 1, pol: pol(k), lab: k ? label(k) : '' });
  });
  // descrizioni sconosciute: in alto buone, in basso cattive
  const n = descs.length;
  z.forEach(x => { if (x.k && x.pol === 0) x.pol = x.from <= n / 2 ? 1 : -1; });
  return z;
}
const zoneAt = (z, r) => { for (let i = 0; i < z.length; i++) if (r >= z[i].from && r <= z[i].to) return i; return -1; };

// rows: [{t, pts}] della classifica; rem: { t: numero di partite che restano }; z: zone; h, a: squadre della partita
function analyse(rows, rem, z, h, a) {
  const pts = {}, R = {}; rows.forEach(x => { pts[x.t] = x.pts; R[x.t] = rem[x.t] || 0; });
  if (pts[h] == null || pts[a] == null) return null;
  const n = rows.length;
  // piazzamento migliore e peggiore possibile di T, con i punti di tutti in uno scenario (P: punti attuali, M: punti massimi)
  const range = (T, P, M) => {
    let best = 1, worst = 1;
    rows.forEach(x => { if (x.t === T) return; if (P[x.t] > M[T]) best++; if (M[x.t] >= P[T]) worst++; });
    return [best, Math.min(n, worst)];
  };
  const scen = (gh, ga) => {     // punti dopo questa partita (gh, ga: punti presi da casa e trasferta), poi tutto aperto
    const P = Object.assign({}, pts), M = {};
    if (gh != null) { P[h] += gh; P[a] += ga; }
    rows.forEach(x => { const r = R[x.t] - ((gh != null && (x.t === h || x.t === a)) ? 1 : 0); M[x.t] = P[x.t] + 3 * Math.max(0, r); });
    return { P: P, M: M };
  };
  const now = scen(null), W = scen(3, 0), D = scen(1, 1), L = scen(0, 3);
  const one = (T, win, draw, lose) => {
    const r0 = range(T, now.P, now.M), zb = zoneAt(z, r0[0]), zw = zoneAt(z, r0[1]);
    const Z = i => i >= 0 ? z[i] : { pol: 0, lab: '' };
    const out = { pos: rows.findIndex(x => x.t === T) + 1, pts: pts[T], rem: R[T], best: r0[0], worst: r0[1] };
    if (!R[T]) { out.code = 'end'; return out; }
    if (zb === zw) {
      const q = Z(zb); out.code = q.pol > 0 ? 'ok' : q.pol < 0 ? 'out' : 'none';
      out.txt = q.pol > 0 ? (q.lab === 'promozione' ? 'Già promossa' : 'Già qualificata: ' + q.lab) : q.pol < 0 ? (q.lab === 'retrocessione' ? 'Già retrocessa' : q.lab === 'spareggio salvezza' ? 'Già condannata allo spareggio salvezza' : 'Già eliminata') : 'Niente in palio: posizione già decisa';
      return out;
    }
    const good = Z(zb).pol > 0 ? Z(zb) : null, bad = Z(zw).pol < 0 ? Z(zw) : null;
    const rd = range(T, draw.P, draw.M), rw = range(T, win.P, win.M);
    const zbD = zoneAt(z, rd[0]), zwD = zoneAt(z, rd[1]), zwW = zoneAt(z, rw[1]);
    // deve vincere: col pareggio il traguardo migliore non è più raggiungibile
    if (good && zbD !== zb) { out.code = 'win'; out.txt = 'Deve vincere per sperare: ' + good.lab; return out; }
    if (bad && Z(zbD).pol < 0 && Z(zoneAt(z, rw[0])).pol >= 0) { out.code = 'win'; out.txt = 'Deve vincere per evitare: ' + bad.lab; return out; }
    // le basta un pareggio / vincendo si assicura
    if (zwD !== zw && Z(zwD).pol > 0) { out.code = 'draw'; out.txt = 'Le basta un pareggio: ' + Z(zwD).lab; return out; }
    if (bad && zwD !== zw && Z(zwD).pol >= 0) { out.code = 'draw'; out.txt = bad.lab === 'retrocessione' ? 'Le basta un pareggio per salvarsi' : 'Le basta un pareggio per evitare: ' + bad.lab; return out; }
    if (zwW !== zw && Z(zwW).pol > 0) { out.code = 'clinch'; out.txt = 'Vincendo si assicura: ' + Z(zwW).lab; return out; }
    if (bad && zwW !== zw && Z(zwW).pol >= 0) { out.code = 'clinch'; out.txt = bad.lab === 'retrocessione' ? 'Vincendo si salva' : 'Vincendo evita: ' + bad.lab; return out; }
    out.code = 'race';
    if (R[T] <= 6 || (r0[1] - r0[0] < n - 1)) out.txt = good && bad ? 'In corsa per: ' + good.lab + ' · deve evitare: ' + bad.lab : good ? 'In corsa per: ' + good.lab : bad ? 'Lotta per evitare: ' + bad.lab : '';
    return out;
  };
  return { h: one(h, W, D, L), a: one(a, { P: L.P, M: L.M }, D, W) };
}
// livello di motivazione per il modello: D già deciso (niente in palio), W deve vincere, L in corsa, '' nessuna informazione
function level(x) { if (!x) return ''; return x.code === 'ok' || x.code === 'out' || x.code === 'none' ? 'D' : x.code === 'win' ? 'W' : x.code === 'end' ? '' : 'L'; }

module.exports = { pol, label, zones, analyse, level };

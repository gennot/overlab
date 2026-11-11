// Competizioni trovate da sole: a ogni giro il calendario del giorno (tutte le partite del mondo) dice quali competizioni giocano;
// quelle che non sono nell'elenco fisso (leagues.js) si aggiungono qui da sole, con i soli risultati (esito e gol).
'use strict';
const DAY = 864e5;
// escluse: amichevoli tra club, giovanili dei club e squadre riserve. Le nazionali giovanili (Under 17, 19, 20, 21...) restano.
const EXCL = /friendlies clubs|club friendl|youth|junior|juvenil|reserve|primavera|\bU-?1[0-9]\b|\bU-?2[0-3]\b|premier league 2|premier league (international )?cup|professional development|development league|elite development/i;
const YOUTH_NAT = /\bU-?(1[5-9]|2[0-3])\b/i, CLUB_YOUTH = /youth league|club|futures|next gen|academy/i;
const excluded = (name, country) => {
  name = name || '';
  if (!EXCL.test(name)) return false;
  return !(country === 'World' && YOUTH_NAT.test(name) && !CLUB_YOUTH.test(name));   // nazionale giovanile: si tiene
};
// nazionali (non club): si stimano tutte insieme, perché le stesse squadre giocano qualificazioni, tornei e amichevoli
const NAT = /friendl|world cup|nations league|qualif|\beuro\b|euro championship|copa am[eé]rica|asian cup|africa cup|african nations|gold cup|olymp|arab cup|gulf cup|concacaf nations|nations cup/i;
const NOT_NAT = /club|champions league|champions cup|libertadores|sudamericana|confederation cup|cup winners|recopa|league cup/i;
const isNat = (name, country) => country === 'World' && NAT.test(name || '') && !NOT_NAT.test(name || '');
// nazione -> sigla dei campionati già seguiti (per le coppe nazionali: la categoria di ogni squadra)
const PREFIX = { Italy: 'ita', England: 'eng', Spain: 'esp', Germany: 'ger', France: 'fra', Netherlands: 'ned', Portugal: 'por', Belgium: 'bel', Turkey: 'tur', Scotland: 'sco', Switzerland: 'sui', Austria: 'aut', Denmark: 'den', Norway: 'nor', Sweden: 'swe', Poland: 'pol', 'Czech-Republic': 'cze', Croatia: 'cro', Serbia: 'srb', Romania: 'rou', Greece: 'gre', Brazil: 'bra', Argentina: 'arg', USA: 'usa', Mexico: 'mex', Colombia: 'col', Chile: 'chi', Uruguay: 'uru', Paraguay: 'par', Ecuador: 'ecu', Peru: 'per', Bolivia: 'bol', Venezuela: 'ven', Canada: 'can', 'Costa-Rica': 'crc', Guatemala: 'gua', Honduras: 'hon', 'El-Salvador': 'slv' };
// nomi delle nazioni in italiano (gli stessi dei gruppi dell'app per quelle già seguite)
const IT = { Italy: 'Italia', England: 'Inghilterra', Spain: 'Spagna', Germany: 'Germania', France: 'Francia', Netherlands: 'Olanda', Portugal: 'Portogallo', Belgium: 'Belgio', Turkey: 'Turchia', Scotland: 'Scozia', Switzerland: 'Svizzera', Austria: 'Austria', Denmark: 'Danimarca', Norway: 'Norvegia', Sweden: 'Svezia', Poland: 'Polonia', 'Czech-Republic': 'Rep. Ceca', Croatia: 'Croazia', Serbia: 'Serbia', Romania: 'Romania', Greece: 'Grecia', Brazil: 'Brasile', Argentina: 'Argentina', USA: 'Stati Uniti', Mexico: 'Messico', Colombia: 'Colombia', Chile: 'Cile', Uruguay: 'Uruguay', Paraguay: 'Paraguay', Ecuador: 'Ecuador', Peru: 'Perù', Bolivia: 'Bolivia', Venezuela: 'Venezuela', Canada: 'Canada', 'Costa-Rica': 'Costa Rica', Guatemala: 'Guatemala', Honduras: 'Honduras', 'El-Salvador': 'El Salvador',
  Wales: 'Galles', 'Northern-Ireland': 'Irlanda del Nord', Ireland: 'Irlanda', Iceland: 'Islanda', Finland: 'Finlandia', Estonia: 'Estonia', Latvia: 'Lettonia', Lithuania: 'Lituania', Belarus: 'Bielorussia', Ukraine: 'Ucraina', Russia: 'Russia', Moldova: 'Moldavia', Hungary: 'Ungheria', Slovakia: 'Slovacchia', Slovenia: 'Slovenia', 'Bosnia': 'Bosnia', Montenegro: 'Montenegro', 'North-Macedonia': 'Macedonia del Nord', Albania: 'Albania', Kosovo: 'Kosovo', Bulgaria: 'Bulgaria', Cyprus: 'Cipro', Malta: 'Malta', Luxembourg: 'Lussemburgo', Georgia: 'Georgia', Armenia: 'Armenia', Azerbaijan: 'Azerbaigian', Kazakhstan: 'Kazakistan', Israel: 'Israele', 'Faroe-Islands': 'Isole Faroe', Andorra: 'Andorra', 'San-Marino': 'San Marino', Gibraltar: 'Gibilterra', Liechtenstein: 'Liechtenstein',
  Japan: 'Giappone', 'South-Korea': 'Corea del Sud', China: 'Cina', Australia: 'Australia', 'Saudi-Arabia': 'Arabia Saudita', Qatar: 'Qatar', 'United-Arab-Emirates': 'Emirati Arabi', Iran: 'Iran', Iraq: 'Iraq', Jordan: 'Giordania', Kuwait: 'Kuwait', Bahrain: 'Bahrein', Oman: 'Oman', India: 'India', Indonesia: 'Indonesia', Thailand: 'Thailandia', Vietnam: 'Vietnam', Malaysia: 'Malesia', Singapore: 'Singapore', Uzbekistan: 'Uzbekistan', 'Hong-Kong': 'Hong Kong', Egypt: 'Egitto', Morocco: 'Marocco', Algeria: 'Algeria', Tunisia: 'Tunisia', 'South-Africa': 'Sudafrica', Nigeria: 'Nigeria', Ghana: 'Ghana', Senegal: 'Senegal', Cameroon: 'Camerun', 'Ivory-Coast': "Costa d'Avorio", Kenya: 'Kenya', Tanzania: 'Tanzania', Zambia: 'Zambia', Angola: 'Angola', Ethiopia: 'Etiopia', Uganda: 'Uganda', Panama: 'Panama', Jamaica: 'Giamaica', Nicaragua: 'Nicaragua', 'Dominican-Republic': 'Rep. Dominicana', 'New-Zealand': 'Nuova Zelanda', World: 'Internazionali' };
const itCountry = c => IT[c] || String(c || '').replace(/-/g, ' ');
const NAME_IT = { Friendlies: 'Amichevoli nazionali', 'Friendlies Women': 'Amichevoli nazionali femminili' };
const KNOWN_NAT_NAMES = { 'fifa.friendly': 'Amichevoli nazionali', 'fifa.world': 'Mondiali', 'fifa.worldq.uefa': 'Qualificazioni Mondiali (Europa)' };

// definizione per il raccoglitore (collect.js) e l'esportazione
function leagues(state) {
  return Object.values((state && state.auto) || {}).map(a => ({ lg: 'auto.' + a.id, id: a.id, type: 'auto', seasons: [a.season - 1, a.season], nostat: true, auto: true, name: a.name, country: a.country, cup: !!a.cup, nat: !!a.nat }));
}
// competizioni da mostrare nell'app: quelle con partite nei prossimi 10 giorni o giocate negli ultimi 2
function comps(state, fxBy, LEAGUES, COMPS, now) {
  const DONE = { FT: 1, AET: 1, PEN: 1 };
  const live = lg => (fxBy[lg] || []).some(m => (m.d > now - 3 * 36e5 && m.d < now + 10 * DAY) || (DONE[m.s] && m.d > now - 2 * DAY));
  const shown = {}; COMPS.forEach(c => { shown[c.id] = 1; });
  const AUTO = leagues(state), out = [];
  // nazionali: un solo gruppo con tutti i tornei e le amichevoli (anche quelli dell'elenco fisso senza una voce nell'app)
  const natPool = LEAGUES.filter(l => l.type === 'int').map(l => l.lg).concat(AUTO.filter(a => a.nat).map(a => a.lg));
  LEAGUES.filter(l => l.type === 'int' && !shown[l.lg] && live(l.lg)).forEach(l => out.push({ id: l.lg, name: KNOWN_NAT_NAMES[l.lg] || l.lg, grp: 'Nazionali', nat: 1, cup: 1, gres: 1, cf: 'naz-x', pool: natPool, xpool: [], auto: 1 }));
  AUTO.forEach(a => {
    if (!live(a.lg)) return;
    const nm = NAME_IT[a.name] || a.name;
    if (a.nat) { out.push({ id: a.lg, name: nm, grp: /\bU-?(1[5-9]|2[0-3])\b/i.test(a.name) ? 'Nazionali giovanili' : 'Nazionali', nat: 1, cup: 1, gres: 1, cf: 'naz-x', pool: natPool, xpool: [], auto: 1 }); return; }
    const grp = a.country === 'World' ? 'Coppe internazionali' : itCountry(a.country), title = a.country === 'World' ? nm : nm + ' (' + itCountry(a.country) + ')';
    if (a.cup && a.country !== 'World') {
      // coppa nazionale: insieme ai campionati della stessa nazione, con la categoria di ogni squadra
      const pre = PREFIX[a.country], known = pre ? LEAGUES.filter(l => new RegExp('^' + pre + '\\.[1-9]$').test(l.lg)).map(l => l.lg) : [];
      const tiers = {}; known.forEach(lg => { tiers[lg] = +lg.split('.')[1]; });
      const others = AUTO.filter(o => o.country === a.country && !o.cup && !o.nat).map(o => o.lg);
      const tx = known.length ? Math.max.apply(null, known.map(lg => tiers[lg])) + 1 : 1;
      out.push({ id: a.lg, name: title, grp: grp, cup: 1, gres: 1, cf: 'cx-' + a.id, pool: [a.lg], xpool: known.concat(others), tiers: known.length ? tiers : null, tx: tx, auto: 1 });
      return;
    }
    if (a.cup) { out.push({ id: a.lg, name: title, grp: grp, cup: 1, gres: 1, cf: 'cx-' + a.id, pool: [a.lg], xpool: [], auto: 1 }); return; }
    out.push({ id: a.lg, name: title, grp: grp, gres: 1, pool: [a.lg], auto: 1 });
  });
  return out;
}
module.exports = { excluded, isNat, leagues, comps, itCountry };

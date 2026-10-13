# Costruisce la versione per il Play Store (sito installabile) in site/:
# index.html, manifest, service worker, icone, privacy. I dati (data.json, c-*.json) li scrive export.js.
import os, re, json, struct, zlib, math
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
APP, OUT = os.path.join(ROOT, 'app'), os.path.join(ROOT, 'site')
os.makedirs(OUT, exist_ok=True)
rd = lambda f: open(os.path.join(APP, f), encoding='utf-8').read()
src = rd('index.src.html')

def rep(s, a, b):
    assert s.count(a) == 1, (a[:60], s.count(a)); return s.replace(a, b)

head = src[src.index('<head>') + 6:src.index('<style>')]
head = re.sub(r'<link rel="(apple-touch-icon|icon)"[^>]*>\n?', '', head)
head = re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts\.(googleapis|gstatic)\.com[^>]*>\n?', '', head)
head += '<link rel="stylesheet" href="fonts/fonts.css">\n'
head += '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n'
css = src[src.index('<style>'):src.index('</style>') + 8]
css = css.replace('.bnav-in{max-width:680px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr)}', '.bnav-in{max-width:680px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr)}')
body = src[src.index('<body>') + 6:src.index('<script>')]
# niente quote e niente schedina: restano Partite e Info
body = re.sub(r'<button data-hv="sure">.*?</button>\n', '', body, flags=re.S)
body = re.sub(r'<button data-hv="slip">.*?</button>\n', '', body, flags=re.S)
# avvertenze sempre visibili in fondo a ogni pagina (gioco responsabile, ADM, nessuna scommessa)
LEGAL = ('\n<footer class="legal" role="contentinfo">'
  '<div class="legal-b"><span class="l18">18+</span><b>Gioca responsabile</b><a href="tel:800558822">Telefono Verde 800 558 822</a></div>'
  '<p class="legal-w"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2"/><circle cx="12" cy="16.8" r=".6" fill="currentColor" stroke="none"/></svg>'
  '<span>OverLab non è un bookmaker e non accetta scommesse. Statistiche e probabilità a solo scopo informativo. Consulta le probabilità di vincita sul sito <a href="https://www.adm.gov.it" rel="noopener">www.adm.gov.it</a>. Vietato ai minori di 18 anni.</span></p>'
  '<p class="legal-l"><a href="privacy.html">Privacy</a> · <a href="termini.html">Termini d&#39;uso</a> · Dati: API-Football</p></footer>\n')
CSS_LEGAL = ('.wrap{padding-bottom:18px}'
  '.legal{max-width:680px;margin:0 auto;padding:6px 16px calc(100px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px}'
  '.legal-b{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);font-size:14px}'
  '.legal-b b{font-weight:600}.legal-b a{color:var(--muted);text-decoration:none;flex-basis:100%}'
  '.l18{display:inline-grid;place-items:center;min-width:30px;height:24px;padding:0 6px;border-radius:999px;background:#c62828;color:#fff;font:800 12px/1 var(--num)}'
  '.legal-w{display:flex;gap:8px;margin:0;font-size:13px;line-height:1.5;color:var(--muted)}.legal-w .ic{flex:none;width:18px;height:18px;color:var(--gold);margin-top:1px}'
  '.legal-w a,.legal-l a{color:var(--accent-ink)}.legal-l{margin:0;font-size:13px;color:var(--muted)}')
css = css.replace('</style>', CSS_LEGAL + '</style>')
body = rep(body, '<main class="wrap" id="app"></main>', '<main class="wrap" id="app"><div class="note">Carico i dati…</div></main>' + LEGAL)
INFO = '''<template id="info-tpl">
<div class="info">
<p>Dati aggiornati in automatico più volte al giorno: la data dell'ultimo aggiornamento è in fondo alla lista delle partite.</p>
<h2>Cosa fa</h2>
<p>Per ogni partita stima quante volte succede una cosa (gol, tiri, tiri in porta, corner, falli, cartellini gialli) e la trasforma in probabilità: risultato, gol, linee per squadre e singoli giocatori, con un'analisi completa della partita.</p>
<h2>Cosa guarda</h2>
<ul>
<li>Quanto produce la squadra e quanto concede l'avversaria, tenendo conto di chi hanno affrontato.</li>
<li>Stato di forma: le partite recenti pesano di più delle vecchie.</li>
<li>Casa o trasferta, con la media del campionato come riferimento.</li>
<li>Per i giocatori: che parte dei tiri e dei falli della squadra passa da lui quando è in campo, e quanti minuti dovrebbe giocare.</li>
<li>Formazioni: quelle ufficiali quando escono, altrimenti quelle probabili stimate dalle ultime partite.</li>
</ul>
<h2>Quanto è affidabile</h2>
<p>Il metodo è stato provato su decine di migliaia di partite passate, usando ogni volta solo i dati precedenti: quando dice circa 70% l'evento è successo circa 70 volte su 100, quando dice circa 87% circa 87 volte su 100. Sono probabilità, non certezze: un 70% vuol dire che 3 volte su 10 non succede.</p>
<h2>Cosa non fa</h2>
<ul>
<li>Non tiene conto di infortuni e squalifiche se non sono già nelle formazioni.</li>
<li>Nei campionati con pochi dati le stime sono più incerte.</li>
</ul>
<h2>Avvertenze</h2>
<p>OverLab offre statistiche e probabilità a scopo informativo. Non è un bookmaker, non accetta scommesse e non ha legami con operatori di gioco. Vietato ai minori di 18 anni. Se giochi, fallo in modo responsabile: per aiuto c'è il Telefono Verde nazionale per i problemi legati al gioco d'azzardo, 800 558 822.</p>
<p>Dati delle partite: API-Football. <a href="privacy.html">Privacy</a> · <a href="termini.html">Termini d'uso</a></p>
</div>
</template>
'''
body = re.sub(r'<template id="info-tpl">.*?</template>\n', INFO, body, flags=re.S)
js = lambda f: rd(f)
boot1 = 'window.OVERLAB_SNAPSHOT = true;\nwindow.OVERLAB_PLAY = true;\n'
boot2 = '''Core.store.noLocal = true;
Core.setFetch(function () { return Promise.reject(new Error('offline')); });
window.OverLabReload = function () {
  return fetch('data.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { Core.store.preload(d.mem); window.OVERLAB_T = d.t; window.OVERLAB_LOGOS = d.logos || {}; Core.setBook(null); CL = {}; });
};
var CL = {};
function getJ(f) { return fetch(f, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
// campionati in forma compatta (solo partite giocate) usati dalle coppe: non sostituiscono i dati completi già caricati
function expandX(mem) {
  var out = {};
  Object.keys(mem).forEach(function (k) {
    if (k.indexOf('sx:') !== 0) { out[k] = mem[k]; return; }
    var lg = k.split(':')[1], key = 'sb:' + k.slice(3), x = mem[k];
    if (Core.store.get(key)) return;
    out[key] = { t: x.t, tm: x.tm, m: x.r.map(function (r) { return { id: r[0], d: r[1] * 6e4, lg: lg, h: r[2], a: r[3], st: 'post', done: true, nm: 'FT', sc: [r[4], r[5]], H: { sh: r[6], sot: r[7], co: r[8], fo: r[9], yc: r[10] }, A: { sh: r[11], sot: r[12], co: r[13], fo: r[14], yc: r[15] } }; }) };
  });
  return out;
}
Core.setCompLoader(function (id) {
  var c = Core.comp(id), files = c && c.cup ? ['c-coppe.json', 'c-' + id + '.json'] : ['c-' + id + '.json'];
  return Promise.all(files.map(function (f) {
    return CL[f] || (CL[f] = getJ(f).then(function (d) { Core.store.preload(expandX(d.mem)); }).catch(function (e) { delete CL[f]; throw e; }));
  }));
});
'''
boot3 = '''window.OverLabReload().then(window.OverLabStart, function () {
  document.getElementById('app').innerHTML = '<div class="note err">Non riesco a caricare i dati. Controlla la connessione e riapri l\\'app.</div>';
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
'''
html = ('<!doctype html>\n<html lang="it">\n<head>\n' + head + css + '\n</head>\n<body>\n' + body + '<script>\n' + boot1 + js('model.js') + '\n' + js('core.js') + '\n' + boot2 + js('ui.js') + '\n' + boot3 + '</script>\n</body>\n</html>\n')
html = html.replace('<title>OverLab</title>', '<title>OverLab</title>')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

manifest = {"name": "OverLab", "short_name": "OverLab", "description": "Statistiche e probabilità delle partite di calcio", "lang": "it", "start_url": "./", "scope": "./",
            "display": "standalone", "orientation": "portrait", "background_color": "#111214", "theme_color": "#111214",
            "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                      {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
json.dump(manifest, open(os.path.join(OUT, 'manifest.webmanifest'), 'w'), ensure_ascii=False, indent=1)

SW = '''// cache dell'app per aprirla anche senza rete; i dati si prendono sempre freschi quando c'è connessione
var C = 'overlab-v1', SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(C).then(function (c) { return c.addAll(SHELL); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== C; }).map(function (x) { return caches.delete(x); })); })); self.clients.claim(); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request); }));
});
'''
open(os.path.join(OUT, 'sw.js'), 'w').write(SW)

# ---------- pagine legali ----------
TITOLARE = 'Gennaro Notaro'
EMAIL = os.environ.get('OVERLAB_EMAIL', 'offesia@gmail.com')   # indirizzo di contatto pubblico
AGG = '14 ottobre 2026'
def page(title, body):
    return ('<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' · OverLab</title>'
            '<link rel="stylesheet" href="fonts/fonts.css"><style>body{margin:0;background:#111214;color:#e9ecee;font:16px/1.65 "Public Sans",system-ui,sans-serif}'
            'main{max-width:720px;margin:0 auto;padding:28px 16px 48px}h1{font:800 30px/1.1 "Saira Condensed",sans-serif;letter-spacing:.02em;text-transform:uppercase;margin:0 0 6px}'
            'h2{font:700 20px/1.2 "Saira Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase;margin:28px 0 6px;color:#fff}p,li{color:#c9cdd1}a{color:#52e3a0}small{color:#8a9096}'
            'nav{display:flex;gap:16px;margin-bottom:22px;font-weight:600}</style></head><body><main><nav><a href="./">← OverLab</a><a href="privacy.html">Privacy</a><a href="termini.html">Termini</a></nav>'
            + body + '<p><small>Ultimo aggiornamento: ' + AGG + '</small></p></main></body></html>\n')
MAIL = ('<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>') if EMAIL else 'indirizzo in pubblicazione a breve'
PRIV = page('Privacy', f"""<h1>Informativa privacy</h1>
<p>Questa pagina spiega quali dati vengono trattati quando usi OverLab (sito e app), come previsto dal Regolamento UE 2016/679 (GDPR).</p>
<h2>Titolare del trattamento</h2>
<p>{TITOLARE} – email: {MAIL}</p>
<h2>In breve</h2>
<ul><li>Non serve registrarsi e non ci sono account.</li><li>Nessuna pubblicità, nessuno strumento di statistica sui visitatori, nessuna profilazione.</li><li>Nessun cookie di terze parti. Caratteri e stemmi delle squadre sono ospitati sul sito stesso: il tuo browser non contatta altri servizi.</li></ul>
<h2>Dati di navigazione (hosting)</h2>
<p>Il sito è ospitato su GitHub Pages, servizio di GitHub, Inc. (Stati Uniti). Quando apri una pagina, il server riceve i dati tecnici che ogni browser invia, come indirizzo IP, tipo di browser, data e ora della richiesta. Servono solo a consegnarti le pagine e a proteggere il servizio da abusi; il titolare non li riceve e non li usa. Base giuridica: legittimo interesse a far funzionare il sito in modo sicuro (art. 6.1.f GDPR). GitHub tratta questi dati come fornitore di hosting e li trasferisce negli Stati Uniti con le garanzie previste dal GDPR (Data Privacy Framework UE-USA e clausole contrattuali standard): vedi l'<a href="https://docs.github.com/it/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">informativa di GitHub</a>.</p>
<h2>Dati salvati sul tuo dispositivo</h2>
<p>OverLab salva sul tuo telefono o computer, nella memoria del browser, solo le tue preferenze (per esempio le squadre che segui) e una copia dei file dell'app per aprirla anche senza rete. Questi dati restano sul tuo dispositivo, non vengono inviati a nessuno e puoi cancellarli in qualsiasi momento dalle impostazioni del browser. Sono strumenti tecnici necessari al funzionamento e non richiedono consenso (art. 122 del Codice privacy e Linee guida del Garante sui cookie).</p>
<h2>Se ci scrivi</h2>
<p>Se mandi un'email, il tuo indirizzo e il messaggio vengono usati solo per risponderti e conservati per il tempo necessario, al massimo 12 mesi. Base giuridica: la tua richiesta (art. 6.1.b GDPR).</p>
<h2>I tuoi diritti</h2>
<p>Puoi chiedere in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso, opporti al trattamento o riceverli in un formato leggibile (artt. 15-22 GDPR), scrivendo a {MAIL}. Puoi anche presentare reclamo al <a href="https://www.garanteprivacy.it" rel="noopener">Garante per la protezione dei dati personali</a>.</p>
<h2>Minori</h2>
<p>OverLab è vietato ai minori di 18 anni e non raccoglie consapevolmente dati di minori.</p>
<h2>Modifiche</h2>
<p>Se questa informativa cambia, la nuova versione viene pubblicata qui con la data di aggiornamento.</p>""")
TERM = page('Termini', f"""<h1>Termini d'uso e note legali</h1>
<h2>Chi gestisce OverLab</h2>
<p>OverLab è gestito da {TITOLARE}, persona fisica. Contatti: {MAIL}</p>
<h2>Cosa offre</h2>
<p>OverLab mostra statistiche e stime di probabilità sulle partite di calcio, calcolate in automatico da un modello statistico, a scopo informativo e di intrattenimento. L'uso è gratuito.</p>
<h2>Non è un servizio di scommesse</h2>
<p>OverLab non è un bookmaker, non accetta scommesse, non ha legami commerciali con operatori di gioco e non promuove il gioco con vincite in denaro. Le percentuali non sono consigli né inviti a giocare.</p>
<h2>Nessuna garanzia</h2>
<p>Le stime sono probabilità, non certezze: un evento stimato al 70% non succede circa 3 volte su 10. I dati provengono da fonti esterne e possono contenere errori, ritardi o mancanze. Nei limiti consentiti dalla legge, il gestore non risponde di decisioni prese sulla base delle informazioni del sito o di danni derivanti dal suo uso o dalla sua interruzione.</p>
<h2>Vietato ai minori di 18 anni</h2>
<p>Il servizio è riservato ai maggiorenni.</p>
<h2>Gioco responsabile</h2>
<p>Il gioco può causare dipendenza. Se scegli di giocare, fallo solo con operatori autorizzati dall'Agenzia delle Dogane e dei Monopoli e con somme che puoi permetterti di perdere. Per aiuto: Telefono Verde Nazionale per le problematiche legate al gioco d'azzardo dell'Istituto Superiore di Sanità, <a href="tel:800558822">800 558 822</a>, gratuito e anonimo.</p>
<h2>Dati, nomi e marchi</h2>
<p>Dati delle partite forniti da API-Football (API-Sports). Nomi, loghi e marchi di squadre, campionati e competizioni appartengono ai rispettivi titolari e sono usati solo per identificare le partite. OverLab non è affiliato, sponsorizzato o approvato da UEFA, leghe, federazioni o club.</p>
<h2>Contenuti di OverLab</h2>
<p>Testi, grafica, codice e modello di OverLab appartengono al gestore. I caratteri Public Sans e Saira sono usati secondo la licenza SIL Open Font License 1.1.</p>
<h2>Modifiche e disponibilità</h2>
<p>Il servizio e questi termini possono cambiare o essere sospesi in qualsiasi momento; la versione aggiornata è sempre su questa pagina.</p>
<h2>Legge applicabile</h2>
<p>Si applica la legge italiana. Restano salvi i diritti che la legge riconosce ai consumatori, compreso il foro del luogo di residenza.</p>""")
open(os.path.join(OUT, 'termini.html'), 'w', encoding='utf-8').write(TERM)
# font locali
import shutil
FD = os.path.join(ROOT, 'pipeline', 'fonts'); os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
css = []
for fam, name, ws in [('public-sans', 'Public Sans', (400, 500, 600, 700)), ('saira-condensed', 'Saira Condensed', (600, 700, 800)), ('saira-semi-condensed', 'Saira Semi Condensed', (600, 700))]:
    for w in ws:
        for sub, rng in (('latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'), ('latin-ext', 'U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF')):
            fn = '%s-%s-%d-normal.woff2' % (fam, sub, w); shutil.copy(os.path.join(FD, fn), os.path.join(OUT, 'fonts', fn))
            css.append("@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:%d;src:url(%s) format('woff2');unicode-range:%s}" % (name, w, fn, rng))
open(os.path.join(OUT, 'fonts', 'fonts.css'), 'w').write('\n'.join(css) + '\n')
open(os.path.join(OUT, 'privacy.html'), 'w', encoding='utf-8').write(PRIV)
open(os.path.join(OUT, '.nojekyll'), 'w').write('')

# icone PNG disegnate a mano (senza librerie): quadrato con sfumatura verde-azzurro, tre barre e un pallone
def png(path, S, pad=0.0):
    g1, g2, ink = (0x2f, 0xd4, 0x7f), (0x16, 0xb5, 0xc6), (0x04, 0x23, 0x1a)
    def inside_round(x, y, x0, y0, x1, y1, r):
        if x < x0 or x > x1 or y < y0 or y > y1: return False
        cx = min(max(x, x0 + r), x1 - r); cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    k = S / 32.0 * (1 - 2 * pad); off = S * pad
    bars = [(5.5, 19, 4.4, 7.5, 0.6), (11.8, 15, 4.4, 11.5, 0.8), (18.1, 11, 4.4, 15.5, 1.0)]
    rows = []
    for yy in range(S):
        row = bytearray([0])
        for xx in range(S):
            x, y = (xx + 0.5 - off) / k, (yy + 0.5 - off) / k
            full = pad > 0
            if not full and not inside_round(x, y, 0, 0, 32, 32, 9):
                row += bytes([0, 0, 0, 0]); continue
            t = max(0.0, min(1.0, (x + y) / 64.0))
            c = [round(g1[i] + (g2[i] - g1[i]) * t) for i in range(3)]
            a = 1.0
            for bx, by, bw, bh, op in bars:
                if inside_round(x, y, bx, by, bx + bw, by + bh, 1.4): a = op; c = [round(c[i] * (1 - op) + ink[i] * op) for i in range(3)]
            if (x - 24.6) ** 2 + (y - 7.6) ** 2 <= 3.9 ** 2: c = list(ink)
            row += bytes(c + [255])
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', S, S, 8, 6, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)
png(os.path.join(OUT, 'icon-192.png'), 192)
png(os.path.join(OUT, 'icon-512.png'), 512)
png(os.path.join(OUT, 'icon-maskable-512.png'), 512, pad=0.1)
print('sito pronto in site/:', sorted(os.listdir(OUT))[:12])

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
head += '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n'
css = src[src.index('<style>'):src.index('</style>') + 8]
css = css.replace('.bnav-in{max-width:680px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr)}', '.bnav-in{max-width:680px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr)}')
body = src[src.index('<body>') + 6:src.index('<script>')]
# niente quote e niente schedina: restano Partite e Info
body = re.sub(r'<button data-hv="sure">.*?</button>\n', '', body, flags=re.S)
body = re.sub(r'<button data-hv="slip">.*?</button>\n', '', body, flags=re.S)
body = rep(body, '<main class="wrap" id="app"></main>', '<main class="wrap" id="app"><div class="note">Carico i dati…</div></main>')
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
<p>Dati delle partite: API-Football. <a href="privacy.html">Privacy</a></p>
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

PRIV = '''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OverLab: privacy</title>
<style>body{margin:0;background:#111214;color:#f2f4f5;font:16px/1.6 system-ui,sans-serif}main{max-width:680px;margin:0 auto;padding:24px 16px}h1{font-size:24px}a{color:#52e3a0}</style></head>
<body><main><h1>Privacy di OverLab</h1>
<p>OverLab non chiede registrazioni, non raccoglie dati personali, non usa pubblicità e non traccia chi la usa.</p>
<p>L'app scarica solo i file con le statistiche delle partite. Le preferenze (per esempio i campionati scelti) restano sul telefono e non vengono inviate a nessuno.</p>
<p>I dati delle partite provengono da API-Football. Per contatti usa l'indirizzo email indicato nella pagina dell'app sul Google Play Store.</p>
<p><a href="./">Torna all'app</a></p></main></body></html>
'''
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

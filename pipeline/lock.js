// Accesso VIP: se è impostato il codice (segreto OVERLAB_VIP su GitHub) i dati del sito vengono compressi e cifrati
// (AES-256-GCM, chiave PBKDF2 dal codice). Senza il codice giusto il sito mostra solo la schermata "Sblocca VIP".
// Il codice non finisce mai nei file pubblicati.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const code = (process.env.OVERLAB_VIP || '').trim();
if (!code) { console.log('accesso VIP non attivo: sito aperto a tutti'); process.exit(0); }
const V = require('./vip.json'), OUT = path.join(__dirname, '..', 'site');
const key = crypto.pbkdf2Sync(code, Buffer.from(V.salt, 'hex'), V.it, 32, 'sha256');
let n = 0, tot = 0;
fs.readdirSync(OUT).filter(f => f === 'data.json' || /^c-.*\.json$/.test(f)).forEach(f => {
  const p = path.join(OUT, f), plain = zlib.deflateRawSync(fs.readFileSync(p), { level: 9 });
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const buf = Buffer.concat([iv, c.update(plain), c.final(), c.getAuthTag()]);
  fs.writeFileSync(p, buf); n++; tot += buf.length;
});
console.log('accesso VIP attivo: ' + n + ' file cifrati, ' + Math.round(tot / 1e5) / 10 + ' MB');

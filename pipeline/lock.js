// Accesso riservato. Se in pipeline/accesso.json "chiuso" è true (o c'è il segreto OVERLAB_VIP) i dati del sito vengono
// compressi e cifrati con una chiave casuale nuova a ogni giro. La chiave si consegna solo:
//  - ai dispositivi autorizzati (chiave pubblica ECDH P-256 generata sul telefono in overlabcalcio.it/#attiva):
//    nel repository c'è solo la parte pubblica, quella segreta non lascia mai il dispositivo;
//  - a chi conosce il codice VIP (segreto OVERLAB_VIP su GitHub), se impostato.
// Senza una delle due il sito mostra solo la pagina "offline" (o "Sblocca VIP" se c'è il codice).
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const A = require('./accesso.json'), V = require('./vip.json'), OUT = path.join(__dirname, '..', 'site');
const code = (process.env.OVERLAB_VIP || '').trim();
if (!A.chiuso && !code) { console.log('::notice::sito aperto a tutti'); process.exit(0); }
const dk = crypto.randomBytes(32);
const seal = (key, data) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv); return { iv, ct: Buffer.concat([c.update(data), c.final(), c.getAuthTag()]) }; };
let n = 0, tot = 0;
fs.readdirSync(OUT).filter(f => f === 'data.json' || /^c-.*\.json$/.test(f)).forEach(f => {
  const p = path.join(OUT, f), s = seal(dk, zlib.deflateRawSync(fs.readFileSync(p), { level: 9 })), buf = Buffer.concat([s.iv, s.ct]);
  fs.writeFileSync(p, buf); n++; tot += buf.length;
});
const K = [];
(A.dispositivi || []).forEach(d => {
  try {
    const der = Buffer.from(String(d.chiave).replace(/^OLDEV1:/, '').trim(), 'base64');
    const pub = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    const eph = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const wk = crypto.createHash('sha256').update(crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: pub })).digest();
    const s = seal(wk, dk);
    K.push({ t: 'd', f: crypto.createHash('sha256').update(der).digest('hex').slice(0, 16), e: eph.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), i: s.iv.toString('base64'), w: s.ct.toString('base64') });
  } catch (e) { console.log('::warning::chiave del dispositivo "' + d.nome + '" non valida: ' + e.message); }
});
if (code) { const s = seal(crypto.pbkdf2Sync(code, Buffer.from(V.salt, 'hex'), V.it, 32, 'sha256'), dk); K.push({ t: 'c', i: s.iv.toString('base64'), w: s.ct.toString('base64') }); }
fs.writeFileSync(path.join(OUT, 'k.json'), JSON.stringify({ v: 2, k: K }));
console.log('::notice::sito chiuso: ' + n + ' file cifrati (' + Math.round(tot / 1e5) / 10 + ' MB), dispositivi autorizzati ' + K.filter(x => x.t === 'd').length + (code ? ', codice VIP attivo' : ', nessun codice VIP'));

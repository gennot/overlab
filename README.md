# OverLab

Statistiche e probabilità delle partite di calcio, con analisi completa per ogni partita.

- `app/` – l'app (modello, calcoli, schermate)
- `pipeline/` – scarica i dati da API-Football (`collect.js`), li prepara per l'app (`export.js`) e costruisce il sito installabile (`build_site.py`)
- `store/` – lo storico già scaricato (lo aggiorna da solo il programma)
- `.github/workflows/aggiorna.yml` – gira ogni 3 ore e pubblica l'app su GitHub Pages

La chiave di API-Football va messa in **Settings → Secrets and variables → Actions** con il nome `APISPORTS_KEY`.

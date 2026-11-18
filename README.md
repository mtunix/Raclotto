# Raclotto

Made for snack lovers by snack lovers <3

## Running

```bash
python -m venv venv && venv/bin/pip install -r requirements.txt
cp .env.example .env    # set RACLOTTO_JWT_SECRET (and RACLOTTO_ADMIN_PASSWORD for the first start)
venv/bin/python -m back.src.main    # production: waitress on 127.0.0.1:8081, serves the built frontend from static/
```

For development run `venv/bin/python -m back.src.dev` (Flask debug server on 127.0.0.1:8081) and
`cd front && npm start`, which proxies the API to it. `.env.example` lists every variable.

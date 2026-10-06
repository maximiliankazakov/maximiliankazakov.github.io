# `mediasoup-client.mjs`

Один **ESM**-бандл без внешних `import`. UI грузит его динамически: `/vendor/mediasoup-client.mjs?v=<app version>`.

Пересборка:

```bash
./scripts/vendor-mediasoup-client.sh
```

**nginx (production):** `.mjs` должен отдаваться как `Content-Type: application/javascript` — иначе `import()` в браузере падает. См. `docker/nginx.conf`.

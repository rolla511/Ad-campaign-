# Party Booster website

Run this directory as a Node web service with `npm start`. The website serves its own pages and forwards `/api/*` to a single backend.

## Production

Set these variables on the website service.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `API_UPSTREAM_ORIGIN` | The Render backend HTTPS origin, without `/api` |
| `API_GATEWAY_KEY` | The same random secret used by the backend, at least 32 characters |

The hosting provider supplies `PORT`. Set `TRUST_PROXY_HOPS` only when the hosting provider documents the number of trusted proxy hops. Store the upstream origin and gateway key on the server.

A static-only host needs an edge or server-side proxy for `/api/*` on the website domain. That proxy forwards to Render and adds the matching `X-Party-Booster-Gateway-Key` header using server-side configuration.

## Local testing

Start the backend in its own terminal, then run this from the frontend directory.

```bash
API_UPSTREAM_ORIGIN=http://127.0.0.1:3000 npm start
```

Open `http://127.0.0.1:8080`. The API target can be changed by restarting this server with a different environment setting.

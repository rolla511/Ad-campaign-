# Robbie Rolla Artist Page Frontend

## Current membership and currency requirements

Updated November 18, 2026. See [the platform specification](../PLATFORM_REQUIREMENTS.md) and [development status](../DEVELOPMENT_STATUS.md).

Artists have individual sign-ins and require paid membership, with weekly/monthly options. Visitors/free accounts can view artist-designated free content and cannot purchase, transfer, or trade coins. Eligible signed-in members buy ARC currency from the platform and spend it on selected artist/platform offers. ARC manages the ledger without an outside coin/trading provider; eligible reacquired currency is convertible under the accepted agreement, and selected rewards/perks must be recorded and fulfilled. Prices, rates, and fees remain undecided.

This describes the intended behavior; the current static frontend and prototype backend still need membership, entitlement, ledger, and redemption enforcement. This directory is an additional frontend copy to consolidate, not the main platform entry point. The deployment notes below describe the earlier standalone layout.

Standalone public frontend for the featured Robbie Rolla artist page.

Upload these files to the separate artist-page GitHub repo:

- `index.html`
- `style.css`
- `app.js`

Before deployment, set the API base in `index.html`:

```html
<meta name="arhc-api-base" content="https://your-render-server.onrender.com/api" />
```

The frontend repo should not carry the MP3, MOV, or server media files. Those stay in the ARHC Render server repo and are served by `arhc-server.mjs`.

Public behavior:

- No sign-in is required for artist-designated free content; restricted content and coin actions require backend membership/entitlement checks that still need implementation.
- The current frontend plays media from the configured backend; public media URLs must be reconciled with artist-selected free/restricted access.
- Download and tip payments call the Render server PayPal endpoints.
- Viewer analytics post to `/api/public/analytics`.

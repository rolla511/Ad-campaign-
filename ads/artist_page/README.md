# Robbie Rolla Artist Page Frontend

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

- No sign-in required for viewers.
- Public streams and video playback come from the Render server.
- Download and tip payments call the Render server PayPal endpoints.
- Viewer analytics post to `/api/public/analytics`.

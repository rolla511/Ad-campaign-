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

## Paid plans

Configure `BILLING_SITE_ORIGIN` on the backend with the website's HTTPS origin and no trailing slash. In the same PayPal environment as the REST app, create an active subscription plan for $30 USD every month with no trial, setup fee, or tax surcharge. The backend creates the $15.99 one-time order directly.

Add the website's `/api/billing/webhook` URL to that PayPal REST app and subscribe to these events.

- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.SALE.COMPLETED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.EXPIRED`

Set `BILLING_PROVIDER=paypal`, `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MONTHLY_PLAN_ID`, and `PAYPAL_WEBHOOK_ID` in the backend hosting environment. Use a separate database for sandbox testing. When going live, set `PAYPAL_ENV=live` and use the live app's credentials, plan, and webhook ID.

The Node gateway forwards the original webhook body and the `PayPal-Auth-Algo`, `PayPal-Cert-Url`, `PayPal-Transmission-Id`, `PayPal-Transmission-Sig`, and `PayPal-Transmission-Time` headers. If your host runs a different proxy, forward those headers there too. The website shows the paid plan after the backend confirms payment. Booking payments are arranged directly between members.

Run a checkout using a PayPal sandbox buyer to test signed webhook delivery. PayPal's Webhooks Simulator sends events that its verification API rejects. [PayPal webhook integration](https://developer.paypal.com/api/rest/webhooks/rest/)

## Local testing

Start the backend in its own terminal, then run this from the frontend directory.

```bash
API_UPSTREAM_ORIGIN=http://127.0.0.1:3000 npm start
```

Open `http://127.0.0.1:8080`. The API target can be changed by restarting this server with a different environment setting.

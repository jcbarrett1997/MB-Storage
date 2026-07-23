# Spam protection (Cloudflare Turnstile) - setup guide

Adds a free, privacy-friendly CAPTCHA to the contact form to cut down on
spam submissions. Cloudflare Turnstile is usually invisible to real
visitors (no puzzle-solving) - it just runs a background check.

## Step 1 - Create a Turnstile widget

1. Go to **https://dash.cloudflare.com** (free account is fine, no domain
   needs to be on Cloudflare for this).
2. In the sidebar, go to **Turnstile** → **Add widget**.
3. Domain: `mbstorage.co.uk` (and `www.mbstorage.co.uk`).
4. Widget mode: **Managed** (recommended - shows a checkbox only if it's
   unsure about the visitor).
5. Create it, then copy the **Site Key** and **Secret Key**.

## Step 2 - Add the Site Key to the page

The Site Key is safe to be public (it's meant to be visible in the page
source). Open `contact.html` and replace `TURNSTILE_SITE_KEY` with your
real Site Key:

```html
<div class="cf-turnstile" data-sitekey="TURNSTILE_SITE_KEY"></div>
```

## Step 3 - Add both keys to Netlify

In **Netlify → Site settings → Environment variables**, add:

| Key | Value |
|-----|-------|
| `TURNSTILE_SECRET_KEY` | your Secret Key from Cloudflare |
| `TURNSTILE_SITE_KEY` | your Site Key from Cloudflare (used by the waiting list - see below) |

Deploy. Until the Site Key (in the HTML, and/or as `TURNSTILE_SITE_KEY`)
and `TURNSTILE_SECRET_KEY` are set, everything works exactly as before -
the check is skipped rather than blocking real customers.

## How it works

- **Contact form**: the widget silently runs a check and adds a hidden
  `cf-turnstile-response` field when it submits. `netlify/functions/
  contact.js` verifies that token via `lib/turnstile.js` before sending
  any email. Submissions that fail are rejected with a friendly error -
  nothing is emailed. The existing honeypot field (`_honey`) still runs
  first and catches the simplest bots for free, so Turnstile is a second
  layer on top.
- **Waiting list**: `netlify/functions/waitlist.js` reads the Site Key
  straight from the `TURNSTILE_SITE_KEY` env var (no HTML editing needed
  here) and shows a brief interstitial that runs the same invisible check,
  then auto-submits itself the instant it passes - no click needed from a
  real visitor. This exists because the waiting-list link goes out in
  quote emails, and without it, an email security scanner pre-fetching
  that link (Outlook Safe Links, corporate gateways, etc.) could trigger a
  real signup with nobody actually clicking anything.

## Extending to other forms

`contact.html` and the waiting list both have it now. If spam starts
showing up on the quote form too, the same pattern applies to `quote.html`
/ `quote.js` - add a `<div class="cf-turnstile">` and call
`turnstile.verify()` from `lib/turnstile.js`.

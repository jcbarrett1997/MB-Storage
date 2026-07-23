/*
 * Cloudflare Turnstile helper - verifies a widget token against
 * Cloudflare's API. Fails soft (returns true - don't block) if
 * TURNSTILE_SECRET_KEY isn't set, so an unconfigured/misconfigured
 * Turnstile setup never locks real customers out.
 */

async function verify(token, ip) {
  var secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured yet - don't block real customers
  if (!token) return false;
  try {
    var form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    var r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    var json = await r.json().catch(function () { return {}; });
    return !!json.success;
  } catch (e) {
    console.error('Turnstile verification failed:', e);
    return false;
  }
}

module.exports = { verify: verify };

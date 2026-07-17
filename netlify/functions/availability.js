/*
 * MB Storage - live availability (Netlify Function)
 *
 * Reads unit availability from a small Google Sheet that MB Storage keeps
 * up to date, and serves it to the site as JSON. The sheet is published as
 * CSV (File > Share > Publish to web > CSV) and its URL is stored in:
 *
 *   AVAILABILITY_SHEET_CSV_URL
 *
 * Sheet layout (first row is headers, case-insensitive):
 *   site       | size | units_free
 *   Batley     | 20ft | 3
 *   Batley     | 8ft  | 2
 *   Liversedge | 20ft | 0
 *
 * Response:
 *   { configured: true, availability: { batley: { "20ft": 3, "8ft": 2 }, liversedge: { "20ft": 0 } } }
 *
 * If the env var is not set, returns { configured: false } so the site can
 * fall back gracefully (no badges, booking directs to quote/phone).
 */

function parseCsv(text) {
  var rows = [];
  text.split(/\r?\n/).forEach(function (line) {
    if (!line.trim()) return;
    // Simple split is fine: our cells are plain words and numbers
    rows.push(line.split(',').map(function (c) { return c.replace(/^"|"$/g, '').trim(); }));
  });
  return rows;
}

exports.handler = async function () {
  var url = process.env.AVAILABILITY_SHEET_CSV_URL;
  var headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60' // cache for a minute
  };
  if (!url) return { statusCode: 200, headers: headers, body: JSON.stringify({ configured: false }) };

  try {
    var r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('Sheet fetch failed: ' + r.status);
    var rows = parseCsv(await r.text());
    if (rows.length < 2) throw new Error('Sheet is empty');

    var head = rows[0].map(function (h) { return h.toLowerCase(); });
    var iSite = head.indexOf('site'), iSize = head.indexOf('size'), iFree = head.indexOf('units_free');
    if (iSite === -1 || iSize === -1 || iFree === -1) throw new Error('Sheet headers must be: site, size, units_free');

    var out = {};
    rows.slice(1).forEach(function (row) {
      var site = (row[iSite] || '').toLowerCase();
      var size = (row[iSize] || '').toLowerCase();
      var free = parseInt(row[iFree], 10);
      if (!site || !size || isNaN(free)) return;
      out[site] = out[site] || {};
      out[site][size] = Math.max(0, free);
    });

    return { statusCode: 200, headers: headers, body: JSON.stringify({ configured: true, availability: out }) };
  } catch (err) {
    console.error(err);
    // Fail soft: the site behaves as if availability isn't configured
    return { statusCode: 200, headers: headers, body: JSON.stringify({ configured: false }) };
  }
};

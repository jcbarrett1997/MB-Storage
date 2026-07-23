/*
 * MB Storage - admin-only view of the current waiting list.
 *
 * Visit /.netlify/functions/waitlist-list?key=YOUR_ADMIN_KEY (set
 * WAITLIST_ADMIN_KEY in Netlify env vars first - without it this endpoint
 * refuses to run, since the list contains customer emails).
 */

var blobs = require('./lib/blobs');

var SITE_LABELS = { batley: 'Batley', liversedge: 'Liversedge', either: 'Batley or Liversedge' };
var SIZE_LABELS = { '20ft': '20ft container', '8ft': '8ft container' };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

exports.handler = async function (event) {
  var adminKey = process.env.WAITLIST_ADMIN_KEY;
  var params = event.queryStringParameters || {};
  if (!adminKey || params.key !== adminKey) {
    return { statusCode: 404, body: 'Not found' };
  }

  var store = blobs.store('waitlist-log');
  var listing;
  try { listing = await store.list(); } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'blobs unavailable: ' + e.message }) };
  }
  var keys = (listing.blobs || []).map(function (b) { return b.key; }).filter(function (k) { return k.indexOf('w-') === 0; });

  var entries = [];
  for (var i = 0; i < keys.length; i++) {
    var entry = await store.get(keys[i], { type: 'json' });
    if (entry) entries.push(entry);
  }
  entries.sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });

  if (params.format === 'json') {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, count: entries.length, entries: entries }) };
  }

  var rows = entries.map(function (e) {
    return '<tr>' +
      '<td>' + esc(e.name || '') + '</td>' +
      '<td>' + esc(e.email) + '</td>' +
      '<td>' + esc(e.phone || '') + '</td>' +
      '<td>' + esc(SIZE_LABELS[e.size] || e.size) + '</td>' +
      '<td>' + esc(SITE_LABELS[e.site] || e.site) + '</td>' +
      '<td>' + (e.addedAt ? new Date(e.addedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : '') + '</td>' +
      '<td>' + (e.notified ? '✓ notified' : 'waiting') + '</td>' +
      '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>Waiting list | MB Storage</title>' +
    '<style>body{font-family:Segoe UI,Arial,sans-serif;background:#f2f5f8;margin:0;padding:32px 16px;color:#22303a}' +
    'table{border-collapse:collapse;width:100%;max-width:900px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}' +
    'th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e4e1da;font-size:14px}' +
    'th{background:#22303a;color:#fff;text-transform:uppercase;font-size:11px;letter-spacing:.05em}' +
    'h1{max-width:900px;margin:0 auto 16px;font-size:20px}</style></head>' +
    '<body><h1>Waiting list (' + entries.length + ')</h1>' +
    (entries.length ? '<table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Size</th><th>Site</th><th>Added</th><th>Status</th></tr>' + rows + '</table>'
      : '<p style="max-width:900px;margin:0 auto">Nobody is currently on the waiting list.</p>') +
    '</body></html>';

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};

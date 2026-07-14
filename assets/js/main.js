/* MB Storage — shared site JS */

// Mobile navigation
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
  }
  initQuoteForm();
});

/* ------------------------------------------------------------------
   Instant quote engine.
   Prices are deliberately NOT rendered anywhere on the page — they are
   only placed into the auto-response email sent to the customer.
------------------------------------------------------------------- */
var UNITS = {
  '20ft': {
    label: '20ft x 8ft storage container',
    pcmExVat: 160.00,
    deposit: 150.00
  },
  '8ft': {
    label: '8ft x 6ft 6in storage container',
    pcmExVat: 82.50,
    deposit: 75.00
  }
};
var VAT_RATE = 0.20;

function money(n) {
  return '£' + n.toFixed(2);
}

function buildQuoteEmail(unitKey, name, location, moveIn) {
  var u = UNITS[unitKey];
  var incVat = u.pcmExVat * (1 + VAT_RATE);
  var lines = [
    'Hi ' + name + ',',
    '',
    'Thank you for your enquiry — here is your instant quote from MB Storage.',
    '',
    'YOUR QUOTE',
    '----------------------------------------',
    'Unit: ' + u.label,
    (location ? 'Preferred site: ' + location : null),
    (moveIn ? 'Preferred move-in date: ' + moveIn : null),
    '',
    'Monthly rental: ' + money(u.pcmExVat) + ' + VAT per calendar month',
    '(' + money(incVat) + ' including VAT)',
    '',
    'Refundable deposit: ' + money(u.deposit),
    'Your deposit is refunded in full when you leave, provided the unit is left as it was found.',
    '',
    'INCLUDED WITH EVERY UNIT',
    '----------------------------------------',
    '- High-quality padlock provided',
    '- 24/7 CCTV with motion-sensing cameras',
    '- Mobile phone entry system — access your unit any time',
    '- Round-the-clock support',
    '',
    'NEXT STEPS',
    '----------------------------------------',
    'Reply to this email or call us on 07375 355233 to confirm your booking and arrange your move-in.',
    '',
    'Kind regards,',
    'MB Storage',
    '07375 355233 | info@mbstorage.co.uk | www.mbstorage.co.uk'
  ];
  return lines.filter(function (l) { return l !== null; }).join('\n');
}

function initQuoteForm() {
  var form = document.getElementById('quote-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    var unitKey = form.querySelector('[name="container_size"]').value;
    var name = (form.querySelector('[name="name"]').value || 'there').trim();
    var locEl = form.querySelector('[name="preferred_site"]');
    var dateEl = form.querySelector('[name="move_in_date"]');
    var status = document.getElementById('quote-status');

    if (!UNITS[unitKey]) {
      e.preventDefault();
      if (status) { status.className = 'status-msg err'; status.textContent = 'Please choose a container size.'; }
      return;
    }

    // Inject the personalised quote into the auto-response so the price
    // arrives in the customer's inbox, never on the page.
    var auto = form.querySelector('[name="_autoresponse"]');
    if (auto) {
      auto.value = buildQuoteEmail(
        unitKey,
        name,
        locEl ? locEl.value : '',
        dateEl ? dateEl.value : ''
      );
    }
    // Human-readable summary for the notification MB Storage receives.
    var summary = form.querySelector('[name="quote_summary"]');
    if (summary) {
      var u = UNITS[unitKey];
      summary.value = u.label + ' — ' + money(u.pcmExVat) + ' + VAT pcm, deposit ' + money(u.deposit);
    }
    if (status) { status.className = 'status-msg ok'; status.textContent = 'Sending your quote…'; }
  });
}

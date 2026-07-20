# Automated SMS payment reminders — setup guide

Sends a single SMS reminder via Twilio to any customer whose MB Storage
invoice is 5 days overdue (Batley and Liversedge only, using the QuickBooks
connections already set up — see SETUP-QUICKBOOKS.md).

Nothing secret lives in this repository — every credential is stored on Netlify.

---

## How it works

Once a day (`netlify/functions/payment-reminders.js`, scheduled 11am UTC in
`netlify.toml`), the function:

1. Asks QuickBooks (for each of Batley and Liversedge) for open invoices
   whose due date was exactly 5 days ago.
2. Looks up the phone number on that invoice's QuickBooks customer record.
3. Texts them one reminder via Twilio.
4. Remembers it's sent (in Netlify Blobs) so it's never sent twice, even if
   the function runs again.

If an invoice's customer has no usable phone number on file, that one is
skipped (logged, not a failure) — everything else still goes out.

## Step 1 — Twilio account

1. Sign up at **https://www.twilio.com** (or log in if you already have one).
2. Register an **Alphanumeric Sender ID** instead of buying a phone number
   (Console → Messaging → Senders → Alphanumeric Sender IDs → Create new
   Alphanumeric Sender ID). Enter a sender name up to 11 characters, letters
   and numbers only, e.g. `MBSTORAGE`. This is a much lighter registration
   than buying a UK number (which requires a full Regulatory Bundle of ID
   documents) - usually just a quick review.
   - Trade-off: an alphanumeric sender ID is **send-only** - customers can't
     reply to the text. Fine here, since the reminder message already
     points them to call rather than reply.
   - If you'd rather have a real UK number customers *can* reply to, you can
     still buy one instead (Console → Phone Numbers → Buy a number) and
     complete Twilio's Regulatory Bundle process for it - just use that
     number (in `+44...` format) as `TWILIO_FROM_NUMBER` below instead.
3. From the Console dashboard, copy your **Account SID** and **Auth Token**.

## Step 2 — Netlify environment variables

In **Site settings → Environment variables**, add:

| Key | Value |
|-----|-------|
| `TWILIO_ACCOUNT_SID` | your Account SID |
| `TWILIO_AUTH_TOKEN` | your Auth Token |
| `TWILIO_FROM_NUMBER` | your approved Alphanumeric Sender ID, e.g. `MBSTORAGE` (or a `+447...` number if you went that route instead) |
| `REMINDER_DAYS_AFTER_DUE` | optional — how many days after the due date to text (default `5`) |

**Deploy.** The function will start running on its daily schedule immediately;
until these three Twilio variables are set it safely does nothing (logs
"not configured" and exits).

## Testing

- Netlify functions can be triggered manually by visiting
  `https://www.mbstorage.co.uk/.netlify/functions/payment-reminders` in a
  browser (POST-only endpoints aside — this one runs on GET too, since it
  takes no input).
- Check **Netlify → Functions → payment-reminders → Logs** for what it found
  and sent. With nothing overdue by exactly 5 days, it'll log "nothing due"
  and that's expected — it only fires for invoices that hit that exact age
  on that day's run.
- To test the SMS itself without waiting for a real overdue invoice, you can
  temporarily create a test invoice in QuickBooks dated so its due date
  lands 5 days before today, with your own phone number on the test
  customer record, then trigger the function manually.

## Changing the message or timing

- Message wording lives in the `body` variable inside
  `netlify/functions/payment-reminders.js`.
- Reminder timing (days after due) is `REMINDER_DAYS_AFTER_DUE` above — no
  code change needed.
- Schedule (what time of day it runs) is the cron line in `netlify.toml`
  under `[functions."payment-reminders"]`.

## Notes

- This currently only covers MB Storage's monthly rent invoices raised in
  QuickBooks (and the automatic upfront 6/12-month invoices) — it reads
  whatever QuickBooks shows as open and overdue, so it works for either.
- Phone numbers come from the QuickBooks customer record, which is
  populated from what the customer entered at booking. If a customer's
  number is missing or malformed there, update it directly in QuickBooks.

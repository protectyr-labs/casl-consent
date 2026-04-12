# @protectyr-labs/casl-consent

CASL-compliant email consent management for TypeScript/JavaScript.

Handles express consent (indefinite), implied consent (2-year expiry), unsubscribe with immutable records, consent-to-express upgrades, and CASL-compliant email footers.

## Why This Exists

Canada's Anti-Spam Legislation (CASL) requires businesses to track consent with specific rules that most email libraries ignore:

- **Implied consent expires after exactly 2 years** (CASL Section 10(2))
- **Express consent lasts indefinitely** until the recipient unsubscribes
- Every commercial email must include **sender identification, physical address, and an unsubscribe mechanism**
- Consent must be verifiable at both **enrollment and send time**

This library encodes those rules so you don't have to re-read the legislation every time you send a marketing email.

## Quick Start

```bash
npm install @protectyr-labs/casl-consent
```

```typescript
import {
  createConsent,
  checkConsent,
  unsubscribe,
  generateFooter,
  generateUnsubscribeHeaders,
} from '@protectyr-labs/casl-consent';

// Track consent from a form submission (express = indefinite)
const consent = createConsent('user-123', 'express', 'signup_form');

// Track consent from a purchase (implied = expires in 2 years)
const implied = createConsent('user-456', 'implied', 'product_purchase');

// Before sending an email, verify consent is still valid
const check = checkConsent(implied);
if (!check.consented) {
  console.log(`Cannot send: ${check.reason}`);
}

// Generate a compliant email footer
const footer = generateFooter({
  businessName: 'Acme Inc.',
  physicalAddress: '123 Main St, Toronto, ON M5V 1A1, Canada',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
});

// Add RFC 8058 one-click unsubscribe headers
const headers = generateUnsubscribeHeaders('https://example.com/unsubscribe?token=abc');
// { 'List-Unsubscribe': '<https://...>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
```

## CASL Requirements This Library Implements

### Express vs Implied Consent

| Type | How Obtained | Duration | Example |
|------|-------------|----------|---------|
| **Express** | Explicit opt-in (checkbox, form, written agreement) | Indefinite until unsubscribe | Newsletter signup form |
| **Implied** | Existing business relationship (purchase, inquiry, contract) | 2 years from consent date | Customer bought a product |

### The 2-Year Rule (Section 10(2))

Implied consent expires exactly 2 years after it was obtained. After expiry, you must either:
1. Obtain express consent (upgrade), or
2. Stop sending commercial emails to that recipient

### Required Email Elements (Section 6(2))

Every commercial electronic message must include:
1. **Sender identification** (business name)
2. **Physical mailing address**
3. **Unsubscribe mechanism** (must be processed within 10 business days)

## API Reference

### `createConsent(entityId, consentType, source, consentedAt?)`

Creates a consent record. Express consent has no expiry. Implied consent expires after 2 years.

### `checkConsent(record, now?)`

Returns `{ consented: boolean, reason?: string }`. Checks unsubscribe status and expiry.

### `checkConsentWithWarning(record, warnDaysBefore?, now?)`

Same as `checkConsent` but adds a `warning` field when implied consent is within N days of expiry (default: 30 days).

### `unsubscribe(record, unsubscribedAt?)`

Returns a new record marked as unsubscribed. Does not mutate the original (immutable for audit trail).

### `upgradeToExpress(record, source)`

Converts implied consent to express. Removes the expiry date.

### `generateFooter(options)`

Returns an HTML string with business name, address, and unsubscribe link. CASL Section 6(2) compliant.

### `generateUnsubscribeHeaders(unsubscribeUrl)`

Returns `List-Unsubscribe` and `List-Unsubscribe-Post` headers for RFC 8058 one-click unsubscribe support in Gmail and Apple Mail.

## Use Cases

- **Canadian SaaS companies** sending product updates or marketing emails
- **Any business** sending commercial emails to Canadian recipients (CASL applies to the recipient's location)
- **Email service integrations** that need to verify consent before dispatch
- **CRM systems** tracking consent lifecycle across customer relationships

## Zero Dependencies

This library has no runtime dependencies. It provides pure functions that return plain objects. You manage storage (database, file, in-memory) however you prefer.

## License

MIT

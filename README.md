# casl-consent

> Canadian anti-spam law (CASL) email consent management.

[![CI](https://github.com/protectyr-labs/casl-consent/actions/workflows/ci.yml/badge.svg)](https://github.com/protectyr-labs/casl-consent/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)

## Quick Start

```bash
npm install @protectyr-labs/casl-consent
```

```typescript
import { createConsent, checkConsent, generateFooter, generateUnsubscribeHeaders } from '@protectyr-labs/casl-consent';

// Implied consent from a purchase -- expires in exactly 2 years (CASL S.10(2))
const consent = createConsent('user-456', 'implied', 'product_purchase');

// Check before every send
const check = checkConsent(consent);
// => { consented: true }

// 2 years later...
const expired = checkConsent(consent, new Date('2028-04-12'));
// => { consented: false, reason: 'Implied consent expired' }

// Compliant email footer + one-click unsubscribe headers
const footer = generateFooter({ businessName: 'Acme Inc.', physicalAddress: '123 Main St, Toronto', unsubscribeUrl: 'https://...' });
const headers = generateUnsubscribeHeaders('https://example.com/unsubscribe?token=abc');
// => { 'List-Unsubscribe': '<https://...>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
```

## Express vs Implied Consent

| Type | Duration | How Obtained | CASL Basis |
|------|----------|-------------|------------|
| **Express** | Indefinite (until unsubscribe) | Explicit opt-in: checkbox, form, written agreement | Section 6(1) |
| **Implied** | **Exactly 2 years** | Existing business relationship: purchase, inquiry, contract | Section 10(2) |

The 2-year expiry is Canadian law, not a design choice. After expiry, you must obtain express consent or stop emailing.

## Why This?

- **2-year implied expiry (CASL S.10(2))** -- automatically enforced, not a manual check
- **Dual-time checking** -- verify consent at enrollment AND at send time
- **Immutable records** -- `unsubscribe()` returns a new record; originals preserved for audit
- **RFC 8058 headers** -- one-click unsubscribe support for Gmail and Apple Mail
- **Upgrade path** -- `upgradeToExpress()` converts implied consent to indefinite
- **Zero dependencies** -- pure functions returning plain objects

## Use Cases

**Canadian SaaS companies** -- If you send commercial emails to Canadian recipients, CASL applies. This handles the consent tracking requirements.

**Email marketing platforms** -- Track express vs implied consent per subscriber. Auto-expire implied consent after 2 years. Generate compliant footers.

**CRM systems** -- When a business relationship is established (purchase, inquiry), record implied consent with automatic expiry. Upgrade to express when they explicitly opt in.

## API

| Function | Purpose |
|----------|---------|
| `createConsent(entityId, type, source)` | Create express (indefinite) or implied (2yr) consent record |
| `checkConsent(record, now?)` | Verify consent is still valid at send time |
| `checkConsentWithWarning(record, days?, now?)` | Same as above + warning when implied consent is near expiry |
| `unsubscribe(record)` | Return new record marked unsubscribed (immutable) |
| `upgradeToExpress(record, source)` | Convert implied to express, removing expiry |
| `generateFooter(opts)` | HTML footer with business name, address, unsubscribe link |
| `generateUnsubscribeHeaders(url)` | RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post` headers |

## Limitations

- **No database included** -- caller manages storage; library returns plain objects
- **No renewal workflow** -- implied consent approaching expiry must be handled by your app
- **English-only** -- footer templates are in English; override for French/bilingual
- **No CRTC reporting** -- tracks consent, does not generate compliance reports

## See Also

- [funnel-state](https://github.com/protectyr-labs/funnel-state) -- validated customer lifecycle state machine
- [tier-state](https://github.com/protectyr-labs/tier-state) -- subscription tier resolution

## License

MIT

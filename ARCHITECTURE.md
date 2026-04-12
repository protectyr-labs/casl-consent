# Architecture

Design decisions and their rationale.

## Why 2-Year Expiry for Implied Consent

This is not a design choice. CASL Section 10(2) specifies that implied consent based on an existing business relationship expires **2 years** after the last purchase, contract, or inquiry. The library encodes this directly in `createConsent()` when `consentType` is `'implied'`.

Reference: [CASL S.10(2)](https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-4.html)

## Why Check Consent at Both Enrollment and Send Time

Consent can change between when a recipient is added to an email list and when an email is actually sent:

- Implied consent may have expired (the 2-year window closed)
- The recipient may have unsubscribed
- Consent records may have been updated by another system

`checkConsent()` is designed to be called at send time, not just at enrollment. This prevents sending to recipients whose consent has lapsed.

## Why Immutable Records

`unsubscribe()` returns a **new** `ConsentRecord` instead of mutating the original. This preserves the audit trail:

- The original consent record documents when and how consent was obtained
- The unsubscribe record documents when consent was revoked
- Both records can be stored for compliance evidence

CASL enforcement can request proof of consent. Immutable records ensure the original consent evidence is never overwritten.

## Why Footer + Headers

CASL requires two different compliance mechanisms:

1. **Footer (body content)**: CASL Section 6(2) requires every commercial email to contain sender identification, physical address, and an unsubscribe mechanism visible in the message body.

2. **List-Unsubscribe headers**: RFC 8058 defines HTTP headers that modern email clients (Gmail, Apple Mail, Yahoo) use to display a prominent "Unsubscribe" button in the email UI. While not required by CASL, these headers significantly reduce spam complaints and improve deliverability.

Both are provided as separate functions because they serve different purposes and are injected at different layers (email body vs. SMTP headers).

## Known Limitations

- **No database layer.** The library provides pure functions. The caller is responsible for persisting consent records in their chosen storage (Postgres, Redis, file, etc.).

- **No consent renewal workflow.** When implied consent is near expiry, `checkConsentWithWarning()` flags it, but the library does not automate sending renewal/upgrade emails. That workflow depends on your email infrastructure.

- **English-only templates.** The `generateFooter()` function produces English text. CASL applies in both English and French; bilingual footers would need to be implemented by the caller.

- **No CRTC complaint handling.** The library tracks consent state but does not integrate with CRTC reporting or dispute resolution processes.

- **Single-record model.** Each `ConsentRecord` represents one entity's consent. Batch operations, list management, and deduplication are left to the caller.

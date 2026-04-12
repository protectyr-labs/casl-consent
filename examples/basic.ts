import {
  createConsent,
  checkConsent,
  unsubscribe,
  upgradeToExpress,
  generateFooter,
  generateUnsubscribeHeaders,
  checkConsentWithWarning,
} from '../src/index';

// --- 1. Create consent records ---

const expressConsent = createConsent('lead-001', 'express', 'signup_form');
console.log('Express consent:', expressConsent);

const impliedConsent = createConsent(
  'lead-002',
  'implied',
  'product_purchase',
  new Date('2024-06-15'),
);
console.log('Implied consent:', impliedConsent);

// --- 2. Check consent validity ---

console.log('\n--- Consent checks ---');

const expressCheck = checkConsent(expressConsent, new Date('2099-01-01'));
console.log('Express valid in 2099?', expressCheck.consented); // true

const impliedCheckBefore = checkConsent(impliedConsent, new Date('2025-12-01'));
console.log('Implied valid Dec 2025?', impliedCheckBefore.consented); // true

const impliedCheckAfter = checkConsent(impliedConsent, new Date('2026-07-01'));
console.log('Implied valid Jul 2026?', impliedCheckAfter.consented); // false
console.log('Reason:', impliedCheckAfter.reason);

// --- 3. Expiry warnings ---

console.log('\n--- Expiry warnings ---');

const warningCheck = checkConsentWithWarning(impliedConsent, 30, new Date('2026-05-20'));
console.log('Warning:', warningCheck.warning);

// --- 4. Unsubscribe ---

console.log('\n--- Unsubscribe ---');

const unsubbed = unsubscribe(expressConsent);
console.log('Original still valid?', checkConsent(expressConsent).consented); // true
console.log('Unsubbed valid?', checkConsent(unsubbed).consented); // false

// --- 5. Upgrade implied to express ---

console.log('\n--- Upgrade to express ---');

const upgraded = upgradeToExpress(impliedConsent, 'explicit_optin_email');
console.log('Type:', upgraded.consentType); // 'express'
console.log('Expires:', upgraded.expiresAt); // null

// --- 6. Email compliance ---

console.log('\n--- Email footer ---');

const footer = generateFooter({
  businessName: 'Acme Inc.',
  physicalAddress: '123 Main St, Toronto, ON M5V 1A1, Canada',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc123',
});
console.log(footer);

console.log('\n--- Unsubscribe headers ---');

const headers = generateUnsubscribeHeaders('https://example.com/unsubscribe?token=abc123');
console.log(headers);

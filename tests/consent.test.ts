import { describe, it, expect } from 'vitest';
import {
  createConsent,
  checkConsent,
  unsubscribe,
  upgradeToExpress,
  generateFooter,
  generateUnsubscribeHeaders,
  checkConsentWithWarning,
} from '../src/index';

describe('createConsent', () => {
  it('creates express consent with no expiry', () => {
    const r = createConsent('lead-1', 'express', 'signup_form');
    expect(r.consentType).toBe('express');
    expect(r.expiresAt).toBeNull();
    expect(r.unsubscribedAt).toBeNull();
  });

  it('creates implied consent with 2-year expiry', () => {
    const date = new Date('2024-01-15');
    const r = createConsent('lead-2', 'implied', 'purchase', date);
    expect(r.consentType).toBe('implied');
    expect(r.expiresAt).not.toBeNull();
    const expiry = new Date(r.expiresAt!);
    expect(expiry.getFullYear()).toBe(2026);
  });
});

describe('checkConsent', () => {
  it('express consent is valid indefinitely', () => {
    const r = createConsent('lead-1', 'express', 'form');
    const future = new Date('2099-01-01');
    expect(checkConsent(r, future).consented).toBe(true);
  });

  it('implied consent expires after 2 years', () => {
    const r = createConsent('lead-2', 'implied', 'purchase', new Date('2024-01-01'));
    const before = new Date('2025-12-31');
    const after = new Date('2026-01-02');
    expect(checkConsent(r, before).consented).toBe(true);
    expect(checkConsent(r, after).consented).toBe(false);
    expect(checkConsent(r, after).reason).toContain('expired');
  });

  it('unsubscribed consent is invalid', () => {
    const r = unsubscribe(createConsent('lead-3', 'express', 'form'));
    expect(checkConsent(r).consented).toBe(false);
    expect(checkConsent(r).reason).toBe('Unsubscribed');
  });
});

describe('unsubscribe', () => {
  it('does not mutate original record', () => {
    const original = createConsent('lead-1', 'express', 'form');
    const unsub = unsubscribe(original);
    expect(original.unsubscribedAt).toBeNull();
    expect(unsub.unsubscribedAt).not.toBeNull();
  });
});

describe('upgradeToExpress', () => {
  it('removes expiry and changes type', () => {
    const implied = createConsent('lead-1', 'implied', 'purchase', new Date('2024-01-01'));
    expect(implied.expiresAt).not.toBeNull();
    const upgraded = upgradeToExpress(implied, 'explicit_optin');
    expect(upgraded.consentType).toBe('express');
    expect(upgraded.expiresAt).toBeNull();
    expect(upgraded.source).toBe('explicit_optin');
  });
});

describe('generateFooter', () => {
  it('includes business name, address, and unsubscribe link', () => {
    const html = generateFooter({
      businessName: 'Acme Inc.',
      physicalAddress: 'Toronto, ON, Canada',
      unsubscribeUrl: 'https://example.com/unsubscribe?id=123',
    });
    expect(html).toContain('Acme Inc.');
    expect(html).toContain('Toronto, ON');
    expect(html).toContain('unsubscribe?id=123');
    expect(html).toContain('Unsubscribe from marketing emails');
  });
});

describe('generateUnsubscribeHeaders', () => {
  it('returns RFC 8058 headers', () => {
    const headers = generateUnsubscribeHeaders('https://example.com/unsub');
    expect(headers['List-Unsubscribe']).toBe('<https://example.com/unsub>');
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });
});

describe('checkConsentWithWarning', () => {
  it('warns when implied consent is near expiry', () => {
    const r = createConsent('lead-1', 'implied', 'purchase', new Date('2024-01-01'));
    const nearExpiry = new Date('2025-12-12');
    const result = checkConsentWithWarning(r, 30, nearExpiry);
    expect(result.consented).toBe(true);
    expect(result.warning).toContain('expires in');
  });

  it('no warning for express consent', () => {
    const r = createConsent('lead-1', 'express', 'form');
    const result = checkConsentWithWarning(r);
    expect(result.warning).toBeUndefined();
  });
});

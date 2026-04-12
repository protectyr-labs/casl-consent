/**
 * CASL Consent — Canadian Anti-Spam Legislation compliance for email marketing.
 *
 * Implements:
 * - Express consent (indefinite until unsubscribe)
 * - Implied consent (expires after 2 years per CASL S.10(2))
 * - Consent verification at enrollment and send time
 * - Unsubscribe with enrollment cascade
 * - CASL-compliant email footers
 * - List-Unsubscribe headers (RFC 8058)
 */

export type ConsentType = 'express' | 'implied';

export interface ConsentRecord {
  entityId: string;
  consentType: ConsentType;
  consentedAt: string; // ISO 8601
  source: string; // how consent was obtained
  expiresAt: string | null; // null = indefinite (express), ISO date (implied)
  unsubscribedAt: string | null;
}

export interface ConsentCheck {
  consented: boolean;
  reason?: string;
  consentType?: ConsentType;
  expiresAt?: string | null;
}

/** CASL implied consent expires after 2 years (S.10(2)) */
const IMPLIED_CONSENT_YEARS = 2;

/**
 * Create a consent record.
 *
 * Express consent: obtained via explicit opt-in (checkbox, form).
 * Indefinite until unsubscribe.
 *
 * Implied consent: obtained via business relationship (purchase, inquiry).
 * Expires 2 years from consent date per CASL.
 */
export function createConsent(
  entityId: string,
  consentType: ConsentType,
  source: string,
  consentedAt?: Date,
): ConsentRecord {
  const date = consentedAt ?? new Date();
  let expiresAt: string | null = null;

  if (consentType === 'implied') {
    const expiry = new Date(date);
    expiry.setFullYear(expiry.getFullYear() + IMPLIED_CONSENT_YEARS);
    expiresAt = expiry.toISOString();
  }

  return {
    entityId,
    consentType,
    consentedAt: date.toISOString(),
    source,
    expiresAt,
    unsubscribedAt: null,
  };
}

/**
 * Check if a consent record is currently valid.
 *
 * Invalid if:
 * - Unsubscribed
 * - Implied consent has expired (past 2-year window)
 */
export function checkConsent(record: ConsentRecord, now?: Date): ConsentCheck {
  const currentDate = now ?? new Date();

  // Already unsubscribed
  if (record.unsubscribedAt) {
    return { consented: false, reason: 'Unsubscribed' };
  }

  // Implied consent: check expiry
  if (record.consentType === 'implied' && record.expiresAt) {
    const expiryDate = new Date(record.expiresAt);
    if (currentDate > expiryDate) {
      return {
        consented: false,
        reason: `Implied consent expired on ${record.expiresAt}`,
        consentType: 'implied',
        expiresAt: record.expiresAt,
      };
    }
  }

  return {
    consented: true,
    consentType: record.consentType,
    expiresAt: record.expiresAt,
  };
}

/**
 * Mark a consent record as unsubscribed.
 * Returns a new record (does not mutate the original).
 */
export function unsubscribe(record: ConsentRecord, unsubscribedAt?: Date): ConsentRecord {
  return {
    ...record,
    unsubscribedAt: (unsubscribedAt ?? new Date()).toISOString(),
  };
}

/**
 * Upgrade implied consent to express consent.
 * Removes the expiry date (express consent is indefinite).
 */
export function upgradeToExpress(record: ConsentRecord, source: string): ConsentRecord {
  return {
    ...record,
    consentType: 'express',
    source,
    expiresAt: null,
  };
}

// ---------------------------------------------------------------------------
// Email compliance helpers
// ---------------------------------------------------------------------------

export interface CaslFooterOptions {
  businessName: string;
  physicalAddress: string;
  unsubscribeUrl: string;
}

/**
 * Generate a CASL-compliant email footer (HTML).
 *
 * CASL requires every commercial email to include:
 * 1. Sender identification (business name)
 * 2. Physical mailing address
 * 3. Unsubscribe mechanism
 */
export function generateFooter(options: CaslFooterOptions): string {
  const { businessName, physicalAddress, unsubscribeUrl } = options;
  return [
    '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#666;text-align:center">',
    `<p>${businessName} | ${physicalAddress}</p>`,
    `<p><a href="${unsubscribeUrl}" style="color:#666">Unsubscribe from marketing emails</a></p>`,
    '</div>',
  ].join('');
}

/**
 * Generate List-Unsubscribe headers for RFC 8058 one-click unsubscribe.
 *
 * Modern email clients (Gmail, Apple Mail) display a prominent unsubscribe
 * button when these headers are present.
 */
export function generateUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Check if consent is still valid and not close to expiry.
 * Returns a warning if implied consent expires within the specified number of days.
 */
export function checkConsentWithWarning(
  record: ConsentRecord,
  warnDaysBefore: number = 30,
  now?: Date,
): ConsentCheck & { warning?: string } {
  const base = checkConsent(record, now);
  if (!base.consented) return base;

  if (record.consentType === 'implied' && record.expiresAt) {
    const currentDate = now ?? new Date();
    const expiryDate = new Date(record.expiresAt);
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= warnDaysBefore) {
      return {
        ...base,
        warning: `Implied consent expires in ${daysUntilExpiry} days. Consider obtaining express consent.`,
      };
    }
  }

  return base;
}

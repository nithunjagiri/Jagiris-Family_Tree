/**
 * Click-to-chat / SMS links. The device owner sends; we never transmit a message.
 * India-first: 10-digit mobiles become 91XXXXXXXXXX (same as Contact Us).
 */

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** WhatsApp / wa.me international digits without '+' */
export function toIntlDigits(value) {
  const d = digitsOnly(value);
  if (!d) return '';
  if (d.length === 10) return `91${d}`;
  if (d.startsWith('0') && d.length === 11) return `91${d.slice(1)}`;
  if (d.startsWith('91') && d.length === 12) return d;
  return d;
}

export function toTelE164(value) {
  const intl = toIntlDigits(value);
  return intl ? `+${intl}` : '';
}

export function whatsAppHref(number, text = '') {
  const intl = toIntlDigits(number);
  if (!intl) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${intl}${q}`;
}

export function smsHref(number, text = '') {
  const tel = toTelE164(number);
  if (!tel) return null;
  const q = text ? `?body=${encodeURIComponent(text)}` : '';
  return `sms:${tel}${q}`;
}

/**
 * Prefer WhatsApp number for chat, phone for SMS; each falls back to the other.
 * @param {{ whatsapp_number?: unknown; phone?: unknown } | null | undefined} member
 */
export function memberContactNumbers(member) {
  const wa = String(member?.whatsapp_number ?? '').trim();
  const phone = String(member?.phone ?? '').trim();
  return {
    whatsapp: wa || phone || '',
    sms: phone || wa || '',
  };
}

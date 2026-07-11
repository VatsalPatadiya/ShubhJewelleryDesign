function normalizeWhatsappNumber(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function isValidWhatsappNumber(raw) {
  const digits = normalizeWhatsappNumber(raw);
  return digits.length >= 10 && digits.length <= 15;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

module.exports = {
  normalizeWhatsappNumber,
  isValidWhatsappNumber,
  isNonEmptyString,
  isPositiveNumber,
};

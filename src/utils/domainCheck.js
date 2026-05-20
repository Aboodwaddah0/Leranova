const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'live.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'mail.com', 'gmx.com',
  'yandex.com', 'yandex.ru', 'zoho.com', 'inbox.com',
  'fastmail.com', 'tutanota.com',
]);

export const isBusinessEmail = (email) => {
  const domain = String(email || '').split('@')[1]?.toLowerCase() || '';
  if (!domain) return false;
  if (FREE_EMAIL_PROVIDERS.has(domain)) return false;
  // Catch yahoo.co.uk, hotmail.co.uk, etc.
  if (/^yahoo\.|^hotmail\./.test(domain)) return false;
  return true;
};

const ARABIC_RANGE = /[\u0600-\u06FF]/;
const COMMON_MOJIBAKE_MARKERS = /[ÃÂØÙ]/;

export const normalizeUploadedFilename = (value) => {
  const input = String(value || '').trim();

  if (!input) {
    return null;
  }

  if (ARABIC_RANGE.test(input)) {
    return input;
  }

  const decoded = Buffer.from(input, 'latin1').toString('utf8').trim();

  if (decoded && ARABIC_RANGE.test(decoded) && COMMON_MOJIBAKE_MARKERS.test(input)) {
    return decoded;
  }

  return input;
};
/**
 * Minimal date helpers — no external library needed.
 */

/** Format ISO string → readable date */
export function formatDate(iso: string, locale: 'ar' | 'en' = 'en'): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Relative time — e.g., "2 hours ago" */
export function timeAgo(iso: string, isArabic = false): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours   = Math.floor(diff / 3600000);
    const days    = Math.floor(diff / 86400000);

    if (minutes < 1)  return isArabic ? 'للتو'            : 'Just now';
    if (minutes < 60) return isArabic ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    if (hours < 24)   return isArabic ? `منذ ${hours} ساعة`    : `${hours}h ago`;
    if (days < 7)     return isArabic ? `منذ ${days} يوم`      : `${days}d ago`;
    return formatDate(iso, isArabic ? 'ar' : 'en');
  } catch {
    return iso;
  }
}

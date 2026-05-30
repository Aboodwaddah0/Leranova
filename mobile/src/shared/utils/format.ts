/** Format mark as percentage string */
export function formatMark(numbers: number, outOf: number): string {
  if (!outOf) return '0%';
  return `${numbers}/${outOf}`;
}

/** Percentage 0-100 */
export function markPercent(numbers: number, outOf: number): number {
  if (!outOf) return 0;
  return Math.round((numbers / outOf) * 100);
}

/** Truncate long strings */
export function truncate(str: string, max = 60): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/** Format file size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** XP level display */
export function levelLabel(level: number): string {
  return `Level ${level}`;
}

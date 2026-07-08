export function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidWebsiteUrl(value: string): boolean {
  try {
    const parsed = new URL(normalizeWebsiteUrl(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.hostname.includes('.')
      : false;
  } catch {
    return false;
  }
}

export const WEBSITE_URL_VALIDATION_MESSAGE =
  'Please check the target names and website URLs. Use full website URLs such as https://www.example.com.';

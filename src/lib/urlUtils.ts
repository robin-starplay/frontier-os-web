export function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(normalized);
    if (/^(?:www\.)?google\.(?:com|co\.uk)$/i.test(parsed.hostname) && parsed.pathname === '/url') {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target) return normalizeWebsiteUrl(decodeURIComponent(target));
    }
  } catch { /* validation reports malformed URLs separately */ }
  return normalized;
}

export function canonicalCompanyDomain(value: string): string {
  try {
    return new URL(normalizeWebsiteUrl(value)).hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return '';
  }
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

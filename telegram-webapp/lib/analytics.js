export function parseUTM(fb = {}) {
  const qs = new URLSearchParams(location.search);
  const get = k => qs.get(k) ?? fb[k] ?? '';
  return {
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_content: get('utm_content'),
  };
}

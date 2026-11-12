function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || '';
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]' || hostname === '::1';
}

export function getPublicOrigin(request: Request): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));

  if (forwardedHost) {
    const protocol = forwardedProto || (isProduction ? 'https' : 'http');
    const forwardedOrigin = new URL(`${protocol}://${forwardedHost}`);
    if (!isProduction || !isLocalHost(forwardedOrigin.hostname)) return forwardedOrigin.origin;
  }

  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) {
    const configuredOrigin = new URL(configuredUrl);
    if (!isProduction || !isLocalHost(configuredOrigin.hostname)) return configuredOrigin.origin;
  }

  const requestUrl = new URL(request.url);
  if (!isProduction || !isLocalHost(requestUrl.hostname)) return requestUrl.origin;

  throw new Error('Set APP_URL to the public deployment URL.');
}

export function getPublicUrl(request: Request, path: string) {
  return new URL(path, getPublicOrigin(request));
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === getPublicOrigin(request);
  } catch {
    return false;
  }
}

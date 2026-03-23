const DEFAULT_API_PATH = '/api/v1';

function normalizeApiPath(pathname: string): string {
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return trimmed && trimmed !== '/' ? trimmed : DEFAULT_API_PATH;
}

function getRawApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || '').trim();
}

export function getApiHttpBaseUrl(): string {
  const raw = getRawApiBaseUrl();

  if (!raw) {
    return DEFAULT_API_PATH;
  }

  try {
    const url = new URL(raw);
    return `${url.origin}${normalizeApiPath(url.pathname)}`;
  } catch {
    return normalizeApiPath(raw);
  }
}

export function getApiOrigin(): string {
  const raw = getRawApiBaseUrl();

  if (!raw) {
    return window.location.origin;
  }

  try {
    return new URL(raw).origin;
  } catch {
    return window.location.origin;
  }
}

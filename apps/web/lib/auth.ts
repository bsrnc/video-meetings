export const TOKEN_STORAGE_KEY = 'accessToken';

/** Mirrors `JwtPayload` in `apps/api/src/auth/auth-token.service.ts`. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  /** Seconds since the epoch. The API signs tokens with `expiresIn: '1h'`. */
  exp?: number;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Reads the payload of a JWT without verifying its signature — enough to show
 * the signed-in email and to skip a request we know would 401. The API is still
 * the only thing that decides whether a token is valid.
 */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) {
    return null;
  }

  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    const payload = JSON.parse(json) as AccessTokenPayload;
    if (typeof payload?.email !== 'string') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(payload: AccessTokenPayload): boolean {
  return payload.exp !== undefined && payload.exp * 1000 <= Date.now();
}

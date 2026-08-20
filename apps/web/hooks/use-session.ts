'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useIsHydrated } from '@heroui/react';
import {
  clearStoredToken,
  decodeAccessToken,
  getStoredToken,
  isAccessTokenExpired,
} from '@/lib/auth';

export interface Session {
  /** The stored JWT, or `null` before hydration and when signed out. */
  token: string | null;
  /** Email decoded out of the token; `null` when it is missing or expired. */
  email: string | null;
  signOut: () => void;
}

/**
 * The client-side auth gate shared by every signed-in page: reads the token
 * from `localStorage` after hydration and redirects to the sign-in page when
 * there is no usable one. Pages render nothing but a spinner until both
 * `token` and `email` are set, so a signed-out visitor never sees the page
 * contents flash before the redirect.
 *
 * This hides UI; it does not protect data — the API's guard does that.
 */
export function useSession(): Session {
  const router = useRouter();

  // The token lives in localStorage, so it can only be read on the client. The
  // first render — server render and hydration alike — must not touch it, or
  // the markup would not match.
  const isHydrated = useIsHydrated();
  const token = isHydrated ? getStoredToken() : null;

  // An expired token counts as no token at all: the API would 401 on it anyway.
  const email = useMemo(() => {
    const payload = token ? decodeAccessToken(token) : null;
    return payload && !isAccessTokenExpired(payload) ? payload.email : null;
  }, [token]);

  const signOut = useCallback(() => {
    clearStoredToken();
    router.replace('/auth/login');
  }, [router]);

  useEffect(() => {
    if (isHydrated && !email) {
      clearStoredToken();
      router.replace('/auth/login');
    }
  }, [email, isHydrated, router]);

  return { token, email, signOut };
}

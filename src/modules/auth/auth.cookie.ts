import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'accessToken';

export function accessTokenCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // En prod el front y la API viven en dominios distintos (Vercel y Render),
    // así que la cookie es cross-site: sin `none` el browser no la manda y
    // toda request autenticada falla. `none` exige `secure`. En local van los
    // dos en localhost, donde `lax` alcanza y no necesitamos HTTPS.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

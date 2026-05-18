import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'accessToken';

export function accessTokenCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

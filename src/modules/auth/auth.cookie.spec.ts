import { accessTokenCookieOptions } from './auth.cookie';

describe('accessTokenCookieOptions', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('uses lax and no secure flag outside production', () => {
    process.env.NODE_ENV = 'development';

    expect(accessTokenCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
  });

  it('uses none + secure in production so the cross-site cookie is sent', () => {
    process.env.NODE_ENV = 'production';

    expect(accessTokenCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    });
  });
});

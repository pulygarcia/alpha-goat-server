import { Test } from '@nestjs/testing';
import { UserRole } from '../users/domain/user-role.enum';
import { User } from '../users/domain/user.entity';
import { AuthController } from './auth.controller';
import { JwtTokenSigner } from './services/jwt-token-signer';
import { UserAuthenticator } from './services/user-authenticator';
import { UserRegistrar } from './services/user-registrar';

describe('AuthController', () => {
  let controller: AuthController;
  let registrar: jest.Mocked<UserRegistrar>;
  let authenticator: jest.Mocked<UserAuthenticator>;
  let signer: jest.Mocked<JwtTokenSigner>;

  const user = {
    id: 'u1',
    email: 'foo@bar.com',
    username: 'puly',
    avatarUrl: null,
    role: UserRole.USER,
    createdAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: UserRegistrar, useValue: { execute: jest.fn() } },
        { provide: UserAuthenticator, useValue: { execute: jest.fn() } },
        { provide: JwtTokenSigner, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AuthController);
    registrar = module.get(UserRegistrar);
    authenticator = module.get(UserAuthenticator);
    signer = module.get(JwtTokenSigner);
  });

  function mockRes() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as import('express').Response & {
      cookie: jest.Mock;
      clearCookie: jest.Mock;
    };
  }

  it('register sets the access token cookie and returns the user', async () => {
    registrar.execute.mockResolvedValue(user);
    signer.sign.mockResolvedValue('token');
    const res = mockRes();

    const body = await controller.register(
      { email: 'foo@bar.com', username: 'puly', password: 'secret123' },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(body.user.id).toBe('u1');
    expect(
      (body as unknown as { accessToken?: string }).accessToken,
    ).toBeUndefined();
  });

  it('login sets the access token cookie and returns the user', async () => {
    authenticator.execute.mockResolvedValue(user);
    signer.sign.mockResolvedValue('token');
    const res = mockRes();

    const body = await controller.login(
      { email: 'foo@bar.com', password: 'secret123' },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'token',
      expect.any(Object),
    );
    expect(body.user.email).toBe('foo@bar.com');
  });

  it('logout clears the access token cookie', () => {
    const res = mockRes();
    controller.logout(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.any(Object),
    );
  });

  it('me returns the current user as response dto', () => {
    const res = controller.me(user);
    expect(res.id).toBe('u1');
  });
});

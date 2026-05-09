import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { User } from '../../users/domain/user.entity';
import { UserFinder } from '../../users/services/user-finder';
import { PasswordHasher } from './password-hasher';
import { UserAuthenticator } from './user-authenticator';

describe('UserAuthenticator', () => {
  let auth: UserAuthenticator;
  let finder: jest.Mocked<UserFinder>;
  let hasher: jest.Mocked<PasswordHasher>;

  const dto = { email: 'foo@bar.com', password: 'secret123' };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserAuthenticator,
        { provide: UserFinder, useValue: { byEmail: jest.fn() } },
        { provide: PasswordHasher, useValue: { compare: jest.fn() } },
      ],
    }).compile();

    auth = module.get(UserAuthenticator);
    finder = module.get(UserFinder);
    hasher = module.get(PasswordHasher);
  });

  it('returns the user when credentials are valid', async () => {
    const user = { passwordHash: 'h', banned: false } as User;
    finder.byEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    await expect(auth.execute(dto)).resolves.toBe(user);
  });

  it('throws UnauthorizedException when user is missing', async () => {
    finder.byEmail.mockResolvedValue(null);
    await expect(auth.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when password is wrong', async () => {
    finder.byEmail.mockResolvedValue({ passwordHash: 'h', banned: false } as User);
    hasher.compare.mockResolvedValue(false);

    await expect(auth.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user is banned', async () => {
    finder.byEmail.mockResolvedValue({ passwordHash: 'h', banned: true } as User);

    await expect(auth.execute(dto)).rejects.toThrow(/banned/);
    expect(hasher.compare).not.toHaveBeenCalled();
  });
});

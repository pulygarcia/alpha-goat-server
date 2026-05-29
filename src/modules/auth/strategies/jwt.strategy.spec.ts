import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '../../users/domain/user-role.enum';
import { User } from '../../users/domain/user.entity';
import { UserFinder } from '../../users/services/user-finder';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let finder: jest.Mocked<UserFinder>;

  beforeEach(() => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;
    finder = { byId: jest.fn() } as unknown as jest.Mocked<UserFinder>;
    strategy = new JwtStrategy(config, finder);
  });

  it('returns the user when found and not banned', async () => {
    const user = { id: 'u1', banned: false, role: UserRole.USER } as User;
    finder.byId.mockResolvedValue(user);

    await expect(strategy.validate({ sub: 'u1', role: 'USER' })).resolves.toBe(
      user,
    );
  });

  it('throws UnauthorizedException when user is missing', async () => {
    finder.byId.mockRejectedValue(new NotFoundException());
    await expect(
      strategy.validate({ sub: 'missing', role: 'USER' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user is banned', async () => {
    finder.byId.mockResolvedValue({ banned: true } as User);
    await expect(
      strategy.validate({ sub: 'u1', role: 'USER' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

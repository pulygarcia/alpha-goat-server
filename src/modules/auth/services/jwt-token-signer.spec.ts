import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../users/domain/user-role.enum';
import { User } from '../../users/domain/user.entity';
import { JwtTokenSigner } from './jwt-token-signer';

describe('JwtTokenSigner', () => {
  let signer: JwtTokenSigner;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtTokenSigner,
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    signer = module.get(JwtTokenSigner);
    jwt = module.get(JwtService);
  });

  it('signs a token with sub and role', async () => {
    jwt.signAsync.mockResolvedValue('token');
    const user = { id: 'u1', role: UserRole.USER } as User;

    const token = await signer.sign(user);

    expect(token).toBe('token');
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      role: UserRole.USER,
    });
  });
});

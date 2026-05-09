import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/domain/user-role.enum';
import { User } from '../../users/domain/user.entity';
import { PasswordHasher } from './password-hasher';
import { UserRegistrar } from './user-registrar';

describe('UserRegistrar', () => {
  let registrar: UserRegistrar;
  let repo: jest.Mocked<Repository<User>>;
  let hasher: jest.Mocked<PasswordHasher>;

  const dto = { email: 'Foo@Bar.com', username: 'puly', password: 'secret123' };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserRegistrar,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        { provide: PasswordHasher, useValue: { hash: jest.fn() } },
      ],
    }).compile();

    registrar = module.get(UserRegistrar);
    repo = module.get(getRepositoryToken(User));
    hasher = module.get(PasswordHasher);
  });

  it('creates a USER with hashed password and lowercased email', async () => {
    repo.findOne.mockResolvedValue(null);
    hasher.hash.mockResolvedValue('hashed');
    const created = { id: 'u1' } as User;
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(created);

    const result = await registrar.execute(dto);

    expect(result).toBe(created);
    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(repo.create).toHaveBeenCalledWith({
      email: 'foo@bar.com',
      username: 'puly',
      passwordHash: 'hashed',
      role: UserRole.USER,
    });
  });

  it('throws ConflictException when email already exists', async () => {
    repo.findOne.mockResolvedValue({ email: 'foo@bar.com' } as User);

    await expect(registrar.execute(dto)).rejects.toThrow(/email/);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws ConflictException when username already exists', async () => {
    repo.findOne.mockResolvedValue({ email: 'other@x.com', username: 'puly' } as User);

    await expect(registrar.execute(dto)).rejects.toThrow(/username/);
  });

  it('rejects with ConflictException type', async () => {
    repo.findOne.mockResolvedValue({ email: 'foo@bar.com' } as User);
    await expect(registrar.execute(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});

import { Test } from '@nestjs/testing';
import { UserRole } from './domain/user-role.enum';
import { User } from './domain/user.entity';
import { UserFinder } from './services/user-finder';
import { UserPasswordChanger } from './services/user-password-changer';
import { UserUpdater } from './services/user-updater';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let finder: jest.Mocked<UserFinder>;
  let updater: jest.Mocked<UserUpdater>;
  let changer: jest.Mocked<UserPasswordChanger>;

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
      controllers: [UsersController],
      providers: [
        { provide: UserFinder, useValue: { byId: jest.fn() } },
        { provide: UserUpdater, useValue: { execute: jest.fn() } },
        { provide: UserPasswordChanger, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(UsersController);
    finder = module.get(UserFinder);
    updater = module.get(UserUpdater);
    changer = module.get(UserPasswordChanger);
  });

  it('findOne returns user response', async () => {
    finder.byId.mockResolvedValue(user);
    const res = await controller.findOne('u1');
    expect(res.id).toBe('u1');
  });

  it('updateMe forwards userId and dto to updater', async () => {
    updater.execute.mockResolvedValue({ ...user, username: 'new' });
    const res = await controller.updateMe('u1', { username: 'new' });
    expect(updater.execute).toHaveBeenCalledWith('u1', { username: 'new' });
    expect(res.username).toBe('new');
  });

  it('changePassword forwards to changer', async () => {
    changer.execute.mockResolvedValue();
    await controller.changePassword('u1', {
      currentPassword: 'old',
      newPassword: 'newpass1',
    });
    expect(changer.execute).toHaveBeenCalledWith('u1', {
      currentPassword: 'old',
      newPassword: 'newpass1',
    });
  });
});

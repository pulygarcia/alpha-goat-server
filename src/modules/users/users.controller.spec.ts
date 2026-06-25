import { Test } from '@nestjs/testing';
import { UserRole } from './domain/user-role.enum';
import { User } from './domain/user.entity';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { AvatarUpdater } from './services/avatar-updater';
import { UserFinder } from './services/user-finder';
import { UserPasswordChanger } from './services/user-password-changer';
import { UserProfileAssembler } from './services/user-profile-assembler';
import { UserUpdater } from './services/user-updater';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let finder: jest.Mocked<UserFinder>;
  let updater: jest.Mocked<UserUpdater>;
  let changer: jest.Mocked<UserPasswordChanger>;
  let profiles: jest.Mocked<UserProfileAssembler>;
  let avatarUpdater: jest.Mocked<AvatarUpdater>;

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
        {
          provide: UserProfileAssembler,
          useValue: { byUsername: jest.fn() },
        },
        { provide: AvatarUpdater, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(UsersController);
    finder = module.get(UserFinder);
    updater = module.get(UserUpdater);
    changer = module.get(UserPasswordChanger);
    profiles = module.get(UserProfileAssembler);
    avatarUpdater = module.get(AvatarUpdater);
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

  it('profileByUsername forwards the viewer id when authenticated', async () => {
    const dto = { username: 'puly' } as ProfileResponseDto;
    profiles.byUsername.mockResolvedValue(dto);

    const res = await controller.profileByUsername('puly', user);

    expect(profiles.byUsername).toHaveBeenCalledWith('puly', 'u1');
    expect(res).toBe(dto);
  });

  it('uploadAvatar forwards the user id and file buffer, returns updated user', async () => {
    const buffer = Buffer.from('img');
    avatarUpdater.execute.mockResolvedValue({
      ...user,
      avatarUrl: 'https://cdn/avatars/u1.png',
    });

    const res = await controller.uploadAvatar('u1', {
      buffer,
    } as Express.Multer.File);

    expect(avatarUpdater.execute).toHaveBeenCalledWith('u1', buffer);
    expect(res.avatarUrl).toBe('https://cdn/avatars/u1.png');
  });

  it('profileByUsername passes undefined viewer for anonymous requests', async () => {
    profiles.byUsername.mockResolvedValue({} as ProfileResponseDto);

    await controller.profileByUsername('puly', undefined);

    expect(profiles.byUsername).toHaveBeenCalledWith('puly', undefined);
  });
});

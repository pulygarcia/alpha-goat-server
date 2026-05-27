import { Test } from '@nestjs/testing';
import { User } from '../users/domain/user.entity';
import { FollowsController } from './follows.controller';
import { FollowToggler } from './services/follow-toggler';

describe('FollowsController', () => {
  let controller: FollowsController;
  let toggler: jest.Mocked<FollowToggler>;

  const user = { id: 'a' } as User;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [FollowsController],
      providers: [
        { provide: FollowToggler, useValue: { follow: jest.fn(), unfollow: jest.fn() } },
      ],
    }).compile();
    controller = module.get(FollowsController);
    toggler = module.get(FollowToggler);
  });

  it('follow forwards follower and target', async () => {
    toggler.follow.mockResolvedValue();
    await controller.follow('b', user);
    expect(toggler.follow).toHaveBeenCalledWith('a', 'b');
  });

  it('unfollow forwards follower and target', async () => {
    toggler.unfollow.mockResolvedValue();
    await controller.unfollow('b', user);
    expect(toggler.unfollow).toHaveBeenCalledWith('a', 'b');
  });
});

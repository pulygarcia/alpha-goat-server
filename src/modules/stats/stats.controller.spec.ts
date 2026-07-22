import { Test } from '@nestjs/testing';
import { GlobalStatsFinder } from './services/global-stats-finder';
import { StatsController } from './stats.controller';

describe('StatsController', () => {
  let controller: StatsController;
  let finder: jest.Mocked<GlobalStatsFinder>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        { provide: GlobalStatsFinder, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(StatsController);
    finder = module.get(GlobalStatsFinder);
  });

  it('global returns the response dto built from the finder result', async () => {
    finder.execute.mockResolvedValue({
      reviewsTotal: 512,
      alfajoresTotal: 128,
      usersTotal: 340,
      alfajoresContributedByUsers: 47,
    });

    const res = await controller.global();

    expect(res).toEqual({
      reviewsTotal: 512,
      alfajoresTotal: 128,
      usersTotal: 340,
      alfajoresContributedByUsers: 47,
    });
  });
});

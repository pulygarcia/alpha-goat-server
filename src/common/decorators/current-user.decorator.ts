import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/users/domain/user.entity';

export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<{ user: User }>().user;
    return field ? user?.[field] : user;
  },
);

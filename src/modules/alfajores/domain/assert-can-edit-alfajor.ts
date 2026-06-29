import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/domain/user-role.enum';
import { Alfajor } from './alfajor.entity';
import { AlfajorStatus } from './alfajor-status.enum';

export interface ActorContext {
  id: string;
  role: UserRole;
}

// Authorization rule shared by alfajor mutations: an admin may always act; the
// creator may act only while the alfajor is still PENDING.
export function assertCanEditAlfajor(
  alfajor: Alfajor,
  actor: ActorContext,
): void {
  if (actor.role === UserRole.ADMIN) return;

  const isOwner = alfajor.createdById === actor.id;
  const isPending = alfajor.status === AlfajorStatus.PENDING;
  if (!isOwner || !isPending) {
    throw new ForbiddenException(
      'only the creator can edit while the alfajor is pending',
    );
  }
}

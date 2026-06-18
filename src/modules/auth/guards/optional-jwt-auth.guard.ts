import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Como `JwtAuthGuard` pero NO rechaza anónimos: si hay una cookie/token válido
 * popula `req.user`, y si no, deja pasar con `user` undefined. Útil para
 * endpoints públicos que personalizan la respuesta cuando hay sesión.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    return (user || undefined) as TUser;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../users/domain/user.entity';
import { UserFinder } from '../../users/services/user-finder';
import { ACCESS_TOKEN_COOKIE } from '../auth.cookie';
import { JwtPayload } from '../services/jwt-token-signer';

function cookieExtractor(req: Request): string | null {
  const raw: unknown = (req as Request & { cookies?: Record<string, unknown> }).cookies?.[
    ACCESS_TOKEN_COOKIE
  ];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly finder: UserFinder) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.finder.byId(payload.sub).catch(() => null);
    if (!user || user.banned) throw new UnauthorizedException();
    return user;
  }
}

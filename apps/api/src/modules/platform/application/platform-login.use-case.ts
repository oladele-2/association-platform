import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../identity/application/ports/password-hasher';
import {
  PLATFORM_USER_REPOSITORY,
  type PlatformUserRepository,
} from './ports/platform-user.repository';
import { PLATFORM_TOKEN_SERVICE, type PlatformTokenService } from './ports/platform-token.service';

export type PlatformLoginCommand = {
  email: string;
  password: string;
};

@Injectable()
export class PlatformLoginUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY) private readonly users: PlatformUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(PLATFORM_TOKEN_SERVICE) private readonly tokens: PlatformTokenService,
  ) {}

  async execute(cmd: PlatformLoginCommand) {
    const email = cmd.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    const valid = user ? await this.hasher.verify(user.passwordHash, cmd.password) : false;
    if (!user || !valid) {
      throw new DomainError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    user.assertCanLogin();
    await this.users.touchLastLogin(user.id, new Date());
    const access = await this.tokens.sign({
      sub: user.id,
      email: user.email,
      roles: [...user.roleKeys],
    });
    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roleKeys,
      },
    };
  }
}

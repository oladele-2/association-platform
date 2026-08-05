import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from './ports/refresh-token.repository';

@Injectable()
export class LogoutUseCase {
  constructor(@Inject(REFRESH_TOKEN_REPOSITORY) private readonly refresh: RefreshTokenRepository) {}

  async execute(refreshToken: string | undefined): Promise<{ ok: true }> {
    if (refreshToken) {
      await this.refresh.revokeByRawToken(refreshToken, new Date());
    }
    return { ok: true };
  }
}

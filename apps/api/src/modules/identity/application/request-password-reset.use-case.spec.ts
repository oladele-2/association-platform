import { describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../domain/auth-user';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import type { UserRepository } from './ports/user.repository';
import type { PasswordResetTokenRepository } from './ports/password-reset-token.repository';
import type { EmailSender } from './ports/email.sender';

function buildUser() {
  return AuthUser.restore({
    id: '11111111-1111-1111-1111-111111111111',
    organizationId: '22222222-2222-2222-2222-222222222222',
    email: 'member@example.com',
    passwordHash: 'argon-hash',
    status: 'active',
    emailVerifiedAt: new Date(),
    mustResetPassword: false,
  });
}

describe('RequestPasswordResetUseCase', () => {
  it('returns ok and does not send email for unknown users', async () => {
    const users: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      save: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    const resets: PasswordResetTokenRepository = {
      issue: vi.fn(),
      consume: vi.fn(),
    };
    const email: EmailSender = { send: vi.fn() };
    const usecase = new RequestPasswordResetUseCase(users, resets, email);

    await expect(
      usecase.execute({
        organizationId: 'o',
        email: 'ghost@example.com',
        appPublicUrl: 'http://localhost:5173',
        organizationSlug: 'nma-ogun',
      }),
    ).resolves.toEqual({ ok: true });
    expect(resets.issue).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('issues token and emails when user exists', async () => {
    const user = buildUser();
    const users: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(user),
      findById: vi.fn(),
      save: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    const resets: PasswordResetTokenRepository = {
      issue: vi.fn().mockResolvedValue({ rawToken: 'reset-raw' }),
      consume: vi.fn(),
    };
    const email: EmailSender = { send: vi.fn().mockResolvedValue(undefined) };
    const usecase = new RequestPasswordResetUseCase(users, resets, email);

    await expect(
      usecase.execute({
        organizationId: user.organizationId,
        email: user.email,
        appPublicUrl: 'http://localhost:5173',
        organizationSlug: 'nma-ogun',
      }),
    ).resolves.toEqual({ ok: true });
    expect(resets.issue).toHaveBeenCalled();
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        text: expect.stringContaining('reset-raw'),
      }),
    );
  });
});

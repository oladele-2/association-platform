import { createSign } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../../config/env.validation';
import type { PushProvider, PushSendResult } from '../application/ports/comms.repository';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

/**
 * FCM HTTP v1 sender (no firebase-admin dependency).
 * Uses a short-lived Google OAuth access token from the service account.
 */
@Injectable()
export class FcmPushProvider implements PushProvider {
  readonly driver = 'fcm' as const;
  private readonly logger = new Logger(FcmPushProvider.name);
  private readonly projectId: string;
  private readonly account: ServiceAccount;
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(config: ConfigService<AppEnv, true>) {
    this.projectId = config.get('FIREBASE_PROJECT_ID', { infer: true })!;
    this.account = JSON.parse(
      config.get('FIREBASE_SERVICE_ACCOUNT_JSON', { infer: true })!,
    ) as ServiceAccount;
  }

  async send(input: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<PushSendResult> {
    if (input.tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];
    const accessToken = await this.getAccessToken();

    // Sequential sends keep the slice simple; batch API can come later.
    for (const token of input.tokens) {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: input.title, body: input.body },
                data: stringifyData(input.data),
              },
            }),
          },
        );
        if (res.ok) {
          successCount += 1;
          continue;
        }
        failureCount += 1;
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: { status?: string; details?: Array<{ errorCode?: string }> };
        };
        const code =
          errBody.error?.details?.find((d) => d.errorCode)?.errorCode ||
          errBody.error?.status ||
          '';
        if (isPermanentTokenFailure(code, res.status)) {
          invalidTokens.push(token);
        }
        this.logger.warn(`FCM send failed (${res.status}): ${code || res.statusText}`);
      } catch (err) {
        failureCount += 1;
        this.logger.warn(`FCM send error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { successCount, failureCount, invalidTokens };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = base64Url(
      JSON.stringify({
        iss: this.account.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: this.account.token_uri || 'https://oauth2.googleapis.com/token',
        iat,
        exp,
      }),
    );
    const unsigned = `${header}.${claim}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = base64Url(signer.sign(this.account.private_key.replace(/\\n/g, '\n')));
    const jwt = `${unsigned}.${signature}`;

    const tokenUri = this.account.token_uri || 'https://oauth2.googleapis.com/token';
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });
    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new Error(`Failed to obtain FCM access token (${res.status})`);
    }
    const json = (await res.json()) as { access_token: string; expires_in?: number };
    this.accessToken = json.access_token;
    this.accessTokenExpiresAt = now + (json.expires_in ?? 3600) * 1000;
    return this.accessToken;
  }
}

function stringifyData(data?: Record<string, string>): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = String(v);
  }
  return out;
}

function isPermanentTokenFailure(code: string, status: number): boolean {
  const permanent = new Set([
    'UNREGISTERED',
    'INVALID_ARGUMENT',
    'NOT_FOUND',
    'SENDER_ID_MISMATCH',
  ]);
  if (permanent.has(code)) return true;
  return status === 404;
}

function base64Url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import type { AppEnv } from '../../config/env.validation';
import {
  COMMS_REPOSITORY,
  EMAIL_PROVIDER,
  PUSH_PROVIDER,
  type EmailProvider,
  type PushProvider,
} from './application/ports/comms.repository';
import {
  CreateEmailCampaignUseCase,
  DrainEmailDeliveriesUseCase,
  FanOutPushUseCase,
  GetEmailCampaignUseCase,
  ListEmailCampaignsUseCase,
  ListEmailTemplatesUseCase,
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  QueueEmailCampaignUseCase,
  RegisterDeviceTokenUseCase,
  RevokeDeviceTokenUseCase,
  UpsertEmailTemplateUseCase,
} from './application/comms.use-cases';
import { PrismaCommsRepository } from './infrastructure/prisma-comms.repository';
import { MockEmailProvider } from './infrastructure/mock-email.provider';
import { SmtpEmailProvider } from './infrastructure/smtp-email.provider';
import { MockPushProvider } from './infrastructure/mock-push.provider';
import { FcmPushProvider } from './infrastructure/fcm-push.provider';
import { EmailDeliveryDrainService } from './infrastructure/email-delivery-drain.service';
import { AdminCommsController } from './presentation/admin-comms.controller';
import { MeNotificationsController } from './presentation/me-notifications.controller';
import { MeDeviceTokensController } from './presentation/me-device-tokens.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminCommsController, MeNotificationsController, MeDeviceTokensController],
  providers: [
    { provide: COMMS_REPOSITORY, useClass: PrismaCommsRepository },
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>): EmailProvider => {
        return config.get('EMAIL_DRIVER', { infer: true }) === 'smtp'
          ? new SmtpEmailProvider(config)
          : new MockEmailProvider();
      },
    },
    {
      provide: PUSH_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>): PushProvider => {
        return config.get('PUSH_DRIVER', { infer: true }) === 'fcm'
          ? new FcmPushProvider(config)
          : new MockPushProvider();
      },
    },
    ListEmailTemplatesUseCase,
    UpsertEmailTemplateUseCase,
    ListEmailCampaignsUseCase,
    GetEmailCampaignUseCase,
    CreateEmailCampaignUseCase,
    QueueEmailCampaignUseCase,
    DrainEmailDeliveriesUseCase,
    EmailDeliveryDrainService,
    ListMyNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    RegisterDeviceTokenUseCase,
    RevokeDeviceTokenUseCase,
    FanOutPushUseCase,
  ],
  exports: [FanOutPushUseCase],
})
export class CommsModule {}

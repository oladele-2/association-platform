import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { COMMS_REPOSITORY, EMAIL_PROVIDER } from './application/ports/comms.repository';
import {
  CreateEmailCampaignUseCase,
  GetEmailCampaignUseCase,
  ListEmailCampaignsUseCase,
  ListEmailTemplatesUseCase,
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  QueueEmailCampaignUseCase,
  UpsertEmailTemplateUseCase,
} from './application/comms.use-cases';
import { PrismaCommsRepository } from './infrastructure/prisma-comms.repository';
import { MockEmailProvider } from './infrastructure/mock-email.provider';
import { AdminCommsController } from './presentation/admin-comms.controller';
import { MeNotificationsController } from './presentation/me-notifications.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminCommsController, MeNotificationsController],
  providers: [
    { provide: COMMS_REPOSITORY, useClass: PrismaCommsRepository },
    { provide: EMAIL_PROVIDER, useClass: MockEmailProvider },
    ListEmailTemplatesUseCase,
    UpsertEmailTemplateUseCase,
    ListEmailCampaignsUseCase,
    GetEmailCampaignUseCase,
    CreateEmailCampaignUseCase,
    QueueEmailCampaignUseCase,
    ListMyNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
  ],
})
export class CommsModule {}

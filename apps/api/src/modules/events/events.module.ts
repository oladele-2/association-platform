import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { EVENT_REPOSITORY } from './application/ports/event.repository';
import {
  CancelEventUseCase,
  CreateEventUseCase,
  DeleteEventUseCase,
  GetEventUseCase,
  ListEventsUseCase,
  PublishEventUseCase,
  ReplaceEventSpeakersUseCase,
  UpdateEventUseCase,
} from './application/event.use-cases';
import { PrismaEventRepository } from './infrastructure/prisma-event.repository';
import { AdminEventsController } from './presentation/admin-events.controller';
import { PublicEventsController } from './presentation/public-events.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminEventsController, PublicEventsController],
  providers: [
    { provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
    ListEventsUseCase,
    GetEventUseCase,
    CreateEventUseCase,
    UpdateEventUseCase,
    DeleteEventUseCase,
    PublishEventUseCase,
    CancelEventUseCase,
    ReplaceEventSpeakersUseCase,
  ],
})
export class EventsModule {}

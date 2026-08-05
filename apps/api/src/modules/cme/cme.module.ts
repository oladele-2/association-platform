import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { FilesModule } from '../files/files.module';
import { CommsModule } from '../comms/comms.module';
import { CME_REPOSITORY } from './application/ports/cme.repository';
import {
  ApproveCmeUseCase,
  GetCmeSubmissionUseCase,
  ListCmeSubmissionsUseCase,
  ListMyCmeUseCase,
  RejectCmeUseCase,
  SubmitCmeUseCase,
} from './application/cme.use-cases';
import { PrismaCmeRepository } from './infrastructure/prisma-cme.repository';
import { AdminCmeController } from './presentation/admin-cme.controller';
import { MeCmeController } from './presentation/me-cme.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule, FilesModule, CommsModule],
  controllers: [AdminCmeController, MeCmeController],
  providers: [
    { provide: CME_REPOSITORY, useClass: PrismaCmeRepository },
    ListCmeSubmissionsUseCase,
    GetCmeSubmissionUseCase,
    SubmitCmeUseCase,
    ApproveCmeUseCase,
    RejectCmeUseCase,
    ListMyCmeUseCase,
  ],
})
export class CmeModule {}

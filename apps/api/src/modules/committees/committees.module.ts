import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { COMMITTEE_REPOSITORY } from './application/ports/committee.repository';
import {
  CreateCommitteeUseCase,
  DeleteCommitteeUseCase,
  GetCommitteeUseCase,
  ListCommitteesUseCase,
  ReplaceCommitteeMembersUseCase,
  UpdateCommitteeUseCase,
} from './application/committee.use-cases';
import { PrismaCommitteeRepository } from './infrastructure/prisma-committee.repository';
import { AdminCommitteesController } from './presentation/admin-committees.controller';
import { PublicCommitteesController } from './presentation/public-committees.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminCommitteesController, PublicCommitteesController],
  providers: [
    { provide: COMMITTEE_REPOSITORY, useClass: PrismaCommitteeRepository },
    ListCommitteesUseCase,
    GetCommitteeUseCase,
    CreateCommitteeUseCase,
    UpdateCommitteeUseCase,
    DeleteCommitteeUseCase,
    ReplaceCommitteeMembersUseCase,
  ],
})
export class CommitteesModule {}

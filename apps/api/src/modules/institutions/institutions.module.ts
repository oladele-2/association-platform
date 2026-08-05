import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { INSTITUTION_REPOSITORY } from './application/ports/institution.repository';
import {
  AssertInstitutionAdminAccessUseCase,
  AssignInstitutionAdminUseCase,
  CreateInstitutionUseCase,
  DeleteInstitutionUseCase,
  GetInstitutionUseCase,
  LinkInstitutionMemberUseCase,
  ListInstitutionAdminsUseCase,
  ListInstitutionMembersUseCase,
  ListInstitutionsUseCase,
  ListMyInstitutionsUseCase,
  RevokeInstitutionAdminUseCase,
  UnlinkInstitutionMemberUseCase,
  UpdateInstitutionMemberLinkUseCase,
  UpdateInstitutionUseCase,
} from './application/institution.use-cases';
import { PrismaInstitutionRepository } from './infrastructure/prisma-institution.repository';
import { AdminInstitutionsController } from './presentation/admin-institutions.controller';
import { InstitutionPortalController } from './presentation/institution-portal.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminInstitutionsController, InstitutionPortalController],
  providers: [
    { provide: INSTITUTION_REPOSITORY, useClass: PrismaInstitutionRepository },
    ListInstitutionsUseCase,
    GetInstitutionUseCase,
    CreateInstitutionUseCase,
    UpdateInstitutionUseCase,
    DeleteInstitutionUseCase,
    ListInstitutionAdminsUseCase,
    AssignInstitutionAdminUseCase,
    RevokeInstitutionAdminUseCase,
    ListInstitutionMembersUseCase,
    LinkInstitutionMemberUseCase,
    UpdateInstitutionMemberLinkUseCase,
    UnlinkInstitutionMemberUseCase,
    ListMyInstitutionsUseCase,
    AssertInstitutionAdminAccessUseCase,
  ],
  exports: [INSTITUTION_REPOSITORY, AssertInstitutionAdminAccessUseCase],
})
export class InstitutionsModule {}

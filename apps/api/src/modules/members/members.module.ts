import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { FilesModule } from '../files/files.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { MEMBER_REPOSITORY } from './application/ports/member.repository';
import {
  ActivateMemberUseCase,
  CreateFieldDefinitionUseCase,
  CreateMemberUseCase,
  CreateMembershipTypeUseCase,
  DeleteFieldDefinitionUseCase,
  DeleteMemberUseCase,
  GetMemberUseCase,
  GetMyProfileUseCase,
  ListFieldDefinitionsUseCase,
  ListMembersUseCase,
  ListMembershipTypesUseCase,
  SetMemberExemptionUseCase,
  SuspendMemberUseCase,
  UpdateFieldDefinitionUseCase,
  UpdateMemberUseCase,
  UpdateMembershipTypeUseCase,
  UpdateMyProfileUseCase,
} from './application/member.use-cases';
import {
  GetPublicRegistrationCatalogUseCase,
  SubmitPublicRegistrationUseCase,
} from './application/public-registration.use-cases';
import { PrismaMemberRepository } from './infrastructure/prisma-member.repository';
import { AdminMembersController } from './presentation/admin-members.controller';
import { MeProfileController } from './presentation/me-profile.controller';
import { PublicRegistrationController } from './presentation/public-registration.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule, FilesModule, InstitutionsModule],
  controllers: [AdminMembersController, MeProfileController, PublicRegistrationController],
  providers: [
    { provide: MEMBER_REPOSITORY, useClass: PrismaMemberRepository },
    ListMembershipTypesUseCase,
    CreateMembershipTypeUseCase,
    UpdateMembershipTypeUseCase,
    ListMembersUseCase,
    GetMemberUseCase,
    CreateMemberUseCase,
    UpdateMemberUseCase,
    ActivateMemberUseCase,
    SuspendMemberUseCase,
    SetMemberExemptionUseCase,
    DeleteMemberUseCase,
    GetMyProfileUseCase,
    UpdateMyProfileUseCase,
    ListFieldDefinitionsUseCase,
    CreateFieldDefinitionUseCase,
    UpdateFieldDefinitionUseCase,
    DeleteFieldDefinitionUseCase,
    GetPublicRegistrationCatalogUseCase,
    SubmitPublicRegistrationUseCase,
  ],
  exports: [MEMBER_REPOSITORY],
})
export class MembersModule {}

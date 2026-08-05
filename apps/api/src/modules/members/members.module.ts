import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
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
import { PrismaMemberRepository } from './infrastructure/prisma-member.repository';
import { AdminMembersController } from './presentation/admin-members.controller';
import { MeProfileController } from './presentation/me-profile.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminMembersController, MeProfileController],
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
  ],
  exports: [MEMBER_REPOSITORY],
})
export class MembersModule {}

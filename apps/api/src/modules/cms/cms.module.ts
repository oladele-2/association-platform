import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { CONTENT_REPOSITORY } from './application/ports/content.repository';
import {
  CreateContentUseCase,
  DeleteContentUseCase,
  GetContentUseCase,
  ListContentUseCase,
  PublishContentUseCase,
  UnpublishContentUseCase,
  UpdateContentUseCase,
} from './application/content.use-cases';
import { PrismaContentRepository } from './infrastructure/prisma-content.repository';
import { AdminContentController } from './presentation/admin-content.controller';
import { PublicContentController } from './presentation/public-content.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule],
  controllers: [AdminContentController, PublicContentController],
  providers: [
    { provide: CONTENT_REPOSITORY, useClass: PrismaContentRepository },
    ListContentUseCase,
    GetContentUseCase,
    CreateContentUseCase,
    UpdateContentUseCase,
    DeleteContentUseCase,
    PublishContentUseCase,
    UnpublishContentUseCase,
  ],
  exports: [CONTENT_REPOSITORY],
})
export class CmsModule {}

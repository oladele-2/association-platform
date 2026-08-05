import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { FilesModule } from '../files/files.module';
import { CONTENT_REPOSITORY } from './application/ports/content.repository';
import {
  CreateContentUseCase,
  DeleteContentUseCase,
  GetContentUseCase,
  ListContentUseCase,
  PublishContentUseCase,
  SubmitPublicContactUseCase,
  UnpublishContentUseCase,
  UpdateContentUseCase,
} from './application/content.use-cases';
import { PrismaContentRepository } from './infrastructure/prisma-content.repository';
import { AdminContentController } from './presentation/admin-content.controller';
import { PublicContentController } from './presentation/public-content.controller';
import { PublicContactController } from './presentation/public-contact.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule, FilesModule],
  controllers: [AdminContentController, PublicContentController, PublicContactController],
  providers: [
    { provide: CONTENT_REPOSITORY, useClass: PrismaContentRepository },
    ListContentUseCase,
    GetContentUseCase,
    CreateContentUseCase,
    UpdateContentUseCase,
    DeleteContentUseCase,
    PublishContentUseCase,
    UnpublishContentUseCase,
    SubmitPublicContactUseCase,
  ],
  exports: [CONTENT_REPOSITORY],
})
export class CmsModule {}

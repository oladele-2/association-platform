import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { FILE_REPOSITORY, OBJECT_STORAGE } from './application/ports/file.repository';
import {
  ConfirmUploadUseCase,
  CreateUploadUrlUseCase,
  DeleteFileUseCase,
  GetDownloadUrlUseCase,
  GetReadyFileUseCase,
} from './application/file.use-cases';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';
import { MockObjectStorage } from './infrastructure/mock-object.storage';
import { isR2Configured, R2ObjectStorage } from './infrastructure/r2-object.storage';
import { FilesController } from './presentation/files.controller';
import { MePhotographController } from './presentation/me-photograph.controller';

@Module({
  imports: [IdentityModule, TenancyModule],
  controllers: [FilesController, MePhotographController],
  providers: [
    { provide: FILE_REPOSITORY, useClass: PrismaFileRepository },
    {
      provide: OBJECT_STORAGE,
      useFactory: () => (isR2Configured() ? new R2ObjectStorage() : new MockObjectStorage()),
    },
    CreateUploadUrlUseCase,
    ConfirmUploadUseCase,
    GetDownloadUrlUseCase,
    GetReadyFileUseCase,
    DeleteFileUseCase,
  ],
  exports: [GetReadyFileUseCase, FILE_REPOSITORY, OBJECT_STORAGE],
})
export class FilesModule {}

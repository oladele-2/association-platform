import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PlatformModule } from './modules/platform/platform.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { CmsModule } from './modules/cms/cms.module';
import { EventsModule } from './modules/events/events.module';
import { CommitteesModule } from './modules/committees/committees.module';
import { MembersModule } from './modules/members/members.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { BillingModule } from './modules/billing/billing.module';
import { FilesModule } from './modules/files/files.module';
import { CmeModule } from './modules/cme/cme.module';
import { CommsModule } from './modules/comms/comms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    TenancyModule,
    IdentityModule,
    PlatformModule,
    RbacModule,
    FilesModule,
    MembersModule,
    InstitutionsModule,
    BillingModule,
    CmeModule,
    CommsModule,
    CmsModule,
    EventsModule,
    CommitteesModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}

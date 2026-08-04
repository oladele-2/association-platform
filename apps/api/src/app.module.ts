import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Milestone 1 host module. Bounded-context modules (identity, tenancy, …)
 * are added from Milestone 3 onward using presentation/application/domain/infrastructure.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}

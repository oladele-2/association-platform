import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../../config/env.validation';
import { DrainEmailDeliveriesUseCase } from '../application/comms.use-cases';

@Injectable()
export class EmailDeliveryDrainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailDeliveryDrainService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly drain: DrainEmailDeliveriesUseCase,
  ) {}

  onModuleInit() {
    const ms = this.config.get('EMAIL_DRAIN_INTERVAL_MS', { infer: true });
    if (ms <= 0) {
      this.logger.log('Email delivery drain disabled (EMAIL_DRAIN_INTERVAL_MS=0)');
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, ms);
    this.logger.log(`Email delivery drain every ${ms}ms`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.drain.execute(20);
      if (result.claimed > 0) {
        this.logger.log(
          `Drained ${result.claimed} deliveries (sent=${result.sent} failed=${result.failed})`,
        );
      }
    } catch (err) {
      this.logger.error(`Drain failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.running = false;
    }
  }
}

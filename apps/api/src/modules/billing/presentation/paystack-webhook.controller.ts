import { Controller, Headers, Post, Req, UseFilters } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { HandlePaystackWebhookUseCase } from '../application/billing.use-cases';

@ApiTags('webhooks')
@ApiExcludeController()
@UseFilters(DomainErrorFilter)
@Controller('webhooks')
export class PaystackWebhookController {
  constructor(private readonly handleWebhook: HandlePaystackWebhookUseCase) {}

  @Post('paystack')
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));

    return this.handleWebhook.execute({
      rawBody,
      signature,
      event: req.body,
    });
  }
}

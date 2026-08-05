import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness / foundation health check' })
  @ApiOkResponse({
    description: 'Service is up',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string' },
        milestone: { type: 'number', example: 0 },
      },
    },
  })
  getHealth() {
    return this.healthService.getStatus();
  }
}

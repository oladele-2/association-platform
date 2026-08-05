import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { ProvisionOrganizationUseCase } from '../application/provision-organization.use-case';
import {
  ActivateOrganizationUseCase,
  GetOrganizationUseCase,
  ListOrganizationsUseCase,
  UpdateOrganizationUseCase,
} from '../application/organization-lifecycle.use-case';
import {
  AddOrganizationDomainUseCase,
  ListOrganizationDomainsUseCase,
  VerifyOrganizationDomainUseCase,
} from '../application/organization-domain.use-case';
import {
  GetOrganizationBrandingUseCase,
  ListOrganizationFeaturesUseCase,
  UpsertOrganizationBrandingUseCase,
  UpsertOrganizationFeatureUseCase,
} from '../application/organization-features-branding.use-case';
import { SeedOrganizationRolesUseCase } from '../../rbac/application/seed-rbac.use-case';
import { PlatformJwtGuard } from './platform-jwt.guard';
import {
  AddDomainDto,
  ProvisionOrganizationDto,
  UpdateOrganizationDto,
  UpsertBrandingDto,
  UpsertFeatureDto,
  VerifyDomainDto,
} from './platform.dto';
import type { OrganizationStatus } from '../application/ports/organization-admin.repository';

@ApiTags('platform-organizations')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('platform/organizations')
export class PlatformOrganizationsController {
  constructor(
    private readonly provision: ProvisionOrganizationUseCase,
    private readonly listOrgs: ListOrganizationsUseCase,
    private readonly getOrg: GetOrganizationUseCase,
    private readonly updateOrg: UpdateOrganizationUseCase,
    private readonly activateOrg: ActivateOrganizationUseCase,
    private readonly addDomain: AddOrganizationDomainUseCase,
    private readonly listDomains: ListOrganizationDomainsUseCase,
    private readonly verifyDomain: VerifyOrganizationDomainUseCase,
    private readonly upsertFeature: UpsertOrganizationFeatureUseCase,
    private readonly listFeatures: ListOrganizationFeaturesUseCase,
    private readonly upsertBranding: UpsertOrganizationBrandingUseCase,
    private readonly getBranding: GetOrganizationBrandingUseCase,
    private readonly seedRoles: SeedOrganizationRolesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  list(@Query('status') status?: OrganizationStatus) {
    return this.listOrgs.execute(status);
  }

  @Post()
  @ApiOperation({
    summary: 'Provision organization with default features, branding, trial, and system roles',
  })
  create(@Body() body: ProvisionOrganizationDto) {
    return this.provision.execute(body);
  }

  @Post(':id/seed-roles')
  @ApiOperation({ summary: 'Re-seed system RBAC roles for an existing organization' })
  seedOrgRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.seedRoles.execute(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Organization detail (domains, features, branding, subscription)' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrg.execute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization metadata / status' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateOrganizationDto) {
    return this.updateOrg.execute({ id, ...body });
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Mark organization active' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.activateOrg.execute(id);
  }

  @Get(':id/domains')
  listOrgDomains(@Param('id', ParseUUIDPipe) id: string) {
    return this.listDomains.execute(id);
  }

  @Post(':id/domains')
  @ApiOperation({ summary: 'Attach hostname (returns verificationToken)' })
  createDomain(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddDomainDto) {
    return this.addDomain.execute({ organizationId: id, ...body });
  }

  @Post(':id/domains/:domainId/verify')
  @ApiOperation({ summary: 'Verify domain via token or force=true' })
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() body: VerifyDomainDto,
  ) {
    return this.verifyDomain.execute({
      organizationId: id,
      domainId,
      token: body.token,
      force: body.force,
    });
  }

  @Get(':id/features')
  features(@Param('id', ParseUUIDPipe) id: string) {
    return this.listFeatures.execute(id);
  }

  @Post(':id/features')
  @ApiOperation({ summary: 'Upsert organization feature flag' })
  setFeature(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpsertFeatureDto) {
    return this.upsertFeature.execute({ organizationId: id, ...body });
  }

  @Get(':id/branding')
  branding(@Param('id', ParseUUIDPipe) id: string) {
    return this.getBranding.execute(id);
  }

  @Patch(':id/branding')
  @ApiOperation({ summary: 'Upsert branding (colors, email from, social links)' })
  setBranding(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpsertBrandingDto) {
    return this.upsertBranding.execute({ organizationId: id, ...body });
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'custom_officer' })
  @IsString()
  @MinLength(2)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ type: [String], example: ['members.read'] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];
}

export class RenameRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}

export enum RoleScopeTypeDto {
  organization = 'organization',
  institution = 'institution',
  committee = 'committee',
}

export class AssignUserRoleDto {
  @ApiProperty()
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ enum: RoleScopeTypeDto })
  @IsOptional()
  @IsEnum(RoleScopeTypeDto)
  scopeType?: RoleScopeTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scopeId?: string;
}

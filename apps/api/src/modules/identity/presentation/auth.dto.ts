import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({
    description: 'Opaque refresh token (optional if sent via httpOnly cookie)',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class RequestPasswordResetDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  newPassword!: string;
}

export class ConfirmEmailVerificationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;
}

export class AuthSessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  accessTokenExpiresIn!: number;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  refreshTokenExpiresAt!: string;

  @ApiProperty()
  user!: {
    id: string;
    email: string;
    emailVerified: boolean;
    mustResetPassword: boolean;
    status: string;
  };
}

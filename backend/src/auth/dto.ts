import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['CUSTOMER', 'SELLER'])
  accountType!: 'CUSTOMER' | 'SELLER';
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class TokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class EmailDto {
  @IsEmail()
  email!: string;
}

export class RefreshDto extends TokenDto {}

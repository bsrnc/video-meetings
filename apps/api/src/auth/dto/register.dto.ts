import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  // bcrypt silently truncates input past 72 bytes; reject it instead.
  @MaxLength(72)
  password: string;
}

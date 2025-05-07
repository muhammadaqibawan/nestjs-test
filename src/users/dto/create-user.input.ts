import { IsEmail, IsStrongPassword } from 'class-validator';

export class CreateUserInput {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}

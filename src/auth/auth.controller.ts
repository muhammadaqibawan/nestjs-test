import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { User } from '../users/models/user.model';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginInput: LoginInput,
    @Res({ passthrough: true }) res: Response
  ): Promise<User> {
    return this.authService.login(loginInput, res);
  }
}

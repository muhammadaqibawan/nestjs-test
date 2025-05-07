import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserInput } from './dto/create-user.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Adapted for REST
import { User } from './models/user.model';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserInput: CreateUserInput): Promise<User> {
    return this.usersService.createUser(createUserInput);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(): Promise<User[]> {
    return this.usersService.getUsers();
  }
}

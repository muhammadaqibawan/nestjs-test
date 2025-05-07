import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { hash } from 'bcryptjs';
import { CreateUserInput } from './dto/create-user.input';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(data: CreateUserInput) {
    return this.prismaService.user.create({
      data: {
        ...data,
        password: await hash(data.password, 10),
      },
    });
  }

  async getUsers() {
    return this.prismaService.user.findMany();
  }

  async getUser(args) {
    return this.prismaService.user.findUniqueOrThrow({
      where: args,
    });
  }
}
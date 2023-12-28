import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcryptjs';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';



@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
  }



  async create(createAuthDto: CreateUserDto) {

    try {

      const { password, ...userData } = createAuthDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10)
      })

      await this.userRepository.save(user);

      return user;

    } catch (err) {
      this.handleDBError(err);
    }
  }


  private handleDBError(err: any): never {

    if (err.code === '23505') {
      throw new BadRequestException(err.detail)
    }

    throw new InternalServerErrorException('Please check server logs');
  }
}

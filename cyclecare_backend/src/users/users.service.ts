import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserHealthProfile } from './entities/user-health-profile.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateHealthProfileDto } from './dto/update-health-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserHealthProfile)
    private readonly healthProfileRepository: Repository<UserHealthProfile>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    // Create default health profile
    const profile = this.healthProfileRepository.create({ userId: savedUser.id });
    await this.healthProfileRepository.save(profile);

    return savedUser;
  }

  async update(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.softRemove(user);
  }

  async getHealthProfile(userId: string): Promise<UserHealthProfile> {
    const profile = await this.healthProfileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Health profile not found');
    return profile;
  }

  async updateHealthProfile(userId: string, updateData: UpdateHealthProfileDto): Promise<UserHealthProfile> {
    const profile = await this.getHealthProfile(userId);
    Object.assign(profile, updateData);
    return this.healthProfileRepository.save(profile);
  }
}

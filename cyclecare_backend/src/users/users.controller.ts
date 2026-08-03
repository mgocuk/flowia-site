import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateHealthProfileDto } from './dto/update-health-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@CurrentUser() user: any, @Body() updateData: UpdateUserDto) {
    return this.usersService.update(user.id, updateData);
  }

  @Get('me/health-profile')
  @ApiOperation({ summary: 'Get user health profile' })
  getHealthProfile(@CurrentUser() user: any) {
    return this.usersService.getHealthProfile(user.id);
  }

  @Put('me/health-profile')
  @ApiOperation({ summary: 'Update user health profile' })
  updateHealthProfile(@CurrentUser() user: any, @Body() updateData: UpdateHealthProfileDto) {
    return this.usersService.updateHealthProfile(user.id, updateData);
  }
}

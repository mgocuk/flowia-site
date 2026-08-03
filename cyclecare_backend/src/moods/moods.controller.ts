import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MoodsService } from './moods.service';
import { CreateMoodDto } from './dto/create-mood.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Moods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('moods')
export class MoodsController {
  constructor(private readonly moodsService: MoodsService) {}

  @Get()
  @ApiOperation({ summary: 'Get moods, optionally filter by month' })
  @ApiQuery({ name: 'month', required: false, example: '2023-10' })
  findAll(@CurrentUser() user: any, @Query('month') month?: string) {
    if (month) {
      return this.moodsService.findByMonth(user.id, month);
    }
    return this.moodsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create mood entry' })
  create(@CurrentUser() user: any, @Body() createMoodDto: CreateMoodDto) {
    return this.moodsService.create(user.id, createMoodDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update mood entry' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateDto: Partial<CreateMoodDto>) {
    return this.moodsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete mood entry' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.moodsService.remove(user.id, id);
  }
}

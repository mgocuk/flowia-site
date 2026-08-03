import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SymptomsService } from './symptoms.service';
import { CreateSymptomDto } from './dto/create-symptom.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Symptoms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('symptoms')
export class SymptomsController {
  constructor(private readonly symptomsService: SymptomsService) {}

  @Get()
  @ApiOperation({ summary: 'Get symptoms by date' })
  @ApiQuery({ name: 'date', required: false, example: '2023-10-01' })
  findAll(@CurrentUser() user: any, @Query('date') date?: string) {
    if (date) {
      return this.symptomsService.findByDate(user.id, new Date(date));
    }
    return this.symptomsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create symptom entry' })
  create(@CurrentUser() user: any, @Body() createSymptomDto: CreateSymptomDto) {
    return this.symptomsService.create(user.id, createSymptomDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update symptom entry' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateDto: Partial<CreateSymptomDto>) {
    return this.symptomsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete symptom entry' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.symptomsService.remove(user.id, id);
  }
}

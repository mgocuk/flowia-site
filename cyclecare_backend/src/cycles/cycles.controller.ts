import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreatePeriodEntryDto } from './dto/create-period-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cycles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cycles for current user' })
  findAll(@CurrentUser() user: any) {
    return this.cyclesService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cycle manually' })
  create(@CurrentUser() user: any, @Body() createCycleDto: CreateCycleDto) {
    return this.cyclesService.create(user.id, createCycleDto);
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get cycle predictions for next 3 cycles' })
  getPredictions(@CurrentUser() user: any) {
    return this.cyclesService.getPredictions(user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current cycle' })
  getCurrent(@CurrentUser() user: any) {
    return this.cyclesService.findCurrent(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cycle by id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cyclesService.findOne(user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update cycle' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateData: Partial<CreateCycleDto>) {
    return this.cyclesService.update(user.id, id, updateData);
  }

  @Get(':id/periods')
  @ApiOperation({ summary: 'Get period entries for cycle' })
  getPeriods(@CurrentUser() user: any, @Param('id') cycleId: string) {
    return this.cyclesService.getPeriods(user.id, cycleId);
  }

  @Post(':id/periods')
  @ApiOperation({ summary: 'Add a period entry' })
  addPeriod(@CurrentUser() user: any, @Param('id') cycleId: string, @Body() dto: CreatePeriodEntryDto) {
    return this.cyclesService.addPeriodEntry(user.id, cycleId, dto);
  }

  @Put(':id/periods/:entryId')
  @ApiOperation({ summary: 'Update a period entry' })
  updatePeriod(@CurrentUser() user: any, @Param('entryId') entryId: string, @Body() dto: Partial<CreatePeriodEntryDto>) {
    return this.cyclesService.updatePeriodEntry(user.id, entryId, dto);
  }

  @Delete(':id/periods/:entryId')
  @ApiOperation({ summary: 'Delete a period entry' })
  deletePeriod(@CurrentUser() user: any, @Param('entryId') entryId: string) {
    return this.cyclesService.deletePeriodEntry(user.id, entryId);
  }
}

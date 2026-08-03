import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Journals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('journals')
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get journals with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.journalsService.findAll(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.journalsService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create journal entry' })
  create(@CurrentUser() user: any, @Body() createJournalDto: CreateJournalDto) {
    return this.journalsService.create(user.id, createJournalDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update journal entry' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() updateDto: Partial<CreateJournalDto>) {
    return this.journalsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete journal entry' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.journalsService.remove(user.id, id);
  }
}

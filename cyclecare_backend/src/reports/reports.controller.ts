import { Controller, Get, Post, Param, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reports' })
  findAll(@CurrentUser() user: any) {
    return this.reportsService.findAll(user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new report' })
  generate(@CurrentUser() user: any, @Body() body: { month: number; year: number; type: 'monthly' | 'yearly' }) {
    if (body.type === 'yearly') {
      return this.reportsService.generateYearlyReport(user.id, body.year);
    }
    return this.reportsService.generateMonthlyReport(user.id, body.month, body.year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.reportsService.findOne(user.id, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export report for PDF' })
  export(@CurrentUser() user: any, @Param('id') id: string) {
    return this.reportsService.exportReport(user.id, id);
  }
}

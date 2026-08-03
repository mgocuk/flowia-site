import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FertilityService } from './fertility.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Fertility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fertility')
export class FertilityController {
  constructor(private readonly fertilityService: FertilityService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current cycle fertility status' })
  getCurrent(@CurrentUser() user: any) {
    return this.fertilityService.getCurrentFertility(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get fertility history' })
  getHistory(@CurrentUser() user: any) {
    return this.fertilityService.getHistory(user.id);
  }
}

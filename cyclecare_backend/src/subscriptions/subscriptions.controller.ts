import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current subscription' })
  getCurrent(@CurrentUser() user: any) {
    return this.subscriptionsService.getCurrentSubscription(user.id);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a subscription' })
  purchase(@CurrentUser() user: any, @Body() dto: PurchaseSubscriptionDto) {
    return this.subscriptionsService.purchase(user.id, dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  cancel(@CurrentUser() user: any) {
    return this.subscriptionsService.cancel(user.id);
  }

  @Post('restore')
  @ApiOperation({ summary: 'Restore subscription' })
  restore(@CurrentUser() user: any) {
    return this.subscriptionsService.restore(user.id);
  }
}

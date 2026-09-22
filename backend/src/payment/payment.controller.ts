import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentService } from './payment.service';
import { ConfirmPaymentDto, ReconcilePaymentDto } from './dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('confirm')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.verifyClientPayment(req.user.sub, dto);
  }

  @Get(':paymentReference')
  @UseGuards(AuthGuard)
  async getPaymentStatus(
    @Req() req: AuthenticatedRequest,
    @Param('paymentReference') paymentReference: string,
  ) {
    return this.paymentService.getPaymentStatus(
      req.user.sub,
      paymentReference,
    );
  }

  @Post('webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentService.handleRazorpayWebhook(payload, signature);
  }

  @Post('admin/:paymentReference/reconcile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async reconcilePayment(
    @Param('paymentReference') paymentReference: string,
    @Body() dto: ReconcilePaymentDto,
  ) {
    return this.paymentService.reconcilePayment(paymentReference, dto);
  }
}

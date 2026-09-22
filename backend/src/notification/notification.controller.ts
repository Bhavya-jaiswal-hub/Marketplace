import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationQueryDto,
  TemplateQueryDto,
} from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1')
@UseGuards(AuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ================= USER NOTIFICATION ROUTES =================

  @Get('notifications')
  @Roles('CUSTOMER', 'SELLER', 'SUPER_ADMIN')
  async getUserNotifications(
    @Req() req: any,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getUserNotifications(req.user.sub, query);
  }

  @Get('notifications/:notificationId')
  @Roles('CUSTOMER', 'SELLER', 'SUPER_ADMIN')
  async getUserNotificationById(
    @Req() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.getUserNotificationById(
      req.user.sub,
      notificationId,
    );
  }

  @Post('notifications/:notificationId/read')
  @Roles('CUSTOMER', 'SELLER', 'SUPER_ADMIN')
  async markAsRead(
    @Req() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.markAsRead(req.user.sub, notificationId);
  }

  @Post('notifications/read-all')
  @Roles('CUSTOMER', 'SELLER', 'SUPER_ADMIN')
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  // ================= SUPER ADMIN TEMPLATE & RETRY ROUTES =================

  @Get('admin/notification-templates')
  @Roles('SUPER_ADMIN')
  async getTemplates(@Query() query: TemplateQueryDto) {
    return this.notificationService.getTemplates(query);
  }

  @Post('admin/notification-templates')
  @Roles('SUPER_ADMIN')
  async createTemplate(
    @Req() req: any,
    @Body() dto: CreateNotificationTemplateDto,
  ) {
    return this.notificationService.createTemplate(req.user.sub, dto);
  }

  @Patch('admin/notification-templates/:templateId')
  @Roles('SUPER_ADMIN')
  async updateTemplate(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationService.updateTemplate(
      req.user.sub,
      templateId,
      dto,
    );
  }

  @Post('admin/notifications/:notificationId/retry')
  @Roles('SUPER_ADMIN')
  async retryNotification(
    @Req() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.retryNotification(
      req.user.sub,
      notificationId,
    );
  }
}

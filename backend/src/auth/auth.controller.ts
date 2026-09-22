import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { EmailDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto, TokenDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('verify-email') verifyEmail(@Body() dto: TokenDto) { return this.auth.verifyEmail(dto.token); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.token); }
  @Post('forgot-password') forgotPassword(@Body() dto: EmailDto) { return this.auth.forgotPassword(dto.email); }
  @Post('reset-password') resetPassword(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }

  @UseGuards(AuthGuard)
  @Get('me') me(@Req() request: AuthenticatedRequest) { return this.auth.me(request.user.sub); }

  @UseGuards(AuthGuard)
  @Post('logout') logout(@Req() request: AuthenticatedRequest) { return this.auth.logout(request.user.sub, request.user.sessionId); }

  @UseGuards(AuthGuard)
  @Post('logout-all') logoutAll(@Req() request: AuthenticatedRequest) { return this.auth.logoutAll(request.user.sub); }

  @UseGuards(AuthGuard)
  @Get('sessions') sessions(@Req() request: AuthenticatedRequest) { return this.auth.listSessions(request.user.sub); }

  @UseGuards(AuthGuard)
  @Delete('sessions/current') logoutSession(@Req() request: AuthenticatedRequest) { return this.auth.logout(request.user.sub, request.user.sessionId); }
}

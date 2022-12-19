import {
  Controller,
  Get,
  NotAcceptableException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import BasicAuthGuard from './guards/basic-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('admin')
  @UseGuards(BasicAuthGuard)
  async root(@Res() res: Response) {
    try {
      return res.render('admin/index', {
        title: 'admin panel',
        message: 'Welcome!',
      });
    } catch (error) {
      throw new NotAcceptableException(error.message);
    }
  }
}

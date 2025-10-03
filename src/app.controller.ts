import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('check-point-db')
  async checkPointDb(): Promise<{ status: string; message: string }> {
    return this.appService.checkPointDbConnection();
  }
}

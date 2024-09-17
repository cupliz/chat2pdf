import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/learning')
  @UseInterceptors(FileInterceptor('pdf'))
  // async learning(@UploadedFiles() files: Array<Express.Multer.File>) {
  async learning(@UploadedFile() file: Express.Multer.File) {
    return this.appService.learning(file);
  }

  @Get('/asking')
  async asking(@Query() query: any) {
    return this.appService.asking(query);
  }
}

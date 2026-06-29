import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingServicePackage } from './entities/meeting-service-package.entity';
import { MeetingServicePackagesService } from './meeting-service-packages.service';
import { MeetingServicePackagesController } from './meeting-service-packages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingServicePackage])],
  providers: [MeetingServicePackagesService],
  controllers: [MeetingServicePackagesController],
  exports: [MeetingServicePackagesService],
})
export class MeetingServicePackagesModule {}

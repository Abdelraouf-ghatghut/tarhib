import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MeetingServicePackagesService } from './meeting-service-packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import {
  CreateMeetingServicePackageDto,
  UpdateMeetingServicePackageDto,
} from './dto/meeting-service-package.dto';

@ApiTags('meeting-service-packages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('meeting-service-packages')
export class MeetingServicePackagesController {
  constructor(private readonly svc: MeetingServicePackagesService) {}

  /** Employee: list active packages for their company */
  @Get()
  @ApiOperation({ summary: 'List active service packages for a company' })
  findByCompany(@Query('companyId') companyId: string) {
    return this.svc.findByCompany(companyId);
  }

  /** Admin: list all packages (optionally filtered) */
  @Get('admin/all')
  @UseGuards(PermissionsGuard)
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Admin — list all packages' })
  findAll(@Query('companyId') companyId?: string) {
    return this.svc.findAll(companyId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Create a service package' })
  create(@Body() dto: CreateMeetingServicePackageDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Update a service package' })
  update(@Param('id') id: string, @Body() dto: UpdateMeetingServicePackageDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('branch.manage')
  @ApiOperation({ summary: 'Delete a service package' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

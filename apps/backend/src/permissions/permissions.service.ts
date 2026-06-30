import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  Permission,
  PermissionScope,
} from '../roles/entities/permission.entity.js';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  async findAll(scope?: string): Promise<Permission[]> {
    const where: FindOptionsWhere<Permission> = {};
    if (scope) where.scope = scope as PermissionScope;
    return this.repo.find({ where, order: { key: 'ASC' } });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity.js';
import { Department } from '../departments/entities/department.entity.js';
import { RedisService } from '../redis/redis.service.js';
import { Role, RoleScope } from '../roles/entities/role.entity.js';
import {
  CompanyRegistrationOptionInputDto,
  UpdateCompanyRegistrationDto,
} from './dto/company-registration.dto.js';
import { CompanyRegistrationOption } from './entities/company-registration-option.entity.js';
import { Company, CompanyRegistrationMode } from './entities/company.entity.js';

const CHALLENGE_PREFIX = 'company_registration_challenge:';
const CHALLENGE_TTL_SECONDS = 10 * 60;
const PHONE_VERIFICATION_PREFIX = 'company_registration_phone_verified:';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class CompanyRegistrationService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyRegistrationOption)
    private readonly optionRepo: Repository<CompanyRegistrationOption>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private codeHash(code: string): string {
    const secret = this.config.getOrThrow<string>('OTP_HASH_SECRET');
    return createHmac('sha256', secret)
      .update(code.replace(/[\s-]/g, '').toUpperCase())
      .digest('hex');
  }

  private generateCode(): string {
    const raw = Array.from(
      randomBytes(12),
      (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
    ).join('');
    return `TRHB-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  }

  private async company(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('companyNotFound');
    return company;
  }

  private async validateOptions(
    companyId: string,
    options: CompanyRegistrationOptionInputDto[],
  ): Promise<void> {
    const uniqueOptions = new Set(
      options.map(
        (option) =>
          `${option.branchId}:${option.departmentId}:${option.roleId}`,
      ),
    );
    if (uniqueOptions.size !== options.length) {
      throw new BadRequestException('duplicateRegistrationOption');
    }
    const branchIds = [...new Set(options.map((option) => option.branchId))];
    const departmentIds = [
      ...new Set(options.map((option) => option.departmentId)),
    ];
    const roleIds = [...new Set(options.map((option) => option.roleId))];
    const [branches, departments, roles] = await Promise.all([
      this.branchRepo.find({
        where: { id: In(branchIds), companyId, active: true },
      }),
      this.departmentRepo.find({
        where: { id: In(departmentIds), companyId, active: true },
      }),
      this.roleRepo.find({ where: { id: In(roleIds) } }),
    ]);
    const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
    const departmentMap = new Map(
      departments.map((department) => [department.id, department]),
    );
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    for (const option of options) {
      const department = departmentMap.get(option.departmentId);
      const role = roleMap.get(option.roleId);
      if (!branchMap.has(option.branchId)) {
        throw new BadRequestException('branchNotFoundForCompany');
      }
      if (!department || department.branchId !== option.branchId) {
        throw new BadRequestException('departmentNotFoundForBranch');
      }
      if (
        !role ||
        role.scope !== RoleScope.CLIENT ||
        (role.companyId && role.companyId !== companyId)
      ) {
        throw new BadRequestException('roleNotFoundForCompany');
      }
    }
  }

  async updateSettings(
    companyId: string,
    dto: UpdateCompanyRegistrationDto,
  ): Promise<void> {
    const company = await this.company(companyId);
    if (
      dto.mode === CompanyRegistrationMode.AUTO_APPROVED &&
      !dto.options.length
    ) {
      throw new BadRequestException('registrationOptionsRequired');
    }
    await this.validateOptions(companyId, dto.options);
    company.registrationMode = dto.mode;
    company.registrationCodeExpiresAt = dto.codeExpiresAt
      ? new Date(dto.codeExpiresAt)
      : null;
    await this.companyRepo.save(company);
    await this.optionRepo.manager.transaction(async (manager) => {
      await manager.delete(CompanyRegistrationOption, { companyId });
      if (dto.options.length) {
        await manager.save(
          CompanyRegistrationOption,
          dto.options.map((option) => ({ ...option, companyId, active: true })),
        );
      }
    });
  }

  async rotateCode(companyId: string): Promise<{ code: string }> {
    const company = await this.company(companyId);
    const code = this.generateCode();
    company.registrationCodeHash = this.codeHash(code);
    company.registrationCodeRotatedAt = new Date();
    await this.companyRepo.save(company);
    return { code };
  }

  async getSettings(companyId: string) {
    const company = await this.company(companyId);
    const options = await this.optionRepo.find({
      where: { companyId, active: true },
      order: { createdAt: 'ASC' },
    });
    return {
      mode: company.registrationMode,
      hasRegistrationCode: Boolean(company.registrationCodeHash),
      codeRotatedAt: company.registrationCodeRotatedAt,
      codeExpiresAt: company.registrationCodeExpiresAt,
      options: options.map((option) => this.toPublicOption(option)),
    };
  }

  async resolve(code: string) {
    const company = await this.companyRepo.findOne({
      where: { registrationCodeHash: this.codeHash(code), active: true },
    });
    if (
      !company ||
      company.registrationMode === CompanyRegistrationMode.CLOSED ||
      company.registrationMode === CompanyRegistrationMode.INVITE_ONLY ||
      (company.registrationCodeExpiresAt &&
        company.registrationCodeExpiresAt.getTime() <= Date.now())
    ) {
      throw new BadRequestException('registrationCodeInvalidOrExpired');
    }
    const challenge = randomBytes(32).toString('base64url');
    await this.redis.set(
      `${CHALLENGE_PREFIX}${challenge}`,
      company.id,
      CHALLENGE_TTL_SECONDS,
    );
    return {
      challenge,
      company: {
        id: company.id,
        nameAr: company.nameAr,
        nameEn: company.nameEn,
      },
      mode: company.registrationMode,
      expiresInSeconds: CHALLENGE_TTL_SECONDS,
    };
  }

  async getPublicOptions(challenge: string) {
    const companyId = await this.redis.get(`${CHALLENGE_PREFIX}${challenge}`);
    if (!companyId)
      throw new BadRequestException('registrationChallengeExpired');
    const options = await this.optionRepo.find({
      where: { companyId, active: true },
      order: { createdAt: 'ASC' },
    });
    return options.map((option) => this.toPublicOption(option));
  }

  async assertChallenge(challenge: string): Promise<string> {
    const companyId = await this.redis.get(`${CHALLENGE_PREFIX}${challenge}`);
    if (!companyId)
      throw new BadRequestException('registrationChallengeExpired');
    return companyId;
  }

  async consumePhoneVerification(
    token: string,
    challenge: string,
    phoneNumber: string,
  ): Promise<void> {
    const key = `${PHONE_VERIFICATION_PREFIX}${token}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('registrationPhoneNotVerified');
    const verified = JSON.parse(raw) as {
      challenge: string;
      phoneNumber: string;
    };
    if (
      verified.challenge !== challenge ||
      verified.phoneNumber !== phoneNumber
    ) {
      throw new BadRequestException('registrationPhoneNotVerified');
    }
    await this.redis.del(key);
  }

  async validateSelection(challenge: string, optionId: string) {
    const challengeKey = `${CHALLENGE_PREFIX}${challenge}`;
    const companyId = await this.redis.get(challengeKey);
    if (!companyId) {
      throw new BadRequestException('registrationChallengeExpired');
    }
    const [company, option] = await Promise.all([
      this.companyRepo.findOne({ where: { id: companyId, active: true } }),
      this.optionRepo.findOne({
        where: { id: optionId, companyId, active: true },
      }),
    ]);
    if (
      !company ||
      !option ||
      company.registrationMode === CompanyRegistrationMode.CLOSED ||
      company.registrationMode === CompanyRegistrationMode.INVITE_ONLY ||
      (company.registrationCodeExpiresAt &&
        company.registrationCodeExpiresAt.getTime() <= Date.now())
    ) {
      throw new BadRequestException('registrationSelectionUnavailable');
    }
    return { company, option, challengeKey };
  }

  async consumeChallenge(challengeKey: string): Promise<void> {
    await this.redis.del(challengeKey);
  }

  private toPublicOption(option: CompanyRegistrationOption) {
    return {
      id: option.id,
      branch: {
        id: option.branch.id,
        nameAr: option.branch.nameAr,
        nameEn: option.branch.nameEn,
      },
      department: {
        id: option.department.id,
        nameAr: option.department.nameAr,
        nameEn: option.department.nameEn,
      },
      role: {
        id: option.role.id,
        nameAr: option.role.nameAr,
        nameEn: option.role.nameEn,
      },
    };
  }
}

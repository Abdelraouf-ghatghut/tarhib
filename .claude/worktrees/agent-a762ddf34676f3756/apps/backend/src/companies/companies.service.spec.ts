import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { Company } from './entities/company.entity.js';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getRepositoryToken(Company), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repo = module.get(getRepositoryToken(Company));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a company DTO', async () => {
      const entity = {
        id: 'uuid-1',
        name: 'Sonatrach',
        slug: 'sonatrach',
        active: true,
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create({
        name: 'Sonatrach',
        slug: 'sonatrach',
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Sonatrach',
        slug: 'sonatrach',
      });
      expect(result.id).toBe('uuid-1');
      expect(result.slug).toBe('sonatrach');
    });
  });

  describe('findOne', () => {
    it('should return the company when found', async () => {
      const entity = {
        id: 'uuid-1',
        name: 'Sonatrach',
        slug: 'sonatrach',
        active: true,
      };
      repo.findOne.mockResolvedValue(entity);

      const result = await service.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting active=false', async () => {
      const entity = {
        id: 'uuid-1',
        name: 'Sonatrach',
        slug: 'sonatrach',
        active: true,
      };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockResolvedValue({ ...entity, active: false });

      await service.remove('uuid-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
    });

    it('should throw NotFoundException for unknown id', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

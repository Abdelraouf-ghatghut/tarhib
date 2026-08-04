import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsGateway } from './notifications.gateway.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { AccessCacheService } from '../access/access-cache.service.js';

const verifyMock = jest.fn();
jest.mock('./ws-auth.js', () => ({
  createWsTokenVerifier: () => verifyMock,
}));

describe('NotificationsGateway (PR-0.6a auth + PR-0.6b rooms manager)', () => {
  let gateway: NotificationsGateway;
  let employeeRepo: { findOne: jest.Mock };
  let accessPolicy: { resolve: jest.Mock };
  let accessCache: { get: jest.Mock };
  let fakeServer: { use: jest.Mock; to: jest.Mock; emit: jest.Mock };
  let middleware: (socket: unknown, next: (err?: Error) => void) => void;

  beforeEach(async () => {
    verifyMock.mockReset();
    employeeRepo = { findOne: jest.fn() };
    accessPolicy = {
      resolve: jest.fn().mockResolvedValue({ dataScope: 'OWN' }),
    };
    // Cache miss par défaut : les tests existants passent par accessPolicy.resolve.
    accessCache = { get: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, def: string) => def) },
        },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: AccessPolicyService, useValue: accessPolicy },
        { provide: AccessCacheService, useValue: accessCache },
      ],
    }).compile();

    gateway = module.get(NotificationsGateway);

    const emitSpy = jest.fn();
    fakeServer = {
      use: jest.fn(
        (fn: (socket: unknown, next: (err?: Error) => void) => void) => {
          middleware = fn;
        },
      ),
      to: jest.fn(() => ({ emit: emitSpy })),
      emit: emitSpy,
    };
    // En runtime réel, l'adaptateur Socket.IO de Nest assigne `.server` via le
    // décorateur @WebSocketServer() PUIS appelle afterInit(server) avec cette
    // même instance — on reproduit les deux pour ce test isolé.
    gateway.server = fakeServer as never;
    gateway.afterInit(fakeServer as never);
  });

  function fakeSocket(
    overrides: Partial<{ auth: object; headers: object }> = {},
  ) {
    return {
      handshake: {
        auth: overrides.auth ?? {},
        headers: overrides.headers ?? {},
      },
      data: {} as unknown,
      join: jest.fn(),
    };
  }

  describe('handshake', () => {
    it('rejects a connection with no token at all', (done) => {
      const socket = fakeSocket();
      middleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(verifyMock).not.toHaveBeenCalled();
        done();
      });
    });

    it('rejects when the token fails verification (invalid/expired)', (done) => {
      verifyMock.mockRejectedValue(new Error('jwt expired'));
      const socket = fakeSocket({ auth: { token: 'bad' } });
      middleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(employeeRepo.findOne).not.toHaveBeenCalled();
        done();
      });
    });

    it('rejects when the token is valid but no employee matches', (done) => {
      verifyMock.mockResolvedValue({ sub: 'kc-1' });
      employeeRepo.findOne.mockResolvedValue(null);
      const socket = fakeSocket({ auth: { token: 'good' } });
      middleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
    });

    it('accepts a valid token and attaches fresh employee identity + dataScope to socket.data', (done) => {
      verifyMock.mockResolvedValue({ sub: 'kc-1' });
      employeeRepo.findOne.mockResolvedValue({
        id: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
      });
      accessPolicy.resolve.mockResolvedValue({ dataScope: 'BRANCH' });
      const socket = fakeSocket({ auth: { token: 'good' } });
      middleware(socket, (err) => {
        expect(err).toBeUndefined();
        expect(socket.data).toEqual({
          employeeId: 'emp-1',
          companyId: 'co-1',
          branchId: 'br-1',
          dataScope: 'BRANCH',
        });
        done();
      });
    });

    it('also accepts a token supplied via the Authorization header (fallback)', (done) => {
      verifyMock.mockResolvedValue({ sub: 'kc-1' });
      employeeRepo.findOne.mockResolvedValue({
        id: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
      });
      const socket = fakeSocket({ headers: { authorization: 'Bearer good' } });
      middleware(socket, (err) => {
        expect(err).toBeUndefined();
        expect(verifyMock).toHaveBeenCalledWith('good');
        done();
      });
    });

    // PR-1.0 : un hit sur le cache d'accès évite la résolution DB des
    // permissions/dataScope — précieux lors d'une reconnexion en masse (E6).
    it('uses the cached dataScope without calling accessPolicy.resolve on a cache hit', (done) => {
      verifyMock.mockResolvedValue({ sub: 'kc-1' });
      employeeRepo.findOne.mockResolvedValue({
        id: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
      });
      accessCache.get.mockResolvedValue({ dataScope: 'GLOBAL' });
      const socket = fakeSocket({ auth: { token: 'good' } });
      middleware(socket, (err) => {
        expect(err).toBeUndefined();
        expect((socket.data as { dataScope?: string }).dataScope).toBe(
          'GLOBAL',
        );
        expect(accessPolicy.resolve).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('handleConnection', () => {
    it('joins employee + company + branch rooms from the identity resolved at handshake', () => {
      const socket = fakeSocket();
      socket.data = {
        employeeId: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
        dataScope: 'OWN',
      };
      gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith([
        'employee:emp-1',
        'company:co-1',
        'branch:br-1',
      ]);
    });

    it('skips company/branch rooms when the employee has none (platform admin)', () => {
      const socket = fakeSocket();
      socket.data = {
        employeeId: 'admin-1',
        companyId: null,
        branchId: null,
        dataScope: 'GLOBAL',
      };
      gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith([
        'employee:admin-1',
        'manager:global',
      ]);
    });

    it('adds manager:global for GLOBAL dataScope', () => {
      const socket = fakeSocket();
      socket.data = {
        employeeId: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
        dataScope: 'GLOBAL',
      };
      gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith([
        'employee:emp-1',
        'company:co-1',
        'branch:br-1',
        'manager:global',
      ]);
    });

    it('adds manager:company:{id} for COMPANY dataScope', () => {
      const socket = fakeSocket();
      socket.data = {
        employeeId: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
        dataScope: 'COMPANY',
      };
      gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith([
        'employee:emp-1',
        'company:co-1',
        'branch:br-1',
        'manager:company:co-1',
      ]);
    });

    it('adds no extra manager room for BRANCH dataScope (branch: already covers it)', () => {
      const socket = fakeSocket();
      socket.data = {
        employeeId: 'emp-1',
        companyId: 'co-1',
        branchId: 'br-1',
        dataScope: 'BRANCH',
      };
      gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith([
        'employee:emp-1',
        'company:co-1',
        'branch:br-1',
      ]);
    });
  });

  describe('emitOrderUpdate', () => {
    it('targets branch, owning employee, and manager rooms — never a global broadcast', () => {
      gateway.emitOrderUpdate('order:new', {
        orderId: 'ord-1',
        branchId: 'br-1',
        employeeId: 'emp-1',
        companyId: 'co-1',
      });
      expect(fakeServer.to).toHaveBeenCalledWith([
        'branch:br-1',
        'employee:emp-1',
        'manager:company:co-1',
        'manager:global',
      ]);
    });
  });
});

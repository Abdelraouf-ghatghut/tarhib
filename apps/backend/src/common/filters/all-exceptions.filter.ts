import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PgDriverError {
  code?: string;
  constraint?: string;
  detail?: string;
}

/**
 * Filtre global : toute exception non gérée explicitement (violation de
 * contrainte Postgres, erreur Axios Keycloak, etc.) est normalisée en
 * {statusCode, error, message} au lieu de fuiter une stack ou un message
 * technique brut. `message` reste une clé machine courte quand on la connaît
 * (le front la traduit), sinon un message générique.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, error: exception.name, message: body }
            : body,
        );
      return;
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as PgDriverError;
      if (driverError?.code === '23505') {
        res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'duplicateEntry',
        });
        return;
      }
      if (driverError?.code === '23503') {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'invalidReference',
        });
        return;
      }
      this.logger.error(`Unhandled QueryFailedError: ${exception.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'internalError',
      });
      return;
    }

    // Erreur Axios (ex. Keycloak indisponible) ou toute autre erreur non anticipée
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    const isUpstream =
      typeof exception === 'object' &&
      exception !== null &&
      'isAxiosError' in exception;
    res
      .status(
        isUpstream ? HttpStatus.BAD_GATEWAY : HttpStatus.INTERNAL_SERVER_ERROR,
      )
      .json({
        statusCode: isUpstream
          ? HttpStatus.BAD_GATEWAY
          : HttpStatus.INTERNAL_SERVER_ERROR,
        error: isUpstream ? 'Bad Gateway' : 'Internal Server Error',
        message: isUpstream ? 'externalServiceError' : 'internalError',
      });
  }
}

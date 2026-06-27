import { Injectable } from '@nestjs/common';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  getCurrentUser(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

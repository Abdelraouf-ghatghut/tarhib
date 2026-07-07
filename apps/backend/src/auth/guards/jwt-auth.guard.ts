import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Enregistré en APP_GUARD : ne s'applique qu'au HTTP, pas aux gateways
    // Socket.io (auth WS gérée séparément)
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Le guard est enregistré globalement (APP_GUARD) ET au niveau de certains
    // contrôleurs : si l'instance globale a déjà validé le JWT, on ne rejoue
    // pas la stratégie (jwks + lookups DB).
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    if (req.user) return true;

    return super.canActivate(context);
  }
}

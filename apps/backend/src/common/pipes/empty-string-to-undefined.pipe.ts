import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Les Selects/Inputs vidés côté formulaires envoient souvent "" au lieu
 * d'omettre le champ, ce que @IsOptional ne couvre pas (seuls null/undefined
 * sont ignorés) — d'où des 400 « must be a UUID » sur des champs optionnels.
 * Ce pipe global normalise récursivement "" → undefined dans les bodies,
 * AVANT la ValidationPipe.
 */
@Injectable()
export class EmptyStringToUndefinedPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body') return value;
    return this.clean(value);
  }

  private clean(value: unknown): unknown {
    if (value === '') return undefined;
    if (Array.isArray(value)) return value.map((v) => this.clean(v));
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.clean(v);
      }
      return out;
    }
    return value;
  }
}

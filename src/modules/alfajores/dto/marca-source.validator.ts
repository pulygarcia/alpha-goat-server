import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

interface MarcaSource {
  marcaId?: string;
  marcaNombre?: string;
}

/**
 * La marca de una propuesta viaja como `marcaId` (catálogo) o como
 * `marcaNombre` (texto libre), nunca los dos ni ninguno. Va todo en un
 * validador porque la regla mira dos propiedades a la vez: `@IsOptional()`
 * sobre `marcaNombre` cortaría la validación justo en el caso "ninguno",
 * que es el que hay que rechazar.
 *
 * Se declara sobre `marcaNombre` para que el error caiga en el campo nuevo,
 * que es el que el front pinta como input libre. El formato de `marcaId`
 * (UUID) lo sigue chequeando `@IsUUID` en su propia propiedad.
 */
export function IsValidMarcaSource(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isValidMarcaSource',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const { marcaId } = args.object as MarcaSource;

          if (value === undefined || value === null)
            return marcaId !== undefined;
          if (marcaId !== undefined) return false;

          return (
            typeof value === 'string' &&
            value.length >= 2 &&
            value.length <= 120
          );
        },
        defaultMessage(): string {
          return 'exactly one of marcaId or marcaNombre (2-120 chars) must be provided';
        },
      },
    });
  };
}

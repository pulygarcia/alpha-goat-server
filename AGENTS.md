# Alfajorímetro - Backend

Backend del Alfajorímetro: una app tipo Untappd pero para alfajores argentinos. Los usuarios reseñan alfajores con rating general + 5 ejes (dulzor, cantidadDDL, calidadBaño, ratioTapaRelleno, textura), y el sistema genera radar charts, rankings y recomendaciones.

## Stack

- **Framework**: NestJS (última versión)
- **Lenguaje**: TypeScript (strict mode)
- **ORM**: TypeORM
- **Base de datos**: PostgreSQL (Neon en dev y prod)
- **Auth**: JWT access token (sin refresh por ahora)
- **Validación**: class-validator + class-transformer
- **Documentación API**: Swagger / OpenAPI
- **Storage de imágenes**: Cloudinary
- **Testing**: Jest + Supertest (solo tests unitarios, coverage mínimo 85%)
- **Linter/Formatter**: ESLint + Prettier
- **CI**: GitHub Actions (lint + test)

## Comandos principales

```bash
npm run start:dev        # arranca en watch mode
npm run build            # build de producción
npm run test             # tests unitarios
npm run test:watch       # tests en watch mode
npm run test:cov         # tests con coverage (debe ser >= 85%)
npm run lint             # ESLint
npm run format           # Prettier
npm run typeorm          # CLI de TypeORM (migrations, etc)
```

## Modelo de negocio resumido

- **Modelo híbrido de catálogo**: cualquier usuario puede proponer un alfajor, pero queda en estado `PENDING` hasta que un admin lo apruebe.
- **Roles**: `USER` (default) y `ADMIN`. El admin se crea con un seed o cambiando el campo en DB manualmente.
- **Reviews**: cada usuario puede reseñar un alfajor `APPROVED` una sola vez, pero puede editar su review.
- **Estados de Alfajor**: `PENDING`, `APPROVED`, `REJECTED`.

## Reglas de código

### Arquitectura general
- **Arquitectura orientada a servicios atómicos**: cada acción de negocio tiene su propia clase (Finder, Creator, Updater, Remover, etc). Ver `docs/architecture.md`.
- Los **controllers son finos**: solo reciben request, llaman a un service atómico, devuelven respuesta. Sin lógica de negocio.
- Los **services atómicos hacen una cosa y solo una**. Si necesitan otro service, lo inyectan.
- Las **entidades de TypeORM no tienen lógica**: solo definen estructura.

### Convenciones
- Usar **DTOs** para inputs y outputs. Nunca exponer entidades directamente al cliente.
- **Response DTOs**: nunca devolver `passwordHash`, ni IDs de relaciones internas si no se necesitan.
- Usar **decoradores de class-validator** en todos los DTOs de input.
- **Nombres**: archivos en `kebab-case`, clases en `PascalCase`, variables y funciones en `camelCase`.
- **Sin lógica en constructores** salvo inyección de dependencias.
- **Errores**: usar las excepciones de NestJS (`NotFoundException`, `ConflictException`, etc), nunca `throw new Error()`.

### Testing
- Cada service atómico tiene su archivo `.spec.ts` al lado.
- **Mockear dependencias** (repositorios, otros services) con `jest.fn()` o `Test.createTestingModule()`.
- Apuntar a **branch coverage ≥ 85%**, no solo line coverage.
- Tests deben describir **comportamientos**, no implementación. Nombres tipo `should throw NotFoundException when alfajor does not exist`.
- **No tocar la base de datos** en tests unitarios. Si algún día agregamos integración, irán en `*.int-spec.ts`.

### Git
- Commits en formato **conventional commits** (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Commits chicos y atómicos. Mejor 5 commits que 1 monstruoso.
- Branch principal: `main`. Features en `feat/<nombre-corto>`.

## Estructura del proyecto

```
src/
├── main.ts
├── app.module.ts
├── config/                    # configs (env, typeorm, swagger, cloudinary)
├── common/                    # decoradores, guards, filters, pipes globales
├── modules/
│   ├── auth/                  # login, register, JWT
│   ├── users/
│   ├── alfajores/
│   ├── marcas/
│   ├── reviews/
│   ├── moderation/            # endpoints admin para aprobar/rechazar
│   └── uploads/               # integración con Cloudinary
└── database/
    ├── migrations/
    └── seeds/
```

Detalle completo en `docs/architecture.md`.

## Dónde está cada cosa

- **Arquitectura detallada (servicios atómicos, ejemplos)**: `docs/architecture.md`
- **Modelo de datos (entidades, relaciones)**: `docs/data-model.md` (se crea cuando arrancamos)
- **Progreso del proyecto (qué módulos están terminados)**: `docs/progress.md` (se actualiza después de cada feature)

## Flujo de trabajo

- Antes de generar código de un módulo nuevo, **leé `docs/architecture.md`**.
- Trabajamos **un módulo a la vez**. No generes "toda la app" de una.
- **Tests siempre en la misma sesión** que el código. No los dejes para después.
- Después de terminar un módulo, **actualizá `docs/progress.md`** con qué quedó hecho.
- Si tenés dudas sobre el dominio (alfajores, ejes de review, etc), **preguntá**, no inventes.

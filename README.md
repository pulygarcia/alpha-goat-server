# AlphaGoat — Backend

Backend del **AlphaGoat**: app de reviews y puntajes para bajoneros. Con radar charts, rankings y recomendaciones a partir de reviews.
---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | [NestJS 11](https://nestjs.com/) |
| Lenguaje | TypeScript (strict) |
| ORM | TypeORM |
| DB | PostgreSQL (Neon en dev y prod) |
| Auth | JWT access token (sin refresh por ahora) |
| Validación | class-validator + class-transformer |
| Docs API | Swagger / OpenAPI |
| Imágenes | Cloudinary |
| Testing | Jest + Supertest (unit, coverage ≥ 85%) |
| Lint / Format | ESLint + Prettier |
| CI | GitHub Actions (lint + test) |

---

## Requisitos

- **Node.js** ≥ 20
- **npm** ≥ 10
- Acceso a una base **PostgreSQL** (recomendado: una rama de Neon para tu entorno local)
- Cuenta de **Cloudinary** (gratis alcanza)

---

## Setup rápido

```bash
# 1. Clonar
git clone <url-del-repo>
cd alfajorimetro-back

# 2. Instalar deps
npm install

# 3. Variables de entorno
cp .env.example .env   # completar valores (ver sección de abajo)

# 4. Migraciones
npm run typeorm -- migration:run

# 5. Levantar en watch
npm run start:dev
```

La app queda escuchando en `http://localhost:3000` y la doc de Swagger en `http://localhost:3000/docs`.

### Variables de entorno

```env
# App
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# Auth
JWT_SECRET=cambia-esto
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Scripts

```bash
npm run start:dev     # watch mode
npm run start:debug   # watch + debugger
npm run start:prod    # corre el build (dist/main.js)
npm run build         # build de producción

npm run test          # tests unitarios
npm run test:watch    # tests en watch
npm run test:cov      # coverage (objetivo ≥ 85% branch coverage)

npm run lint          # ESLint con --fix
npm run format        # Prettier
npm run typeorm       # CLI de TypeORM (migrations, etc)
```

---

## Arquitectura

**Servicios atómicos.** Cada acción de negocio vive en su propia clase: `Finder`, `Creator`, `Updater`, `Remover`, `Approver`, etc. Los controllers son finos (reciben request → llaman al service atómico → devuelven respuesta), las entidades de TypeORM no tienen lógica.

Reglas resumidas:

- **DTOs** para input y output. Nunca exponer entidades crudas al cliente.
- **Response DTOs** sin `passwordHash` ni IDs internos innecesarios.
- **Errores** con excepciones de NestJS (`NotFoundException`, `ConflictException`, etc), nunca `throw new Error()`.
- **Naming**: archivos `kebab-case`, clases `PascalCase`, vars/funcs `camelCase`.
- **Tests** al lado de cada service (`*.spec.ts`), mockeando dependencias. Sin tocar la DB en unit tests.

Detalle completo en [`docs/architecture.md`](docs/architecture.md). Modelo de datos en [`docs/data-model.md`](docs/data-model.md). Estado de avance en [`docs/progress.md`](docs/progress.md).

### Modelo de negocio (resumen)

- **Catálogo híbrido**: cualquier usuario puede proponer un alfajor; queda en `PENDING` hasta que un admin lo apruebe (`APPROVED` / `REJECTED`).
- **Roles**: `USER` (default) y `ADMIN`. El admin se crea con seed o flipeando el campo en DB.
- **Reviews**: un usuario reseña un alfajor `APPROVED` una sola vez, pero puede editar su review.

---

## Estructura de carpetas

```
src/
├── main.ts
├── app.module.ts
├── config/                # env, typeorm, swagger, cloudinary
├── common/                # decoradores, guards, filters, pipes globales
├── modules/
│   ├── auth/              # login, register, JWT
│   ├── users/
│   ├── alfajores/
│   ├── marcas/
│   ├── reviews/           # reviews + likes (PUT/DELETE /reviews/:id/like)
│   ├── comments/          # comentarios sobre reviews + likes
│   ├── follows/           # seguir/dejar de seguir usuarios
│   ├── feed/              # GET /feed/hero (público) + GET /feed (auth)
│   ├── moderation/        # endpoints admin (approve / reject)
│   └── uploads/           # Cloudinary (pendiente)
└── database/
    ├── migrations/
    └── seeds/

docs/                      # arquitectura, data model, progreso
test/                      # config de e2e (cuando arranque)
```

---

## Convenciones de Git

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Commits chicos y atómicos. Mejor 5 commits que 1 monstruoso.
- Branch principal: `main`. Features en `feat/<nombre-corto>`.
- PRs requieren CI verde (lint + tests).

---

## Recomendado para devs que usan Claude Code

Este repo está pensado para que Claude Code colabore bien con el equipo. Si lo usás, dejamos algunas recomendaciones:

1. **Instalá los skills sugeridos** (autoskills). Ayudan a que el asistente respete las convenciones del proyecto:
   - `nestjs-best-practices`
   - `nodejs-backend-patterns`
   - `typescript-advanced-types`
   - `simplify` (review de código antes de commitear)
   - `security-review` (antes de PRs sensibles)
2. **Crea tu propio `CLAUDE.md` local** (está en `.gitignore`, no se commitea). Podés copiar como base lo que tengas en otra máquina o pedirle al equipo el ejemplo.
3. **`.claude/` es local por dev**: settings, hooks, permisos. No se versiona.
4. Antes de pedirle a Claude que genere un módulo nuevo, indicale que lea `docs/architecture.md`. La arquitectura de servicios atómicos no es estándar de NestJS y conviene anclarla.
5. Trabajá **un módulo a la vez** y exigí los tests en la misma sesión que el código.

---

## Documentación adicional

- [`docs/architecture.md`](docs/architecture.md) — servicios atómicos, ejemplos, reglas duras.
- [`docs/data-model.md`](docs/data-model.md) — entidades y relaciones.
- [`docs/progress.md`](docs/progress.md) — qué módulos están terminados.

---

## Licencia

UNLICENSED — proyecto privado.

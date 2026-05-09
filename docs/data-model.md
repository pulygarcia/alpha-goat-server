# Modelo de datos - Alfajorímetro

Detalle de las entidades del backend. Complementa a `architecture.md`.

> **Nota:** los nombres de columnas se manejan con el default de TypeORM (`camelCase` también en Postgres). Si más adelante se decide pasar a `snake_case`, hay que agregar `typeorm-naming-strategies` y un `SnakeNamingStrategy` en `typeorm.config.ts`.

## Convenciones generales

- **PK**: `id` tipo `uuid` (`@PrimaryGeneratedColumn('uuid')`).
- **Timestamps**: toda entidad lleva `createdAt` (`@CreateDateColumn`) y `updatedAt` (`@UpdateDateColumn`), salvo las puramente asociativas (likes), que solo necesitan `createdAt`.
- **Soft delete**: no se usa por ahora. Borrado físico con `ON DELETE CASCADE` donde corresponde.
- **Ratings (rating general + 5 ejes)**: `numeric(3,1)`, rango `0.0` – `10.0`, validado en DTO con `@Min(0)` `@Max(10)`.

---

## User

| Campo          | Tipo                  | Notas                                       |
|----------------|-----------------------|---------------------------------------------|
| id             | uuid PK               |                                             |
| email          | varchar(255) UNIQUE   | lowercased en el creator                    |
| username       | varchar(50) UNIQUE    |                                             |
| passwordHash   | varchar(255)          | bcrypt, nunca se expone en response DTOs    |
| avatarUrl      | varchar(500) NULL     | URL de Cloudinary                           |
| role           | enum('USER','ADMIN')  | default `USER`                              |
| banned         | boolean               | default `false`                             |
| createdAt      | timestamptz           |                                             |
| updatedAt      | timestamptz           |                                             |

---

## Marca

Solo la crea/edita ADMIN. No tiene flujo de moderación.

| Campo        | Tipo                | Notas                                    |
|--------------|---------------------|------------------------------------------|
| id           | uuid PK             |                                          |
| nombre       | varchar(120) UNIQUE |                                          |
| provincia    | varchar(80) NULL    | provincia/región de origen               |
| descripcion  | text NULL           |                                          |
| logoUrl      | varchar(500) NULL   | Cloudinary                               |
| createdAt    | timestamptz         |                                          |
| updatedAt    | timestamptz         |                                          |

---

## Alfajor

Cualquier USER puede proponer un alfajor → queda en `PENDING` hasta moderación.

| Campo            | Tipo                                       | Notas                                        |
|------------------|--------------------------------------------|----------------------------------------------|
| id               | uuid PK                                    |                                              |
| nombre           | varchar(150)                               |                                              |
| marcaId          | uuid FK → Marca.id (ON DELETE RESTRICT)    | no se permite borrar marca con alfajores     |
| tipo             | enum (`alfajor-tipo.enum.ts`)              | ej: CHOCOLATE, BLANCO, FRUTAL, OTRO          |
| descripcion      | text NULL                                  |                                              |
| imagenUrl        | varchar(500) NULL                          | Cloudinary                                   |
| status           | enum('PENDING','APPROVED','REJECTED')      | default `PENDING`                            |
| rejectionReason  | text NULL                                  | obligatorio cuando `status = REJECTED`       |
| createdById      | uuid FK → User.id (ON DELETE SET NULL)     | si el user se borra, el alfajor sobrevive    |
| createdAt        | timestamptz                                |                                              |
| updatedAt        | timestamptz                                |                                              |

**Constraints:**
- `UNIQUE(nombre, marcaId)` — sin duplicados exactos.

**Índices:**
- `(status)` para listar pendientes en moderación.
- `(marcaId)` para listar por marca.

---

## Review

1 review por usuario por alfajor (editable).

| Campo              | Tipo                                       | Notas                                |
|--------------------|--------------------------------------------|--------------------------------------|
| id                 | uuid PK                                    |                                      |
| userId             | uuid FK → User.id (ON DELETE CASCADE)      |                                      |
| alfajorId          | uuid FK → Alfajor.id (ON DELETE CASCADE)   |                                      |
| ratingGeneral      | numeric(3,1)                               | 0.0 – 10.0                           |
| dulzor             | numeric(3,1)                               | 0.0 – 10.0                           |
| cantidadDDL        | numeric(3,1)                               | 0.0 – 10.0                           |
| calidadBano        | numeric(3,1)                               | 0.0 – 10.0                           |
| ratioTapaRelleno   | numeric(3,1)                               | 0.0 – 10.0                           |
| textura            | numeric(3,1)                               | 0.0 – 10.0                           |
| comentario         | text NULL                                  |                                      |
| fotoUrl            | varchar(500) NULL                          | una foto por review (Cloudinary)     |
| createdAt          | timestamptz                                |                                      |
| updatedAt          | timestamptz                                |                                      |

**Constraints:**
- `UNIQUE(userId, alfajorId)` — una review por user por alfajor.
- A nivel service: solo se permite reseñar alfajores con `status = APPROVED`.

**Índices:**
- `(alfajorId)` para listar reviews de un alfajor.
- `(userId)` para perfil del usuario.

---

## Comment

Comentarios planos sobre una Review (sin anidamiento).

| Campo       | Tipo                                       | Notas |
|-------------|--------------------------------------------|-------|
| id          | uuid PK                                    |       |
| reviewId    | uuid FK → Review.id (ON DELETE CASCADE)    |       |
| userId      | uuid FK → User.id (ON DELETE CASCADE)      |       |
| contenido   | text                                       |       |
| createdAt   | timestamptz                                |       |
| updatedAt   | timestamptz                                |       |

**Índices:**
- `(reviewId, createdAt)` para listar en orden cronológico.

---

## ReviewLike

| Campo      | Tipo                                       | Notas |
|------------|--------------------------------------------|-------|
| id         | uuid PK                                    |       |
| reviewId   | uuid FK → Review.id (ON DELETE CASCADE)    |       |
| userId     | uuid FK → User.id (ON DELETE CASCADE)      |       |
| createdAt  | timestamptz                                |       |

**Constraints:**
- `UNIQUE(reviewId, userId)` — un like por user por review.

---

## CommentLike

| Campo      | Tipo                                       | Notas |
|------------|--------------------------------------------|-------|
| id         | uuid PK                                    |       |
| commentId  | uuid FK → Comment.id (ON DELETE CASCADE)   |       |
| userId     | uuid FK → User.id (ON DELETE CASCADE)      |       |
| createdAt  | timestamptz                                |       |

**Constraints:**
- `UNIQUE(commentId, userId)` — un like por user por comentario.

---

## Diagrama de relaciones (resumen)

```
User 1───* Alfajor          (createdById, SET NULL)
User 1───* Review           (CASCADE)
User 1───* Comment          (CASCADE)
User 1───* ReviewLike       (CASCADE)
User 1───* CommentLike      (CASCADE)

Marca 1───* Alfajor         (RESTRICT)

Alfajor 1───* Review        (CASCADE)

Review 1───* Comment        (CASCADE)
Review 1───* ReviewLike     (CASCADE)

Comment 1───* CommentLike   (CASCADE)
```

---

## Notas de implementación

- **Counts de likes**: no se denormalizan. Se calculan con `COUNT(*)` en queries de listado (con índices sobre `reviewId` / `commentId` ya cubiertos por los `UNIQUE`). Si se vuelve un cuello de botella, se evalúa cachear o materializar después.
- **Promedios de ratings por alfajor**: van en `AlfajorRatingCalculator` (ver `architecture.md`). Se calculan on-demand; si escala mal, se guardan en una tabla `alfajor_rating_summary` actualizada con un trigger o en el `ReviewCreator/Updater/Remover`.
- **Validación de rangos**: en DTO con `@Min(0)` `@Max(10)` y `@IsNumber({ maxDecimalPlaces: 1 })`. La DB es la última línea de defensa con `CHECK(ratingGeneral BETWEEN 0 AND 10)` (agregar en migrations).

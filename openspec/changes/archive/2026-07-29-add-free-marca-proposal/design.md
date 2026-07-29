## Context

Hoy `AlfajorCreator` hace `marcaFinder.byId(dto.marcaId)` incondicional y chequea el unique `nombre + marcaId` antes de guardar; la entidad tiene `marcaId` `NOT NULL` con `@Unique('UQ_alfajor_nombre_marca')` y un `ManyToOne` con `onDelete: 'RESTRICT'`. `AlfajorApprover` solo valida el status y guarda. Crear marcas es ADMIN-only (`POST /admin/marcas` → `MarcaCreator`, que ya rechaza nombres duplicados con 409).

El cambio introduce un estado nuevo del dominio: **alfajor PENDING sin marca, con un nombre de marca propuesto en texto libre**. La invariante que hay que preservar es que **APPROVED ⇒ marca resuelta**, porque el catálogo, el álbum, el ranking y los DTOs de reviews ya la asumen.

## Goals / Non-Goals

**Goals:**
- Que proponer un alfajor de una marca no cargada sea posible en un solo paso, sin permisos de admin.
- Que la marca se materialice recién cuando un humano la aprueba, para no ensuciar el catálogo de marcas con basura.
- No romper ningún consumidor actual: el camino con `marcaId` queda idéntico.

**Non-Goals:**
- Marcas en estado PENDING con su propia cola de moderación.
- Deduplicación difusa del nombre libre (fuzzy / unaccent) contra las marcas existentes.
- Editar la marca propuesta después de crear la propuesta.

## Decisions

### 1. Un campo de texto en `alfajores`, no una entidad nueva

`alfajores.marca_nombre_propuesto` (`varchar(120)`, nullable) + `marca_id` nullable. El nombre propuesto es un dato **transitorio de la propuesta**, no una entidad del dominio: vive mientras el alfajor está PENDING y se descarta al aprobar.

*Alternativa descartada*: `Marca` con `status: PENDING`. Es más correcto en el modelo (la marca es una entidad de verdad) pero obliga a una pantalla de admin nueva, a filtrar marcas PENDING en los ~5 lugares que listan marcas, y a que el usuario haga dos propuestas para publicar un alfajor. Se puede migrar a esto más adelante sin romper el contrato: el campo de texto es el input de esa futura entidad.

### 2. Validación "exactamente uno" con un validador de clase en el DTO

`CreateAlfajorDto`: `marcaId?: string` (`@IsOptional() @IsUUID()`) + `marcaNombre?: string` (`@IsOptional() @IsString() @Length(2, 120)`), más un `@ValidateIf`/validador custom que rechaza los casos "ninguno" y "ambos" con 400. La regla vive en el DTO y no en el creator porque es validación de forma del request, y así el 400 sale del pipe global como el resto de los errores de shape.

*Alternativa descartada*: aceptar los dos y priorizar `marcaId`. Silenciar un request contradictorio esconde bugs del front.

### 3. El approver resuelve la marca; la creación de marcas sigue en `MarcaCreator`

`AlfajorApprover.execute(id, dto?)` resuelve en este orden:
1. Si el alfajor ya tiene `marcaId` → se usa esa (y se ignora el body; si el admin quiere cambiarla, para eso está `PATCH /alfajores/:id`).
2. Si el body trae `marcaId` → `MarcaFinder.byId` (404 si no existe).
3. Si hay `marcaNombrePropuesto` → `findOne({ nombre })`; si existe se reusa, si no se crea con `MarcaCreator`.
4. Si no hay nada → 400.

Reusar la marca de nombre idéntico en vez de dejar que `MarcaCreator` tire 409 evita un callejón sin salida para el admin (es el mismo problema que este change viene a arreglar, un nivel más arriba). La búsqueda por nombre exacto se hace con el repo API — no hace falta QueryBuilder.

Con la marca resuelta, el approver chequea el unique `nombre + marcaId` y tira 409 si ya existe, **antes** de guardar: sin ese chequeo la violación del índice saldría como error 500 de Postgres. Es el mismo chequeo que hace `AlfajorCreator`; se extrae a un helper compartido en el módulo `alfajores` para no duplicar la regla.

*Alternativa descartada*: un service `MarcaResolver` aparte. La resolución solo tiene sentido dentro de la aprobación; un service más sería ceremonia sin un segundo call site.

### 4. El unique sigue como está

Postgres trata los `NULL` como distintos en un índice único, así que `UQ_alfajor_nombre_marca` deja de aplicar automáticamente a las propuestas sin marca: dos usuarios pueden proponer el mismo alfajor con el mismo texto de marca. Es aceptable — son propuestas, no catálogo, y el admin ve las dos y rechaza una. El unique vuelve a morder al aprobar (paso 3), que es donde importa.

*Alternativa descartada*: un índice parcial sobre `(nombre, marca_nombre_propuesto)`. Normalizar texto libre para que el índice sirva ("Havanna" vs "havanna ") es más trabajo del que vale para un caso que el admin resuelve mirando.

### 5. `marcaId` nullable en el response DTO

`AlfajorResponseDto.marcaId` pasa a `string | null` y se agrega `marcaNombrePropuesto`. Es el único cambio observable para el front, y solo en el panel de moderación: el catálogo público sirve únicamente APPROVED, que siempre tiene marca. El mapeo sigue en `AlfajorResponseDto.from`, como el resto del módulo.

## Risks / Trade-offs

- **Código que asume `alfajor.marcaId` no nulo** (álbum, feed, recommendations, reviews) → todos esos caminos filtran por `APPROVED`, donde la invariante se mantiene. La migración no cambia ninguna fila existente. Se revisa cada consumidor durante la implementación.
- **El front tipa `marcaId: string`** → el nullable puede romper el panel de moderación en TS. Se coordina con el PR del client, que es la otra mitad de la task del board.
- **Texto libre = basura potencial** (spam, nombres inventados) → nunca llega al catálogo sin pasar por un admin; el largo está acotado a 120 y el endpoint pide sesión.
- **Propuestas duplicadas sin marca** → visibles juntas en la cola de moderación; el 409 al aprobar la segunda es la red de contención.

## Migration Plan

Una migración: `marca_id` a nullable + `marca_nombre_propuesto varchar(120) NULL`. Sin backfill (toda fila existente tiene marca) y sin ventana de downtime. El `down` revierte la columna nueva y vuelve `marca_id` a `NOT NULL`, lo que falla si quedaron propuestas sin marca — el rollback real es borrar esas filas primero, y se documenta en la migración.

## 1. Modelo de datos

- [x] 1.1 `Alfajor` entity: `marcaId` a `string | null` (columna nullable), `marca` sigue opcional, y columna nueva `marcaNombrePropuesto: string | null` (`varchar(120)`). El `@Unique('UQ_alfajor_nombre_marca')` queda como está
- [x] 1.2 Migración nueva en `src/database/migrations`: `marca_id` a nullable + `marca_nombre_propuesto varchar(120) NULL`. Sin backfill; comentar en el `down` que revertir a `NOT NULL` falla si quedaron propuestas sin marca
- [x] 1.3 Correr la migración contra la Neon dev y verificar que el schema quedó como se espera

## 2. Proponer con marca libre

- [x] 2.1 `CreateAlfajorDto`: `marcaId` opcional (`@IsOptional() @IsUUID()`) + `marcaNombre` opcional (`@IsOptional() @IsString() @Length(2, 120)`), con validación de "exactamente uno" y sus `@ApiPropertyOptional`. Spec del DTO cubriendo: solo id, solo nombre, ninguno, ambos
- [x] 2.2 Extraer a `alfajores` un helper compartido que chequee el duplicado `nombre + marcaId` y tire `ConflictException` (hoy inline en `AlfajorCreator`), con su spec
- [x] 2.3 `AlfajorCreator`: con `marcaId` se comporta igual que hoy (404 de marca inexistente + 409 de duplicado); con `marcaNombre` guarda `marcaId: null` + `marcaNombrePropuesto` y saltea el chequeo de duplicado. Tests de ambos caminos
- [x] 2.4 `AlfajorResponseDto`: `marcaId: string | null` + `marcaNombrePropuesto: string | null` en `from()`, con `@ApiProperty` actualizados. Tests del DTO para propuesta libre y para alfajor con marca

## 3. Resolución de marca al aprobar

- [x] 3.1 `ApproveAlfajorDto` nuevo en `moderation/dto`: `marcaId?: string` (`@IsOptional() @IsUUID()`)
- [x] 3.2 `AlfajorApprover.execute(id, dto?)`: resolver la marca en el orden del design (marca propia → `marcaId` del body vía `MarcaFinder` → `marcaNombrePropuesto` reusando la marca de nombre exacto o creándola con `MarcaCreator` → 400), chequear el duplicado con el helper de 2.2, limpiar `marcaNombrePropuesto` y guardar
- [x] 3.3 Wiring del módulo: `ModerationModule` importa lo necesario para inyectar `MarcaFinder`/`MarcaCreator` (verificar exports de `MarcasModule`; si aparece un ciclo, resolverlo como el `forwardRef` de users↔follows)
- [x] 3.4 Tests de `AlfajorApprover` cubriendo los 8 escenarios del spec: con marca propia, creando la marca propuesta, reusando marca de nombre idéntico, con `marcaId` del body, `marcaId` inexistente (404), duplicado al resolver (409), sin marca ni nombre (400), status no PENDING (400)
- [x] 3.5 `ModerationController.approve` recibe el body opcional y lo pasa al approver; Swagger (`@ApiBody` opcional + `@ApiResponse` 404/409). Tests del controller

## 4. Consumidores y regresión

- [x] 4.1 Revisar los consumidores que asumen `marcaId` no nulo (`album`, `feed`, `recommendations`, `reviews`, `AlfajorSearcher`) y confirmar que todos filtran por `APPROVED`; documentar cualquier ajuste necesario
- [x] 4.2 `AlfajorRejecter`: confirmar con un test que rechazar una propuesta sin marca conserva `marcaNombrePropuesto` y no crea marcas

## 5. Verificación

- [ ] 5.1 `npm run lint` y `npm run build` OK
- [ ] 5.2 `npm run test:cov` verde con branch coverage ≥ 85% y los archivos tocados al 100%
- [ ] 5.3 Verificación end-to-end contra la Neon dev: proponer con marca libre, listar el pending como admin, aprobar creando la marca, y aprobar otra mapeando a una marca existente
- [ ] 5.4 Archivar el change (`/opsx:archive`) como último commit de la rama, antes de abrir la PR

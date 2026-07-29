## Why

Proponer un alfajor cuya marca no está cargada es hoy un callejón sin salida: `POST /alfajores` exige un `marcaId` UUID válido, y crear marcas (`POST /admin/marcas`) es solo ADMIN. El usuario que quiere aportar un alfajor de una marca chica —justamente el aporte más valioso para el catálogo— no tiene forma de completar la propuesta, mientras que el caso "el alfajor no está" sí tiene salida.

## What Changes

- `POST /alfajores` acepta **`marcaId` (existente) o `marcaNombre` (texto libre), exactamente uno de los dos**. `marcaId` deja de ser obligatorio — cambio aditivo y retrocompatible: las propuestas que hoy mandan `marcaId` siguen funcionando igual.
- Un alfajor puede quedar **PENDING sin marca**: `alfajores.marca_id` pasa a nullable y se suma `marca_nombre_propuesto`. **BREAKING a nivel de datos internos**, no de contrato: un alfajor APPROVED sigue teniendo marca siempre (invariante que el resto de la app ya asume).
- **El admin resuelve la marca al aprobar**: `PATCH /admin/alfajores/:id/approve` acepta un body opcional `{ marcaId? }`. Sobre un alfajor sin marca, con `marcaId` lo mapea a una marca existente y sin él crea la marca con el nombre propuesto. Aprobar un alfajor sin marca ni forma de resolverla es 400.
- `AlfajorResponseDto` gana `marcaNombrePropuesto: string | null` y `marcaId` pasa a `string | null` — el panel de moderación necesita mostrar qué marca pidió el usuario. **Cambio de shape aditivo salvo por el nullable de `marcaId`**, que el front tiene que contemplar (hoy lo tipa como `string`).
- Sin marca no aplica el unique `nombre + marcaId`: la colisión se detecta **al aprobar**, cuando la marca ya está resuelta, y devuelve 409.

## Capabilities

### New Capabilities
- `free-marca-proposal`: proponer un alfajor con marca por nombre libre y resolución de esa marca por parte del admin en el momento de aprobar.

### Modified Capabilities
<!-- Ninguna: el flujo de creación/moderación de alfajores no tiene spec propia en openspec/specs/. -->

## Impact

- **Módulos tocados**: `alfajores` (`CreateAlfajorDto`, `Alfajor` entity, `AlfajorCreator`, `AlfajorResponseDto`), `moderation` (`AlfajorApprover`, `ModerationController`, DTO nuevo de approve), `marcas` (se reusa `MarcaCreator`/`MarcaFinder`, sin cambios).
- **Base de datos**: migración nueva — `marca_id` nullable + columna `marca_nombre_propuesto`. Sin backfill (todas las filas existentes tienen marca).
- **Frontend (alphagoat-client)**: consume el contrato — `proposeAlfajor.schema` y `MarcaCombobox` deben permitir el nombre libre, el tipo `Alfajor` debe aceptar `marcaId` nullable, y el panel `/admin` debe mostrar la marca propuesta y permitir elegir una existente al aprobar. Es la mitad de la task del board y va en un PR aparte del repo del front.

## Non-goals

- **No** se crea una entidad `Marca` en estado PENDING ni una cola de moderación de marcas: la marca se materializa recién al aprobar el alfajor.
- **No** se deduplica el nombre libre de forma difusa (ni fuzzy ni unaccent): al aprobar sin `marcaId` se reusa la marca sólo si el nombre coincide **exacto**, y si no se crea una nueva. Detectar "Havana" vs "havanna" es trabajo del admin, que para eso tiene el `marcaId`.
- **No** se permite editar la marca propuesta después de crear la propuesta (el flujo de `PATCH /alfajores/:id` queda como está).
- **No** se notifica al usuario nada de esto (queda para el item de notificaciones por email del backlog).

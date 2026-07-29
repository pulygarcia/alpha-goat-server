# free-marca-proposal Specification

## Purpose
Que proponer un alfajor no dependa de que su marca ya esté en el catálogo: la
propuesta viaja con `marcaId` o con un `marcaNombre` en texto libre, queda en
`PENDING` sin marca, y el admin resuelve la marca al aprobar (creándola,
reusando una de nombre idéntico, o mapeando a la que él elija). La invariante
"todo alfajor `APPROVED` tiene marca" se mantiene.

## Requirements

### Requirement: Proponer un alfajor con marca por nombre libre

`POST /alfajores` (JwtAuthGuard) SHALL aceptar la marca de la propuesta como `marcaId` (UUID de una marca existente) **o** como `marcaNombre` (texto libre, 2–120 caracteres), y SHALL exigir exactamente uno de los dos. El alfajor creado queda en `PENDING` igual que hoy.

#### Scenario: Propuesta con marca existente

- **WHEN** un usuario autenticado hace `POST /alfajores` con `marcaId` de una marca existente y sin `marcaNombre`
- **THEN** el alfajor se crea en `PENDING` con esa `marcaId` y `marcaNombrePropuesto` en `null`, exactamente como antes de este cambio

#### Scenario: Propuesta con marca libre

- **WHEN** un usuario autenticado hace `POST /alfajores` con `marcaNombre: "Alfajores Doña Pepa"` y sin `marcaId`
- **THEN** el alfajor se crea en `PENDING` con `marcaId` en `null` y `marcaNombrePropuesto: "Alfajores Doña Pepa"`, y no se crea ninguna marca todavía

#### Scenario: Ninguno de los dos campos

- **WHEN** el request no trae ni `marcaId` ni `marcaNombre`
- **THEN** la API responde 400 sin crear nada

#### Scenario: Los dos campos a la vez

- **WHEN** el request trae `marcaId` y `marcaNombre` juntos
- **THEN** la API responde 400 sin crear nada

#### Scenario: `marcaId` inexistente

- **WHEN** el request trae un `marcaId` con formato UUID válido que no corresponde a ninguna marca
- **THEN** la API responde 404, igual que antes de este cambio

#### Scenario: Duplicado con marca existente

- **WHEN** el request trae un `marcaId` y un `nombre` que ya existen combinados en otro alfajor
- **THEN** la API responde 409, igual que antes de este cambio

#### Scenario: Duplicado entre propuestas de marca libre

- **WHEN** dos usuarios proponen el mismo `nombre` con el mismo `marcaNombre` libre
- **THEN** ambas propuestas se crean (sin marca no hay unicidad que chequear) y el conflicto se resuelve al aprobar

#### Scenario: Usuario anónimo

- **WHEN** un request sin sesión hace `POST /alfajores`
- **THEN** la API responde 401, igual que antes de este cambio

### Requirement: El admin resuelve la marca al aprobar

`PATCH /admin/alfajores/:id/approve` (JwtAuthGuard + RolesGuard ADMIN) SHALL aceptar un body opcional `{ marcaId?: string }`. Un alfajor SHALL pasar a `APPROVED` únicamente con una `marcaId` resuelta: la propia, la recibida en el body, o una marca creada/reusada a partir de `marcaNombrePropuesto`. Al aprobar, `marcaNombrePropuesto` SHALL quedar en `null`.

#### Scenario: Aprobar un alfajor que ya tiene marca

- **WHEN** el admin aprueba un alfajor `PENDING` con `marcaId`, sin body
- **THEN** el alfajor pasa a `APPROVED` conservando su marca, exactamente como antes de este cambio

#### Scenario: Aprobar creando la marca propuesta

- **WHEN** el admin aprueba un alfajor `PENDING` con `marcaNombrePropuesto: "Doña Pepa"` sin body, y no existe una marca con ese nombre exacto
- **THEN** se crea la marca `"Doña Pepa"`, el alfajor queda `APPROVED` apuntando a ella y `marcaNombrePropuesto` pasa a `null`

#### Scenario: Aprobar reusando una marca de nombre idéntico

- **WHEN** el admin aprueba un alfajor `PENDING` con `marcaNombrePropuesto: "Havanna"` sin body, y ya existe una marca con ese nombre exacto
- **THEN** el alfajor queda `APPROVED` apuntando a la marca existente, sin crear una marca duplicada

#### Scenario: Aprobar mapeando a una marca elegida por el admin

- **WHEN** el admin aprueba un alfajor `PENDING` sin marca enviando `{ marcaId }` de una marca existente
- **THEN** el alfajor queda `APPROVED` con esa marca, `marcaNombrePropuesto` pasa a `null` y el nombre propuesto se descarta

#### Scenario: El `marcaId` del body no existe

- **WHEN** el admin aprueba enviando un `marcaId` que no corresponde a ninguna marca
- **THEN** la API responde 404 y el alfajor sigue en `PENDING`

#### Scenario: El alfajor ya existe para la marca resuelta

- **WHEN** al resolver la marca el par `nombre + marcaId` ya existe en otro alfajor
- **THEN** la API responde 409 y el alfajor sigue en `PENDING`

#### Scenario: Alfajor sin marca ni nombre propuesto

- **WHEN** el admin aprueba un alfajor sin `marcaId`, sin `marcaNombrePropuesto` y sin body
- **THEN** la API responde 400 y el alfajor sigue en `PENDING`

#### Scenario: Alfajor que no está en PENDING

- **WHEN** el admin aprueba un alfajor `APPROVED` o `REJECTED`
- **THEN** la API responde 400, igual que antes de este cambio

#### Scenario: Rechazar una propuesta de marca libre

- **WHEN** el admin rechaza un alfajor sin marca
- **THEN** el alfajor pasa a `REJECTED` con su `rejectionReason` y conserva `marcaNombrePropuesto` (no se crea ninguna marca)

### Requirement: La marca propuesta viaja en la respuesta del alfajor

`AlfajorResponseDto` SHALL exponer `marcaNombrePropuesto: string | null` y SHALL permitir `marcaId: string | null`, para que el panel de moderación muestre qué marca pidió el usuario. Todo alfajor `APPROVED` SHALL tener `marcaId` no nulo.

#### Scenario: Alfajor pendiente con marca libre

- **WHEN** el admin lista `GET /admin/alfajores/pending` y hay una propuesta de marca libre
- **THEN** ese item viene con `marcaId: null`, `marca: null` y `marcaNombrePropuesto` con el texto del usuario

#### Scenario: Alfajor con marca resuelta

- **WHEN** se serializa cualquier alfajor con marca (aprobado o propuesto sobre una marca existente)
- **THEN** `marcaNombrePropuesto` viene en `null` y `marcaId`/`marca` se comportan como antes de este cambio

#### Scenario: El catálogo público no expone propuestas sin marca

- **WHEN** un usuario lista `GET /alfajores` sin ser admin
- **THEN** solo ve alfajores `APPROVED`, que siempre tienen marca — el nullable de `marcaId` no se observa en el catálogo

# Plan: Plury Competitivo con Lovable (Backend + Cache + Deploy)

## FASE 0: Optimización de Cache (Reducir costos YA)
**Impacto**: Bajar de ~$0.14 a ~$0.04-0.06 por mensaje típico
**Esfuerzo**: 1-2 horas

### 0.1 — Fix: Orchestrator no pasa cache metrics a créditos
**Archivo**: `server/src/routes/chat.ts` (líneas 622-623)
- Actualmente: `consumeCredits(userId, 'base', orchConfig.model, usage.inputTokens, usage.outputTokens)` — NO pasa `cacheCreationInputTokens` ni `cacheReadInputTokens`
- Fix: Pasar los 2 campos extra para que el descuento 90% aplique en créditos

### 0.2 — Fix: Logic solo manda mensajes user (pierde cache de contexto)
**Archivo**: `server/src/services/execution-engine.ts` (líneas 462-468)
- Actualmente: `history.filter(m => m.type === 'user')` — SOLO user messages
- Fix: Incluir user + assistant alternando, para que la conversación previa se cachee
- El cache de Anthropic necesita mensajes idénticos consecutivos para hacer hit

### 0.3 — Aumentar history de Logic de 6 a 10
- Con cache reads al 0.1x, más historial = mejor contexto por casi nada extra
- El system prompt de Logic (~8KB) ya se cachea, el historial extra cuesta 90% menos en reads

### 0.4 — Log cache hit rate para monitoreo
- Agregar métrica: `hitRate = cacheRead / (cacheRead + cacheCreation + input)`
- Log: `[Cache] HitRate: 78% (saved $0.12)`

---

## FASE 1: Supabase Client en el Template (Base técnica)
**Impacto**: Las apps generadas pueden conectarse a un backend real
**Esfuerzo**: 3-4 horas

### 1.1 — Agregar supabase-js al importmap del template base
**Archivo**: Template HTML base que envuelve las apps generadas
- Agregar al `<script type="importmap">`:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"
  }
}
```
- La key anon es segura client-side (toda la seguridad va por RLS en Supabase)

### 1.2 — Crear helper `supabase-client.ts` en el template base
```typescript
// src/lib/supabase.ts (incluido en el template)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = window.__SUPABASE_URL__ || ''
const supabaseKey = window.__SUPABASE_ANON_KEY__ || ''

export const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null
```

### 1.3 — Inyectar credenciales Supabase en el HTML servido
**Archivo**: `server/src/routes/deploy.ts` y/o middleware de subdominios
- Al servir la app, inyectar un `<script>` con las credenciales del conversation/deploy:
```html
<script>
  window.__SUPABASE_URL__ = "https://xxx.supabase.co"
  window.__SUPABASE_ANON_KEY__ = "eyJ..."
</script>
```
- Las credenciales ya existen en el schema: `supabaseUrl`, `supabaseAnonKey`

---

## FASE 2: UI de Conexión Supabase (UX del usuario)
**Impacto**: El usuario conecta su proyecto Supabase desde el workspace
**Esfuerzo**: 3-4 horas

### 2.1 — Panel de conexión Supabase en WorkspacePanel
- Botón "Conectar Supabase" en el workspace
- Modal con 2 campos: URL del proyecto + Anon Key
- Indicador visual de conexión activa (verde/rojo)
- Guardar en la conversación vía API existente

### 2.2 — Endpoint para probar conexión
- `POST /api/conversations/:id/supabase/test` — hace un health check al proyecto Supabase
- Verifica que la URL y key son válidas
- Opcionalmente lista las tablas existentes para que Logic las conozca

### 2.3 — Listar tablas del proyecto Supabase
- `GET /api/conversations/:id/supabase/tables` — introspección del schema
- Usa la API de Supabase para obtener tablas, columnas, tipos
- Este schema se pasa a Logic como contexto para generar código preciso

---

## FASE 3: Logic Genera Código Supabase (El core)
**Impacto**: Logic pasa de generar mock data a generar apps full-stack reales
**Esfuerzo**: 4-6 horas

### 3.1 — Actualizar system prompt de Logic con capacidades Supabase
Cuando una conversación tiene Supabase conectado, inyectar bloque adicional al prompt:

```
SUPABASE CONECTADO — Genera código que use datos REALES:
- import { supabase } from './lib/supabase'
- CRUD: supabase.from('tabla').select/insert/update/delete
- Auth: supabase.auth.signInWithPassword/signUp/signOut/onAuthStateChange
- Storage: supabase.storage.from('bucket').upload/getPublicUrl
- Realtime: supabase.channel('x').on('postgres_changes', ...)
- NUNCA mock data cuando Supabase está conectado
- Usa las tablas existentes: {tableSchema}
```

### 3.2 — Pasar schema de tablas como contexto al task de Logic
**Archivo**: `server/src/services/execution-engine.ts`
- Antes de ejecutar Logic, consultar las tablas de Supabase de la conversación
- Incluir en el task: "Tablas disponibles: users(id, name, email), products(id, name, price, stock)..."
- Logic genera código que usa las tablas reales

### 3.3 — Generar SQL migrations cuando no hay tablas
- Si el usuario pide "sistema de ingresos y gastos" y no hay tablas, Logic debe:
  1. Generar el SQL de las tablas necesarias (CREATE TABLE, RLS policies)
  2. Mostrar el SQL al usuario para que lo ejecute en Supabase
  3. Generar el frontend que conecta a esas tablas
- Output: `{ "files": {...}, "sql": "CREATE TABLE transactions..." }`

### 3.4 — Auth wrapper component
- Logic genera un `<AuthProvider>` con login/registro
- Rutas protegidas con session check
- Perfil de usuario, logout
- Patrón estándar: onAuthStateChange → useState → conditional render

---

## FASE 4: Deploy Full-Stack (Apps que funcionan en producción)
**Impacto**: Las apps deployadas tienen backend funcional
**Esfuerzo**: 2-3 horas

### 4.1 — Inyectar credenciales en subdomain deploys
**Archivo**: `server/src/middleware/subdomain.ts`
- Al servir `{slug}.plury.co`, inyectar las credenciales Supabase del deploy
- El HTML ya se genera estático, solo hay que inyectar el `<script>` con las env vars

### 4.2 — Inyectar credenciales en custom domain deploys
- Mismo patrón para custom domains
- Las credenciales se leen del Deliverable asociado al dominio

### 4.3 — Panel de SQL Migrations en el workspace
- Sección "Base de datos" en el workspace
- Muestra las migraciones SQL generadas por Logic
- Botón "Copiar SQL" para que el usuario lo pegue en Supabase Dashboard
- (Futuro: ejecutar SQL directo vía Supabase Management API)

---

## FASE 5: Diferenciadores (Lo que Lovable NO tiene)
**Impacto**: Ventaja competitiva real
**Esfuerzo**: Paralelo, continuo

### 5.1 — Video (Reel + Veo 3) — YA EXISTE
### 5.2 — SEO (Lupa) — YA EXISTE
### 5.3 — Ads (Metric) — YA EXISTE
### 5.4 — Multi-agente con dependencias — YA EXISTE
### 5.5 — Diseño visual (Pixel + Midjourney) — YA EXISTE

---

## Resumen de Prioridades

| Fase | Qué | Impacto | Horas | Prioridad |
|------|-----|---------|-------|-----------|
| 0 | Cache optimization | -60% costo por mensaje | 1-2h | AHORA |
| 1 | Supabase en template | Base técnica | 3-4h | Alta |
| 2 | UI conexión Supabase | UX usuario | 3-4h | Alta |
| 3 | Logic genera Supabase | Core competitivo | 4-6h | CRÍTICA |
| 4 | Deploy full-stack | Producción real | 2-3h | Alta |

**Total estimado**: ~15-20 horas de desarrollo para ir de "generador de maquetas" a "builder full-stack competitivo con Lovable"

# StovaSpot

Una herramienta interna para gestionar listas de contactos de eventos, procesarlos localmente y buscar en HubSpot. Construida con Next.js, Tailwind CSS, PostgreSQL y Prisma.

## Características

- ✅ Gestión de múltiples eventos
- ✅ Carga de CSV con drag & drop
- ✅ Tabla interactiva con ordenamiento ascendente/descendente
- ✅ Filtrado por nombre y email
- ✅ Marcado de contactos revisados
- ✅ Búsqueda directa en HubSpot con un click
- ✅ Base de datos PostgreSQL para persistencia
- ✅ Categorización por evento

## Requisitos

- Node.js 18+
- PostgreSQL 12+

## Instalación

### 1. Configurar la base de datos

Crea un archivo `.env.local` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/stovaspot?schema=public"
```

Reemplaza:
- `usuario` con tu usuario de PostgreSQL
- `contraseña` con tu contraseña
- `stovaspot` con el nombre de tu base de datos

### 2. Ejecutar migraciones de Prisma

```bash
npm run prisma:migrate
```

Nombre para la migración: `initial`

### 3. Iniciar el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Uso

### Crear un Evento

1. Haz clic en "Nuevo Evento"
2. Ingresa el nombre y descripción (opcional)
3. Haz clic en "Crear Evento"

### Cargar Contactos

1. Selecciona un evento
2. Arrastra un archivo CSV o haz clic para seleccionar uno
3. El CSV debe tener estas columnas (de Stova):
   - `First Name`
   - `Last Name`
   - `Email`
   - `Registration Date` (opcional)
   - `Last Modified Date` (opcional)
   - `Cancellation Date` (opcional)
   - `Attendee Category` (opcional)
   - `Registration Status` (opcional)

### Buscar Contactos

- Usa la barra de búsqueda para filtrar por nombre o email
- Haz clic en el encabezado de columnas para ordenar (↑ asc, ↓ desc)
- Haz clic en "HubSpot" para buscar el contacto en HubSpot

### Marcar como Revisado

- Haz clic en "Revisar" para marcar un contacto
- Las pestañas muestran el conteo de cada estado

## Scripts

```bash
npm run dev                # Servidor de desarrollo
npm run build             # Compilar
npm run start             # Producción
npm run prisma:migrate    # Migraciones
npm run prisma:studio     # UI de base de datos
```

## Estructura

```
app/
  ├── api/events/         # Rutas de eventos
  ├── api/contacts/       # Rutas de contactos
  └── page.tsx            # UI principal

prisma/
  └── schema.prisma       # Modelos
  
lib/
  └── db.ts               # Cliente Prisma
```

## Modelos

### Event
- id, name, description, contacts[], createdAt, updatedAt

### Contact
- id, firstName, lastName, email, registrationDate, lastModifiedDate, cancellationDate, attendeeCategory, registrationStatus, isReviewed, eventId

## Solución de Problemas

**Error de conexión a BD:**
- Verifica que PostgreSQL esté corriendo
- Comprueba la URL en `.env.local`
- Verifica que la base de datos exista

**Resetear BD:**
```bash
npx prisma migrate reset
```

**Ver datos:**
```bash
npm run prisma:studio
```

## Tecnologías

- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- PapaParse

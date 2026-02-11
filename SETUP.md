# Guía de Configuración - StovaSpot

## Instalación de PostgreSQL

### macOS (Homebrew)

```bash
# Instalar PostgreSQL
brew install postgresql@15

# Iniciar el servicio
brew services start postgresql@15

# Crear la base de datos
createdb stovaspot

# Conectarse a psql (opcional)
psql -d stovaspot
```

### Ubuntu/Debian

```bash
# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Conectarse como superusuario
sudo -u postgres psql

# En la consola psql:
CREATE DATABASE stovaspot;
\q
```

### Windows

Descarga e instala desde https://www.postgresql.org/download/windows/

Durante la instalación, anota la contraseña del usuario `postgres`.

## Configuración de StovaSpot

### 1. Archivo `.env.local`

Crea este archivo en la raíz del proyecto con tus credenciales:

```env
DATABASE_URL="postgresql://postgres:tu_contraseña@localhost:5432/stovaspot?schema=public"
```

**Nota:** 
- `postgres` es el usuario por defecto
- Reemplaza `tu_contraseña` con la contraseña que configuraste
- Si usaste un usuario diferente, reemplaza `postgres` también

### 2. Ejecutar Migraciones

```bash
npm install
npm run prisma:migrate
```

En el prompt, ingresa un nombre para la migración: `initial`

### 3. Verificar Conexión

Para verificar que todo esté funcionando:

```bash
npm run prisma:studio
```

Se abrirá una UI en http://localhost:5555 donde puedes ver la base de datos.

### 4. Iniciar la Aplicación

```bash
npm run dev
```

Abre http://localhost:3000

## Próximas Pasos

1. **Crear un Evento** - Haz clic en "Nuevo Evento"
2. **Subir un CSV** - Arrastra un archivo CSV exportado de Stova
3. **Revisar Contactos** - Usa los botones para marcar como revisados
4. **Buscar en HubSpot** - Haz clic en "HubSpot" para cada contacto

## Solución de Problemas

### "Could not connect to the database server at localhost:5432"

- Verifica que PostgreSQL esté corriendo:
  ```bash
  # macOS
  brew services list
  
  # Ubuntu
  sudo systemctl status postgresql
  ```

- Intenta conectarte directamente:
  ```bash
  psql -d stovaspot
  ```

### "password authentication failed"

- Verifica la contraseña en `.env.local`
- Reseteala contraseña:
  ```bash
  sudo -u postgres psql
  ALTER USER postgres PASSWORD 'nueva_contraseña';
  \q
  ```

### "database does not exist"

```bash
createdb stovaspot
```

## Comandos Útiles

```bash
# Ver la estructura de la BD
npm run prisma:studio

# Ejecutar migraciones pendientes
npm run prisma:migrate

# Resetear la BD (borra todo)
npx prisma migrate reset

# Ver logs de Prisma
export DEBUG="prisma:*"
npm run dev
```

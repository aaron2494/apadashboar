# APA Dashboard

Gestor de clientes, proyectos y pagos para agencias de marketing.

![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)

## Setup en 4 pasos

### 1. Crear proyecto en Supabase
- Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratis
- Nuevo proyecto → elegí nombre y región (South America si está disponible)
- Esperá que termine de crear (~1 min)

### 2. Ejecutar el schema SQL
- En Supabase → **SQL Editor** → pegar el contenido de `supabase-schema.sql` → Run
- Esto crea las tablas, el trigger automático de pagos y los datos de ejemplo

### 3. Configurar las credenciales
- En Supabase → **Settings → API**
- Copiá la **Project URL** y la **anon/public key**
- Pegás esos valores en `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU_PROJECT_ID.supabase.co',
  supabaseKey: 'TU_ANON_KEY',
};
```

### 4. Crear usuario demo
- En Supabase → **Authentication → Users → Add user**
- Email: `demo@apamarketing.com` / Password: `demo1234`

### Levantar en local

```bash
npm install
npm start
# http://localhost:4200
```

## Deploy en Vercel

1. Subir el proyecto a GitHub
2. En [vercel.com](https://vercel.com) → New Project → importar el repo
3. Framework: Angular / Build command: `npm run build`
4. Output directory: `dist/apa-dashboard/browser`
5. Agregar variables de entorno si usás `environment.prod.ts`

## Features Angular 20

| Feature | Dónde se usa |
|---------|-------------|
| Standalone Components | Todos los componentes |
| Signals + computed() | Todos los servicios + DashboardService |
| @if / @for (nuevo control flow) | Todos los templates |
| Guards funcionales | authGuard con Supabase session |
| Lazy loading | Todas las rutas |
| Reactive Forms + validadores | Login, Clientes, Proyectos, Pagos |
| inject() pattern | Todos los servicios |

## Estructura

```
src/app/
├── core/
│   ├── models/          ← Interfaces TypeScript
│   ├── services/        ← SupabaseService, ClienteService, ProyectoService...
│   └── guards/          ← authGuard
├── features/
│   ├── auth/            ← Login
│   ├── dashboard/       ← Stats + gráfico de ingresos
│   ├── clientes/        ← CRUD con búsqueda
│   └── proyectos/       ← Lista + detalle con pagos
└── shared/
    └── components/
        └── layout/      ← Sidebar + RouterOutlet
```

# Ecommerce (Fullstack) — Express + tRPC + Prisma + Next.js

![CI](../../actions/workflows/ci.yml/badge.svg)

Projeto fullstack com backend em Node.js/TypeScript (Express + tRPC + Prisma/Postgres) e frontend em Next.js.

## Stack

- **Backend**: Express, tRPC, Prisma, JWT, Helmet, CORS, rate limit, pino
- **Frontend**: Next.js, React
- **Banco**: PostgreSQL (Docker Compose incluído)
- **Testes**: Vitest + Supertest (E2E via endpoints HTTP)

## Estrutura

- `src/` → backend (Express + tRPC)
- `prisma/` → schema e seed
- `frontend/` → app Next.js

## Requisitos

- Node.js **>= 18** (recomendado: 22)
- PostgreSQL **ou** Docker Desktop (recomendado para rodar local)

## Configuração de ambiente

Você tem 2 jeitos:

### Opção A) Criar `.env` (recomendado)

Copie `.env.example` para `.env` e preencha:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public
JWT_SECRET=coloque_uma_chave_com_pelo_menos_16_chars
```

Opcional:

```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
```

### Opção B) Definir no PowerShell (Windows)

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public"
$env:JWT_SECRET="uma_chave_segura_com_pelo_menos_16_chars"
```

Importante: o **Prisma CLI** (comandos `db:push`, `seed`, etc.) precisa do `DATABASE_URL` definido, senão vai dar erro `P1012 Environment variable not found: DATABASE_URL`.

## Rodando local (tutorial)

Se você estiver no Windows e o projeto estiver dentro de duas pastas parecidas, a “raiz do projeto” é a pasta **que contém** `package.json`, `frontend/` e `docker-compose.yml`:

`...\ecommerce-monorepo-main\ecommerce-monorepo-main\`

### 1) Subir o banco (Docker)

Com o Docker Desktop aberto:

```powershell
docker compose up -d
```

### 2) Instalar dependências

```powershell
npm install
npm --prefix frontend install
```

### 3) Prisma (gerar client + criar tabelas + seed)

```powershell
npm run db:generate
npm run db:push
npm run seed
```

### 4) Rodar tudo (backend + frontend)

```powershell
npm run dev:full
```

### URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Demo em 2 minutos (pra portfólio)

1) Suba o projeto com `npm run dev:full`
2) Abra http://localhost:3000
3) Faça o fluxo:
   - Login
   - Listar produtos → abrir um produto
   - Adicionar ao carrinho → abrir carrinho
   - Checkout → ver a ordem em “Orders”
   - (Opcional) Admin → criar/editar produto/categoria

## Credenciais do seed

- Usuário teste: `test.user1@example.com` / `senha123`
- Admin: `admin@example.com` / `admin123`

## Scripts (backend raiz)

- `npm run dev` → backend com `tsx watch`
- `npm run dev:frontend` → frontend
- `npm run dev:full` → backend + frontend em paralelo
- `npm run lint` → lint do frontend
- `npm run build` → build do backend (tsc)
- `npm run build:frontend` → build do frontend
- `npm run build:full` → build backend + frontend
- `npm run start` → roda backend a partir de `dist/`
- `npm run test` → vitest
- `npm run db:generate` → prisma generate
- `npm run db:push` → prisma db push
- `npm run db:studio` → prisma studio
- `npm run seed` → popular banco

## Portas

- Backend usa `PORT` ou **3001** por padrão; se estiver em uso tenta a próxima.
- Frontend usa **3000** por padrão (Next dev).

## Endpoints HTTP (principais)

### Health

- `GET /healthz` → `ok`
- `GET /` → status do backend

### Auth

- `POST /api/auth/register` → `{ name, email, password }`
- `POST /api/auth/login` → `{ email, password }`
- `POST /api/auth/refresh` → `{ refreshToken? }` (ou via cookie `refreshToken`)
- `POST /api/auth/logout` → `{ refreshToken? }` (ou via cookie `refreshToken`)
- `GET /api/auth/me` → sessão atual (via `Authorization: Bearer <token>`)

### Usuário

- `GET /api/user/me`
- `PUT /api/user/me`
- `PUT /api/user/password` → `{ oldPassword, newPassword }`

### Produtos e categorias

- `GET /api/categories`
- `GET /api/products` (query: `category`, `q`, `sort`)
- `GET /api/products/:id`

### Carrinho (requer `Authorization: Bearer <token>`)

- `GET /api/cart`
- `GET /api/cart/summary`
- `POST /api/cart/items` → `{ productId, quantity, variantId? }`
- `PATCH /api/cart/items/:itemId` → `{ quantity }`
- `DELETE /api/cart/items/:itemId`
- `DELETE /api/cart`

### Checkout e ordens (requer `Authorization: Bearer <token>`)

- `POST /api/checkout`
- `GET /api/orders`
- `GET /api/orders/:id`

### Admin (requer usuário ADMIN)

- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id`

## Testes

- Os testes E2E dependem de Postgres.
- Se não houver banco rodando em `localhost:5432`, os testes podem aparecer como `skipped`.

Rodar o pacote completo:

```powershell
docker compose up -d
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public"
npm run db:push
npm run seed
npm run test
```

## Postman

- Importe [postman_collection.json](file:///c:/Users/isaac/Área%20de%20Trabalho/Dev/ecommerce-monorepo-main/ecommerce-monorepo-main/postman_collection.json)
- Defina `baseUrl` (ex: `http://localhost:3001`) e `token`

## Troubleshooting rápido

- **`npm error enoent ... package.json`**: você rodou o comando na pasta errada. Entre em `...\ecommerce-monorepo-main\ecommerce-monorepo-main\`.
- **`P1012 Environment variable not found: DATABASE_URL`**: defina `DATABASE_URL` no `.env` ou no PowerShell antes de rodar comandos Prisma.
- **`net::ERR_CONNECTION_REFUSED http://localhost:3000`**: o frontend não está rodando. Rode `npm run dev:full` e aguarde “Ready”.

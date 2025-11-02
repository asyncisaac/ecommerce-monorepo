Ecommerce Backend (Express + tRPC)

Visão geral
- Backend em Node.js/TypeScript com Express e tRPC.
- Modo Dev com tsx, build com tsc, ESM com import de arquivos locais usando extensão .js.
- Rotas navegáveis (HTTP) expostas para facilitar testes via navegador/Postman.
- Autenticação JWT, Prisma ORM com PostgreSQL.

Requisitos
- Node.js >= 18
- PostgreSQL
- Variáveis no .env:
  - DATABASE_URL=postgresql://user:password@host:port/dbname
  - JWT_SECRET=uma_chave_segura_aqui
  - PORT=3000 (opcional)

Instalação e setup
1) Instale dependências: npm install
2) Gere o cliente do Prisma: npm run db:generate
3) Suba/atualize o schema no banco (opcional): npm run db:push
4) Popule dados de exemplo: npm run seed (requer DATABASE_URL)

Scripts
- Desenvolvimento: npm run dev
- Build: npm run build
- Produção: npm run start
- Prisma Studio (GUI do banco): npm run db:studio
- Seed: npm run seed

Porta e fallback
- O servidor tenta usar PORT do .env ou 3000.
- Se 3000 estiver em uso, tenta 3001 automaticamente.

Health e status
- GET /healthz → ok
- GET / → JSON de status e instruções

Autenticação (REST wrappers chamando tRPC internamente)
- POST /api/auth/register
  - Body: { name, email, password }
- POST /api/auth/login
  - Body: { email, password }
- GET /api/auth/me
  - Header: Authorization: Bearer <token>

Produtos e categorias
- GET /api/categories → lista categorias
- GET /api/products → lista produtos paginados
  - Query: category, limit, page
- GET /api/products/:id → produto por ID (cuid)

Carrinho (requer Authorization: Bearer <token>)
- GET /api/cart → carrinho do usuário
- POST /api/cart/items → adiciona item
  - Body: { productId, quantity, variantId? }
- PATCH /api/cart/items/:itemId → atualiza quantidade
  - Body: { quantity }
- DELETE /api/cart/items/:itemId → remove item
- DELETE /api/cart → limpa carrinho

Postman
- Importar o arquivo postman_collection.json
- Variáveis: baseUrl, token
- Execute Login para preencher token automaticamente; em seguida execute Me.

Boas práticas de segurança já aplicadas
- O backend não expõe o campo password em respostas protegidas.
- Helmet + CORS + Morgan habilitados.

Próximos passos sugeridos
- Padronizar respostas de erro e sucesso (formato consistente)
- Adicionar rate limiting e CORS restrito ao domínio do frontend
- Implementar refresh token e expiração de sessão
- Adicionar wrappers REST para outros módulos conforme necessidade
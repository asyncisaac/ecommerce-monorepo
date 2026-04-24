# Testes Automatizados (Vitest + Supertest)

Este projeto possui uma suíte inicial de testes automatizados cobrindo:
- CRUD ADMIN de Categorias e Produtos
- Fluxo de Checkout e Ordens

## Como executar

1. Garanta que o banco esteja disponível em `DATABASE_URL`.
2. Gere o Prisma Client (uma vez):
3. Execute:

```
npm run db:generate
npm test
```

## Estrutura

Os testes ficam em `tests/`:
- `helpers.ts`: utilitários de login e base de URL
- `admin_crud.test.ts`: valida criação, atualização, listagem e remoção de categorias e produtos
- `checkout_orders.test.ts`: valida adicionar itens ao carrinho, resumo, checkout, listar ordens, detalhar ordem, carrinho vazio e estoque atualizado

Observação: os testes sobem o app em memória (Supertest) e dependem de banco Postgres acessível via `DATABASE_URL`.

## Próximos passos sugeridos para testes

- Adicionar testes de autenticação (register/login/me)
- Cobrir carrinho (adicionar/remover/atualizar/limpar)
- Testes de erro (estoque insuficiente, permissões ADMIN, validações de entrada)
- Cobrir paginação e filtros em `/api/products`
- Integrar com CI (GitHub Actions) e coletar cobertura

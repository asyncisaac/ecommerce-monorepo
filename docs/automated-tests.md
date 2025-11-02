# Testes Automatizados (Vitest + Supertest)

Este projeto possui uma suíte inicial de testes automatizados cobrindo:
- CRUD ADMIN de Categorias e Produtos
- Fluxo de Checkout e Ordens

## Como executar

1. Garanta que o backend esteja rodando em http://localhost:3001
2. Execute:

```
npm test
```

## Estrutura

Os testes ficam em `backend/tests`:
- `helpers.ts`: utilitários de login e base de URL
- `admin_crud.test.ts`: valida criação, atualização, listagem e remoção de categorias e produtos
- `checkout_orders.test.ts`: valida adicionar itens ao carrinho, resumo, checkout, listar ordens, detalhar ordem, carrinho vazio e estoque atualizado

Observação: A URL base é fixa em `http://localhost:3001` para evitar conflitos de variáveis de ambiente em ambientes de build.

## Próximos passos sugeridos para testes

- Adicionar testes de autenticação (register/login/me)
- Cobrir carrinho (adicionar/remover/atualizar/limpar)
- Testes de erro (estoque insuficiente, permissões ADMIN, validações de entrada)
- Cobrir paginação e filtros em `/api/products`
- Integrar com CI (GitHub Actions) e coletar cobertura
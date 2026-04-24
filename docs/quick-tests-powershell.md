# Testes rápidos via PowerShell (Windows)

Este guia mostra como validar rapidamente os endpoints do backend usando PowerShell.

## Pré-requisitos
- Docker com PostgreSQL rodando (container do banco ativo).
- Arquivo `.env` configurado (incluindo `DATABASE_URL` e `JWT_SECRET`).
- Banco com schema e seed aplicados:
  - `npm run db:push`
  - `npm run seed`
- Servidor de desenvolvimento ativo:
  - `npm run dev` (abre em `http://localhost:3001`)

## Health check
```powershell
Invoke-WebRequest -Uri http://localhost:3001/healthz
```

## Autenticação
### Registrar
```powershell
$body = @{ name = "Test User"; email = "test.user1@example.com"; password = "senha123" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -Body $body -ContentType "application/json"
```

### Login e preparar cabeçalho
```powershell
$loginBody = @{ email = "test.user1@example.com"; password = "senha123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $loginBody -ContentType "application/json"
$token = $login.token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
```

### Usuário atual (/api/auth/me)
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/auth/me -Method GET -Headers $headers | ConvertTo-Json -Depth 4
```

## Categorias e Produtos
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/categories -Method GET | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://localhost:3001/api/products -Method GET | ConvertTo-Json -Depth 6
```

## Carrinho
### Ver carrinho
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/cart -Method GET -Headers $headers | ConvertTo-Json -Depth 6
```

### Adicionar item (use IDs do /api/products)
```powershell
$productId = "<PRODUCT_ID>"
$variantId = "<VARIANT_ID>"  # opcional
$addBody = @{ productId = $productId; quantity = 1; variantId = $variantId } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/cart/items -Method POST -Headers $headers -Body $addBody | ConvertTo-Json -Depth 6
```

### Atualizar quantidade
```powershell
$cart = Invoke-RestMethod -Uri http://localhost:3001/api/cart -Method GET -Headers $headers
$itemId = $cart.items[0].id
$updateBody = @{ quantity = 3 } | ConvertTo-Json
Invoke-RestMethod -Uri ("http://localhost:3001/api/cart/items/" + $itemId) -Method PATCH -Headers $headers -Body $updateBody | ConvertTo-Json -Depth 6
```

### Remover item
```powershell
Invoke-RestMethod -Uri ("http://localhost:3001/api/cart/items/" + $itemId) -Method DELETE -Headers $headers | ConvertTo-Json -Depth 6
```

### Limpar carrinho
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/cart -Method DELETE -Headers $headers | ConvertTo-Json -Depth 6
# Observação: a rota correta é DELETE /api/cart (POST /api/cart/clear não existe)
```

## Endpoints ADMIN (/api/users)
### Promover usuário para ADMIN
Você pode usar o script:
- Com npm script:
```powershell
npm run promote:admin -- test.user1@example.com
```
- Ou diretamente com npx:
```powershell
npx tsx scripts/promote-admin.ts test.user1@example.com
```

### Confirmar role
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/auth/me -Method GET -Headers $headers | ConvertTo-Json -Depth 4
# Deve exibir "role": "ADMIN"
```

Observação: o seed já cria um usuário ADMIN (`admin@example.com` / `admin123`).

### Listar usuários
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/users -Method GET -Headers $headers | ConvertTo-Json -Depth 6
```

### Criar usuário
```powershell
$newUserBody = @{ name = "Admin Created"; email = "admin.created@example.com"; password = "senha12345" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/users -Method POST -Headers $headers -Body $newUserBody | ConvertTo-Json -Depth 6
```

## Dicas
- Se receber erro de conexão Prisma (PrismaClientInitializationError), verifique se o container do Postgres está ativo e se `DATABASE_URL` está correto.
- Se o endpoint de limpar carrinho retornar `Cannot POST /api/cart/clear`, troque para DELETE `/api/cart`.
- Em caso de erro de autorização, cheque o header `Authorization` e renove o token via login.

## Checkout & Orders (PowerShell)

Roteiro completo para validar checkout e ordens usando um usuário existente (por exemplo, admin.created@example.com):

1) Login e preparar headers

```powershell
$base = "http://localhost:3001"
$loginBody = @{ email = "admin.created@example.com"; password = "senha12345" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.token
$headers = @{ Authorization = "Bearer $token" }
```

2) Escolher um produto e (se houver) a primeira variante

```powershell
$productsResp = Invoke-RestMethod -Uri "$base/api/products" -Method GET -Headers $headers
$firstProduct = $productsResp.products | Select-Object -First 1
$variantId = $null
if ($firstProduct.variants -and $firstProduct.variants.Count -gt 0) { $variantId = $firstProduct.variants[0].id }
```

3) Adicionar 2 unidades ao carrinho

```powershell
$addBody = if ($variantId) { @{ productId = $firstProduct.id; quantity = 2; variantId = $variantId } } else { @{ productId = $firstProduct.id; quantity = 2 } }
$addBodyJson = $addBody | ConvertTo-Json
$addedItem = Invoke-RestMethod -Uri "$base/api/cart/items" -Method POST -Headers $headers -Body $addBodyJson -ContentType "application/json"
```

4) Resumo do carrinho

```powershell
$summary = Invoke-RestMethod -Uri "$base/api/cart/summary" -Method GET -Headers $headers
$summary | ConvertTo-Json -Depth 6
```

5) Checkout

```powershell
$checkout = Invoke-RestMethod -Uri "$base/api/checkout" -Method POST -Headers $headers
$orderId = $checkout.id
$checkout | ConvertTo-Json -Depth 6
```

6) Listar ordens

```powershell
$orders = Invoke-RestMethod -Uri "$base/api/orders" -Method GET -Headers $headers
$orders | ConvertTo-Json -Depth 6
```

7) Detalhar ordem por ID

```powershell
$orderById = Invoke-RestMethod -Uri "$base/api/orders/$orderId" -Method GET -Headers $headers
$orderById | ConvertTo-Json -Depth 6
```

8) Verificações pós-checkout

```powershell
$cartAfter = Invoke-RestMethod -Uri "$base/api/cart" -Method GET -Headers $headers
$productAfter = Invoke-RestMethod -Uri "$base/api/products/$($firstProduct.id)" -Method GET -Headers $headers
[PSCustomObject]@{
  CartItemsAfterCheckout = ($cartAfter.items | Measure-Object).Count
  ProductStockAfter = $productAfter.stock
} | ConvertTo-Json -Depth 6
```

Observações:
- Se o carrinho estiver vazio, o checkout retorna erro; adicione itens primeiro.
- Em caso de estoque insuficiente, o endpoint de checkout responderá com status 409.
- O checkout limpa o carrinho e decrementa o estoque do(s) produto(s) envolvido(s).

## ADMIN CRUD: Categorias e Produtos

Scripts rápidos para criar/editar/remover categorias e produtos (requer usuário ADMIN e token Authorization):

1) Preparar ambiente

```powershell
$base = "http://localhost:3001"
$loginBody = @{ email = "admin@example.com"; password = "admin123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
```

2) Criar categoria

```powershell
$catBody = @{ name = "Acessórios" } | ConvertTo-Json
$category = Invoke-RestMethod -Uri "$base/api/admin/categories" -Method POST -Headers $headers -Body $catBody -ContentType "application/json"
$category | ConvertTo-Json -Depth 6
```

3) Atualizar categoria

```powershell
$catUpdate = @{ name = "Acessórios & Gadgets" } | ConvertTo-Json
Invoke-RestMethod -Uri ("$base/api/admin/categories/" + $category.id) -Method PATCH -Headers $headers -Body $catUpdate -ContentType "application/json" | ConvertTo-Json -Depth 6
```

4) Criar produto na categoria

```powershell
$prodBody = @{ name = "Capinha de Celular"; description = "Capinha transparente"; price = 49.9; discount = 0; stock = 100; images = @(); categoryId = $category.id } | ConvertTo-Json
$product = Invoke-RestMethod -Uri "$base/api/admin/products" -Method POST -Headers $headers -Body $prodBody -ContentType "application/json"
$product | ConvertTo-Json -Depth 6
```

5) Atualizar produto (preço e estoque)

```powershell
$prodUpdate = @{ price = 59.9; stock = 120 } | ConvertTo-Json
Invoke-RestMethod -Uri ("$base/api/admin/products/" + $product.id) -Method PATCH -Headers $headers -Body $prodUpdate -ContentType "application/json" | ConvertTo-Json -Depth 6
```

6) Validar listagem por categoria

```powershell
Invoke-RestMethod -Uri ("$base/api/products?category=" + [System.Web.HttpUtility]::UrlEncode($category.name)) -Method GET -Headers $headers | ConvertTo-Json -Depth 6
```

7) Remover produto e depois a categoria

```powershell
Invoke-RestMethod -Uri ("$base/api/admin/products/" + $product.id) -Method DELETE -Headers $headers | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri ("$base/api/admin/categories/" + $category.id) -Method DELETE -Headers $headers | ConvertTo-Json -Depth 6
```

Notas:
- Remover categoria com produtos vinculados retorna erro (409). Exclua os produtos primeiro.
- Remover produto vinculado a carrinhos/ordens retorna erro (409). Limpe carrinhos ou escolha outro produto.
- Os slugs são gerados automaticamente e únicos; se houver conflito, adicionamos um sufixo aleatório.

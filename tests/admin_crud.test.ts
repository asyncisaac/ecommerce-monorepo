import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { base, login } from './helpers';

// Estes testes cobrem CRUD ADMIN de categorias e produtos

describe('ADMIN CRUD - Categorias e Produtos', () => {
  it('cria, atualiza, lista e remove categoria e produto', async () => {
    const { headers } = await login('test.user1@example.com', 'senha123');

    const suffix = Date.now();
    const catName = `Cat-${suffix}`;
    const catNameUpdated = `CatUpdated-${suffix}`;

    // Criar categoria
    const createCat = await request(base)
      .post('/api/admin/categories')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send({ name: catName });
    expect(createCat.statusCode).toBe(201);
    const category = createCat.body;
    expect(category?.id).toBeTruthy();
    expect(category?.name).toBe(catName);

    // Atualizar categoria
    const updateCat = await request(base)
      .patch(`/api/admin/categories/${category.id}`)
      .set(headers)
      .set('Content-Type', 'application/json')
      .send({ name: catNameUpdated });
    expect(updateCat.statusCode).toBe(200);
    const categoryUpdated = updateCat.body;
    expect(categoryUpdated?.name).toBe(catNameUpdated);

    // Criar produto
    const prodName = `Produto-${suffix}`;
    const createProd = await request(base)
      .post('/api/admin/products')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send({
        name: prodName,
        description: 'Produto de teste',
        price: 49.9,
        discount: 0,
        stock: 100,
        images: [],
        categoryId: category.id,
      });
    expect(createProd.statusCode).toBe(201);
    const product = createProd.body;
    expect(product?.id).toBeTruthy();
    expect(product?.name).toBe(prodName);
    expect(product?.categoryId).toBe(category.id);

    // Atualizar produto
    const updateProd = await request(base)
      .patch(`/api/admin/products/${product.id}`)
      .set(headers)
      .set('Content-Type', 'application/json')
      .send({ price: 59.9, stock: 120 });
    expect(updateProd.statusCode).toBe(200);
    const productUpdated = updateProd.body;
    expect(Number(productUpdated?.price)).toBe(59.9);
    expect(productUpdated?.stock).toBe(120);

    // Listar por categoria
    const listByCat = await request(base)
      .get(`/api/products?category=${encodeURIComponent(categoryUpdated.name)}`)
      .set(headers);
    expect(listByCat.statusCode).toBe(200);
    const pList = listByCat.body;
    expect(Array.isArray(pList?.products)).toBe(true);
    const found = pList.products.find((p: any) => p.id === product.id);
    expect(found?.id).toBe(product.id);

    // Remover produto
    const delProd = await request(base)
      .delete(`/api/admin/products/${product.id}`)
      .set(headers);
    expect(delProd.statusCode).toBe(200);
    expect(delProd.body?.id).toBe(product.id);

    // Remover categoria
    const delCat = await request(base)
      .delete(`/api/admin/categories/${category.id}`)
      .set(headers);
    expect(delCat.statusCode).toBe(200);
    expect(delCat.body?.id).toBe(category.id);
  });
});
// handlers.js
import { http, HttpResponse } from 'msw';
import { generateProducts } from '../utils/generateProducts.js';

export const handlers = [
  http.get('/api/products', () => {
    console.log('Handling GET /api/products request');
    const products = generateProducts(42);
    return HttpResponse.json(products, { status: 200 });
  })
];

// handlers.js
import { http, HttpResponse } from 'msw';
import { generateProducts } from '../utils/generateProducts.js';

export const handlers = [
  http.get('/api/products', ({ request }) => {
    console.log('Handling GET /api/products request');
    
    const url = new URL(request.url);
    const scenario = url.searchParams.get('scenario');
    
    switch (scenario) {
      case 'empty':
        console.log('Returning empty products array');
        return HttpResponse.json([], { status: 200 });
      
      case 'error':
        console.log('Returning 500 error');
        return HttpResponse.json(
          { error: 'Internal Server Error', message: 'Failed to fetch products' },
          { status: 500 }
        );
      
      case 'network-error':
        console.log('Simulating network error');
        return HttpResponse.error();
      
      default:
        const products = generateProducts(42);
        return HttpResponse.json(products, { status: 200 });
    }
  })
];

export const errorHandlers = [
  http.get('/api/products', () => {
    console.log('Error handler: Returning 500 error');
    return HttpResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch products' },
      { status: 500 }
    );
  })
];

export const emptyHandlers = [
  http.get('/api/products', () => {
    console.log('Empty handler: Returning empty array');
    return HttpResponse.json([], { status: 200 });
  })
];

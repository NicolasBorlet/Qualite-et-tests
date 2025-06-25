import { faker } from '@faker-js/faker';

export function generateProducts(seed = 1234, count = 10) {
  faker.seed(seed);
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    price: faker.commerce.price(),
  }));
}

const { createCart, addItem, removeItem, applyDiscount, clearCart } = require('./cart');

describe('Cart', () => {
  let cart;

  beforeEach(() => {
    cart = createCart();
  });

  describe('createCart', () => {
    test('should create an empty cart', () => {
      expect(cart).toEqual({
        items: [],
        total: 0
      });
    });
  });

  describe('addItem', () => {
    test('should add a new item to empty cart', () => {
      const item = { id: 1, name: 'Product', price: 10, quantity: 1 };
      addItem(cart, item);
      expect(cart.items).toHaveLength(1);
      expect(cart.total).toBe(10);
    });

    test('should update quantity for existing item', () => {
      const item = { id: 1, name: 'Product', price: 10, quantity: 1 };
      addItem(cart, item);
      addItem(cart, item);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.total).toBe(20);
    });

    test('should handle multiple different items', () => {
      const item1 = { id: 1, name: 'Product 1', price: 10, quantity: 1 };
      const item2 = { id: 2, name: 'Product 2', price: 20, quantity: 2 };
      addItem(cart, item1);
      addItem(cart, item2);
      expect(cart.items).toHaveLength(2);
      expect(cart.total).toBe(50);
    });

    test('should handle item with quantity 0', () => {
      const item = { id: 1, name: 'Product', price: 10, quantity: 0 };
      addItem(cart, item);
      expect(cart.items).toHaveLength(1);
      expect(cart.total).toBe(0);
    });

    test('should handle negative price', () => {
      const item = { id: 1, name: 'Product', price: -10, quantity: 1 };
      addItem(cart, item);
      expect(cart.items).toHaveLength(1);
      expect(cart.total).toBe(-10);
    });
  });

  describe('removeItem', () => {
    test('should remove existing item', () => {
      const item = { id: 1, name: 'Product', price: 10, quantity: 1 };
      addItem(cart, item);
      removeItem(cart, 1);
      expect(cart.items).toHaveLength(0);
      expect(cart.total).toBe(0);
    });

    test('should handle removal of non-existent item', () => {
      const item = { id: 1, name: 'Product', price: 10, quantity: 1 };
      addItem(cart, item);
      removeItem(cart, 999);
      expect(cart.items).toHaveLength(1);
      expect(cart.total).toBe(10);
    });
  });

  describe('applyDiscount', () => {
    test.each([
      ['WELCOME10', 0.1],
      ['SUMMER20', 0.2]
    ])('should apply %s discount correctly', (code, expectedDiscount) => {
      const item = { id: 1, name: 'Product', price: 100, quantity: 1 };
      addItem(cart, item);
      applyDiscount(cart, code);
      expect(cart.total).toBe(100 * (1 - expectedDiscount));
    });

    test('should throw error for invalid discount code', () => {
      const item = { id: 1, name: 'Product', price: 100, quantity: 1 };
      addItem(cart, item);
      expect(() => applyDiscount(cart, 'INVALID')).toThrow('Invalid discount code');
    });
  });

  describe('clearCart', () => {
    test('should clear all items and reset total', () => {
      const item1 = { id: 1, name: 'Product 1', price: 10, quantity: 1 };
      const item2 = { id: 2, name: 'Product 2', price: 20, quantity: 2 };
      addItem(cart, item1);
      addItem(cart, item2);
      clearCart(cart);
      expect(cart.items).toHaveLength(0);
      expect(cart.total).toBe(0);
    });
  });
});

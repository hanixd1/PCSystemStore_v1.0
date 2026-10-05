import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from '../store/useCartStore';

const product = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Producto vigente',
  price: 100,
  qty: 1,
  stock: 3,
};

describe('cart availability boundaries', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isCartOpen: false });
  });

  it('does not add a product without current stock', () => {
    useCartStore.getState().addItem({ ...product, stock: 0 });
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('never lets a quantity exceed current stock', () => {
    useCartStore.getState().addItem({ ...product, qty: 10 });
    expect(useCartStore.getState().items[0]?.qty).toBe(3);

    useCartStore.getState().updateQuantity(product.id, 1);
    expect(useCartStore.getState().items[0]?.qty).toBe(3);
  });

  it('refreshes stored product data when the current catalog is added again', () => {
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem({
      ...product,
      price: 80,
      stock: 2,
      imageUrl: 'https://example.test/current.webp',
    });

    expect(useCartStore.getState().items[0]).toMatchObject({
      price: 80,
      stock: 2,
      qty: 2,
      imageUrl: 'https://example.test/current.webp',
    });
  });
});

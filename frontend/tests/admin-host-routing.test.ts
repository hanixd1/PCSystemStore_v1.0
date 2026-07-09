import { describe, expect, it } from 'vitest';
import { isAdminRoute } from '../lib/adminRouting';

describe('admin host routing', () => {
  it('identifies the admin root and nested admin routes', () => {
    expect(isAdminRoute('/admin')).toBe(true);
    expect(isAdminRoute('/admin/inventario')).toBe(true);
  });

  it('does not classify similarly named public routes as admin routes', () => {
    expect(isAdminRoute('/administrator')).toBe(false);
    expect(isAdminRoute('/tienda')).toBe(false);
    expect(isAdminRoute(null)).toBe(false);
  });
});

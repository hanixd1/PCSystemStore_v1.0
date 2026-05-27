// frontend/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiEdit, FiTrash2, FiPlus, FiAlertCircle, FiSearch } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { confirmAction, notify } from '@/lib/notify';

export default function AdminDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error cargando productos', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar producto',
      message: '¿Estás seguro de eliminar este producto?',
      confirmText: 'Eliminar',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter((p) => p.id !== id));
      notify.success('Producto eliminado');
    } catch (error: unknown) {
      notify.error(getApiErrorMessage(error, 'Error al eliminar'));
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-black text-gray-800">Inventario</h1>
          <p className="text-gray-500">Gestión total de {products.length} productos.</p>
        </div>
        <Link
          href="/admin/add-product"
          className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 font-bold text-white transition hover:bg-gray-800"
        >
          <FiPlus /> Nuevo Producto
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <FiSearch className="text-xl text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          className="w-full font-medium text-gray-700 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    Cargando inventario...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="group transition hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-gray-100">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </div>
                        <div>
                          <p className="line-clamp-1 font-bold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {product.isOnSale && Number(product.salePrice) > 0 ? (
                        <div>
                          <span className="text-red-600">
                            S/. {Number(product.salePrice).toFixed(2)}
                          </span>
                          <span className="ml-2 text-xs text-gray-400 line-through">
                            S/. {Number(product.price).toFixed(2)}
                          </span>
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">
                            Oferta
                          </span>
                        </div>
                      ) : (
                        <>S/. {Number(product.price).toFixed(2)}</>
                      )}
                    </td>
                    <td className="p-4">
                      <div
                        className={`flex items-center gap-2 font-bold ${
                          product.stock < 5 ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        {product.stock < 5 && <FiAlertCircle />}
                        {product.stock} u.
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Link
                          href={`/admin/edit-product/${product.id}`}
                          className="rounded-lg bg-yellow-100 p-2 text-yellow-700 transition hover:bg-yellow-200"
                          title="Editar"
                        >
                          <FiEdit />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200"
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

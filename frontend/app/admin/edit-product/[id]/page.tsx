'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    image: '',
  });

  useEffect(() => {
    if (!id) return;

    api
      .get(`/products/${id}`)
      .then((res) => {
        const product = res.data;
        setFormData({
          name: product.name,
          price: String(product.price),
          stock: String(product.stock),
          image: product.images?.[0] || '',
        });
      })
      .catch((error: unknown) => {
        alert(getApiErrorMessage(error, 'Error cargando producto'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.patch(`/products/${id}`, formData);
      alert('Producto actualizado correctamente');
      router.push('/admin');
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Error al actualizar'));
    }
  };

  if (loading) return <div>Cargando datos del producto...</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/admin" className="mb-2 flex items-center gap-2 text-gray-500 hover:text-black">
          <FiArrowLeft /> Volver al inventario
        </Link>
        <h1 className="text-3xl font-black text-gray-800">Editar Producto</h1>
        <p className="text-gray-500">ID: {id}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-lg"
      >
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">Nombre del Producto</label>
          <input
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Precio (S/.)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-brand-cyan"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Stock</label>
            <input
              name="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-brand-cyan"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">URL Imagen</label>
          <input
            name="image"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-500 outline-none focus:ring-2 focus:ring-brand-cyan"
          />
        </div>

        {formData.image && (
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
            <img src={formData.image} alt="Preview" className="h-full object-contain" />
          </div>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-dark"
        >
          <FiSave /> Guardar Cambios
        </button>
      </form>
    </div>
  );
}

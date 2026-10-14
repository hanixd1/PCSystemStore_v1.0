'use client';

import { FiGrid } from 'react-icons/fi';
import ProductForm from '@/features/products/form/ProductForm';

export default function AddProductPage() {
  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-xl bg-black p-3 text-white">
          <FiGrid size={24} />
        </div>
        <h1 className="text-3xl font-black text-gray-800">Agregar Productos</h1>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}

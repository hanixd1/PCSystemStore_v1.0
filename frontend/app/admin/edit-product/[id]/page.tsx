'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import ProductForm from '@/features/products/form/ProductForm';
import { mapProductToFormData } from '@/features/products/form/productFormState';
import type { ProductFormData } from '@/features/products/form/productFormState';

type LoadedProduct = { formData: ProductFormData; images: string[] };

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<LoadedProduct | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/products/admin/${id}`)
      .then(({ data }) =>
        setProduct({
          formData: mapProductToFormData(data),
          images: Array.isArray(data.images) ? data.images : [],
        }),
      )
      .catch((error: unknown) => {
        setFailed(true);
        notify.error(getApiErrorMessage(error, 'Error cargando producto'));
      });
  }, [id]);

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="mb-8">
        <Link
          prefetch={false}
          href="/admin/inventario"
          className="mb-2 flex items-center gap-2 text-gray-500 hover:text-black"
        >
          <FiArrowLeft /> Volver al inventario
        </Link>
        <h1 className="text-3xl font-black text-gray-800">Editar Producto</h1>
        <p className="text-gray-500">ID: {id}</p>
      </div>
      {product ? (
        <ProductForm
          mode="edit"
          productId={id}
          initialData={product.formData}
          initialImages={product.images}
        />
      ) : (
        <p>{failed ? 'No se pudo cargar el producto.' : 'Cargando datos del producto...'}</p>
      )}
    </div>
  );
}

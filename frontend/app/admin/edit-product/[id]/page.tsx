// frontend/app/admin/edit-product/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation'; // Hooks de Next.js
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function EditProductPage() {
  const { id } = useParams(); // Obtenemos el ID de la URL
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Estado para el formulario (simplificado para precio/stock/nombre)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    image: '',
  });

  // 1. Cargar datos actuales del producto
  useEffect(() => {
    if (id) {
      axios.get(`https://pcsystemstore.onrender.com${id}`)
        .then((res) => {
          const p = res.data;
          setFormData({
            name: p.name,
            price: p.price,
            stock: p.stock,
            image: p.images[0] || '',
          });
          setLoading(false);
        })
        .catch(err => alert("Error cargando producto"));
    }
  }, [id]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await axios.patch(`http://localhost:3000/products/${id}`, formData);
      alert('✅ Producto actualizado correctamente');
      router.push('/admin'); // Volver al inventario
    } catch (error) {
      alert('❌ Error al actualizar');
    }
  };

  if (loading) return <div>Cargando datos del producto...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-black flex items-center gap-2 mb-2">
          <FiArrowLeft /> Volver al inventario
        </Link>
        <h1 className="text-3xl font-black text-gray-800">Editar Producto</h1>
        <p className="text-gray-500">ID: {id}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 space-y-6">
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Producto</label>
          <input 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-cyan outline-none" 
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Precio (S/.)</label>
            <input 
              name="price" 
              type="number" 
              step="0.01"
              value={formData.price} 
              onChange={handleChange} 
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-cyan outline-none font-bold text-lg" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Stock</label>
            <input 
              name="stock" 
              type="number" 
              value={formData.stock} 
              onChange={handleChange} 
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-cyan outline-none font-bold text-lg" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">URL Imagen</label>
          <input 
            name="image" 
            value={formData.image} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-cyan outline-none text-sm text-gray-500" 
          />
        </div>

        {/* Previsualización Imagen */}
        {formData.image && (
          <div className="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center border overflow-hidden">
            <img src={formData.image} alt="Preview" className="h-full object-contain" />
          </div>
        )}

        <button 
          type="submit" 
          className="w-full bg-brand-cyan text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-dark transition shadow-lg flex items-center justify-center gap-2"
        >
          <FiSave /> Guardar Cambios
        </button>

      </form>
    </div>
  );
}
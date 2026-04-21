'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUsers, FiEdit, FiUserPlus, FiShieldOff, FiShield, FiX } from 'react-icons/fi';

export default function EmpleadosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Guardamos quién es el admin actual para no dejar que se bloquee a sí mismo
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'EDITOR' });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    // Obtenemos tu sesión para saber quién eres
    const session = localStorage.getItem('user');
    if (session) {
      setCurrentAdminEmail(JSON.parse(session).email);
    }
  }, []);

  const openEditModal = (user: any) => {
    setIsEditing(true);
    setEditingId(user.id);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', email: '', password: '', role: 'EDITOR' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await axios.patch(`http://localhost:3000/users/${editingId}`, formData);
        alert('Empleado actualizado con éxito');
      } else {
        await axios.post('http://localhost:3000/users', formData);
        alert('Empleado creado con éxito');
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      alert('Hubo un error al procesar la solicitud.');
    }
  };

  // 🛑 LA MAGIA DE BLOQUEAR/DESACTIVAR
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const accion = currentStatus === 'ACTIVE' ? 'bloquear' : 'reactivar';
    if(!confirm(`¿Estás seguro de que deseas ${accion} esta cuenta?`)) return;
    
    try {
      await axios.patch(`http://localhost:3000/users/${id}/toggle-status`);
      fetchUsers(); // Recargamos para ver el cambio de color
    } catch (error) {
      console.error(error);
      alert('Error al intentar cambiar el estado.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black rounded-xl text-white"><FiUsers size={24} /></div>
          <div>
            <h1 className="text-3xl font-black text-gray-800">Gestión de Personal</h1>
            <p className="text-gray-500 font-medium">Administra accesos y permisos</p>
          </div>
        </div>
        <button onClick={openCreateModal} className="bg-brand-cyan text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-cyan-400 transition shadow-lg flex items-center gap-2">
          <FiUserPlus size={20} /> Nuevo Empleado
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="p-10 text-center font-bold">Cargando...</div> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-widest">
                <th className="p-5 font-bold">Nombre / Correo</th>
                <th className="p-5 font-bold">Rol</th>
                <th className="p-5 font-bold">Estado</th>
                <th className="p-5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                // Verificamos si esta fila es tu propio usuario
                const isMe = user.email === currentAdminEmail;

                return (
                  <tr key={user.id} className={`transition ${user.status === 'INACTIVE' ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="p-5">
                      <p className="font-bold text-gray-800">
                        {user.name} {isMe && <span className="text-brand-cyan text-xs ml-2">(Tú)</span>}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </td>
                    <td className="p-5">
                      <span className={`px-2 py-1 rounded text-[10px] font-black ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-5">
                      {/* BOTÓN DE BLOQUEO / ACTIVACIÓN */}
                      <button 
                        onClick={() => handleToggleStatus(user.id, user.status)} 
                        disabled={isMe} // ¡No te puedes bloquear a ti mismo!
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                          isMe ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                        }`}
                        title={isMe ? "No puedes bloquearte a ti mismo" : "Clic para cambiar estado"}
                      >
                        {user.status === 'ACTIVE' ? <FiShield /> : <FiShieldOff />}
                        {user.status === 'ACTIVE' ? 'Activo' : 'Bloqueado'}
                      </button>
                    </td>
                    <td className="p-5 text-right space-x-2">
                      <button onClick={() => openEditModal(user)} className="p-2 text-gray-400 hover:text-brand-cyan bg-gray-50 hover:bg-cyan-50 rounded-lg">
                        <FiEdit size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500">
              <FiX size={24} />
            </button>
            <h2 className="text-2xl font-black mb-6">{isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Nombre</label>
                <input required type="text" className="w-full border-2 p-3 rounded-xl focus:border-brand-cyan outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Correo</label>
                <input required={!isEditing} disabled={isEditing} type="email" className={`w-full border-2 p-3 rounded-xl outline-none ${isEditing ? 'bg-gray-100 text-gray-400' : 'focus:border-brand-cyan'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Contraseña {isEditing && '(Déjalo en blanco para no cambiarla)'}</label>
                <input required={!isEditing} type="text" className="w-full border-2 p-3 rounded-xl focus:border-brand-cyan outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Rol</label>
                <select className="w-full border-2 p-3 rounded-xl focus:border-brand-cyan font-bold bg-white outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-brand-cyan text-gray-900 font-black py-4 rounded-xl mt-6 hover:bg-cyan-400">
                {isEditing ? 'Guardar Cambios' : 'Registrar Empleado'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
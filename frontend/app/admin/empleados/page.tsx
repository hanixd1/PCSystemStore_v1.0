'use client';

import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { FiEdit, FiShield, FiShieldOff, FiUserPlus, FiUsers, FiX } from 'react-icons/fi';
import { confirmAction, notify } from '@/lib/notify';

type InternalRole = 'ADMIN' | 'EDITOR';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type EmployeeFormData = {
  name: string;
  email: string;
  password: string;
  role: InternalRole;
};

const INTERNAL_ROLES: InternalRole[] = ['ADMIN', 'EDITOR'];
const ROLE_LABELS: Record<InternalRole, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
};
const ROLE_OPTIONS: Array<{ value: InternalRole; label: string }> = [
  { value: 'EDITOR', label: 'Editor' },
  { value: 'ADMIN', label: 'Administrador' },
];
const PRIMARY_ADMIN_EMAIL = 'admin@pcsystemstore.com';

const emptyForm: EmployeeFormData = {
  name: '',
  email: '',
  password: '',
  role: 'EDITOR',
};

const isInternalRole = (role: string): role is InternalRole =>
  INTERNAL_ROLES.includes(role as InternalRole);

function isPrimaryAdmin(user: Pick<UserRow, 'email' | 'role'>) {
  return user.role === 'ADMIN' && user.email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

function getStoredAdminEmail() {
  const session = localStorage.getItem('adminUser') || localStorage.getItem('user');
  if (!session) return null;

  try {
    return String((JSON.parse(session) as { email?: string }).email || '') || null;
  } catch {
    return null;
  }
}

export default function EmpleadosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [loadError, setLoadError] = useState('');

  const fetchUsers = async () => {
    setLoadError('');
    try {
      const res = await api.get('/users/internal');
      const payload = Array.isArray(res.data) ? res.data : [];
      setUsers(payload.filter((user: UserRow) => isInternalRole(user.role)));
    } catch {
      setUsers([]);
      setLoadError('No se pudieron cargar los empleados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
    setCurrentAdminEmail(getStoredAdminEmail());
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (user: UserRow) => {
    if (isPrimaryAdmin(user)) {
      notify.error('La cuenta principal del sistema esta protegida.');
      return;
    }

    setIsEditing(true);
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: isInternalRole(user.role) ? user.role : 'EDITOR',
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (isEditing && editingId) {
        await api.patch(`/users/internal/${editingId}`, formData);
        notify.success('Empleado actualizado correctamente');
      } else {
        await api.post('/users/internal', formData);
        notify.success('Empleado creado correctamente');
      }

      setShowModal(false);
      await fetchUsers();
    } catch (error: unknown) {
      notify.error(getApiErrorMessage(error, 'Hubo un error al procesar la solicitud.'));
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    if (isPrimaryAdmin(user)) {
      notify.error('La cuenta principal del sistema no puede bloquearse.');
      return;
    }

    const accion = user.status === 'ACTIVE' ? 'bloquear' : 'reactivar';
    const confirmed = await confirmAction({
      title: 'Cambiar estado de cuenta',
      message: `Estas seguro de que deseas ${accion} esta cuenta?`,
      confirmText: accion === 'bloquear' ? 'Bloquear' : 'Reactivar',
    });
    if (!confirmed) return;

    try {
      await api.patch(`/users/${user.id}/toggle-status`);
      await fetchUsers();
    } catch (error: unknown) {
      notify.error(getApiErrorMessage(error, 'Error al intentar cambiar el estado.'));
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-black p-3 text-white">
            <FiUsers size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800">Gestion de Empleados</h1>
            <p className="font-medium text-gray-500">
              Administra accesos administrativos del panel
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-3 font-bold text-gray-900 shadow-lg transition hover:bg-cyan-400"
        >
          <FiUserPlus size={20} /> Nuevo Empleado
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center font-bold">Cargando...</div>
        ) : loadError ? (
          <div className="p-10 text-center">
            <p className="mb-4 text-lg font-bold text-red-700">{loadError}</p>
            <button
              onClick={() => {
                setLoading(true);
                void fetchUsers();
              }}
              className="rounded-xl bg-brand-cyan px-5 py-3 font-bold text-gray-900 transition hover:bg-cyan-400"
            >
              Reintentar
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <p className="mb-4 text-lg font-bold text-gray-700">
              No hay empleados registrados todavia.
            </p>
            <button
              onClick={openCreateModal}
              className="rounded-xl bg-brand-cyan px-5 py-3 font-bold text-gray-900 transition hover:bg-cyan-400"
            >
              Crear primer empleado
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase tracking-widest text-gray-500">
                <th className="p-5 font-bold">Nombre / Correo</th>
                <th className="p-5 font-bold">Rol</th>
                <th className="p-5 font-bold">Estado</th>
                <th className="p-5 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isMe = user.email === currentAdminEmail;
                const protectedPrimaryAdmin = isPrimaryAdmin(user);
                const roleLabel = isInternalRole(user.role) ? ROLE_LABELS[user.role] : user.role;

                return (
                  <tr
                    key={user.id}
                    className={`transition ${
                      user.status === 'INACTIVE' ? 'bg-red-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-5">
                      <p className="font-bold text-gray-800">
                        {user.name}{' '}
                        {isMe && <span className="ml-2 text-xs text-brand-cyan">(Tu)</span>}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </td>
                    <td className="p-5">
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-black ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {roleLabel}
                      </span>
                    </td>
                    <td className="p-5">
                      {protectedPrimaryAdmin ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                          Protegido
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={isMe}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                            isMe
                              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                              : user.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                          }`}
                          title={isMe ? 'No puedes bloquearte a ti mismo' : 'Clic para cambiar estado'}
                        >
                          {user.status === 'ACTIVE' ? <FiShield /> : <FiShieldOff />}
                          {user.status === 'ACTIVE' ? 'Activo' : 'Bloqueado'}
                        </button>
                      )}
                    </td>
                    <td className="space-x-2 p-5 text-right">
                      {protectedPrimaryAdmin ? (
                        <span className="text-xs font-bold text-gray-400">Sin acciones</span>
                      ) : (
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg bg-gray-50 p-2 text-gray-400 hover:bg-cyan-50 hover:text-brand-cyan"
                        >
                          <FiEdit size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-red-500"
            >
              <FiX size={24} />
            </button>
            <h2 className="mb-6 text-2xl font-black">
              {isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="employee-name"
                  className="block text-xs font-bold uppercase text-gray-500"
                >
                  Nombre
                </label>
                <input
                  id="employee-name"
                  required
                  type="text"
                  className="w-full rounded-xl border-2 p-3 outline-none focus:border-brand-cyan"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="employee-email"
                  className="block text-xs font-bold uppercase text-gray-500"
                >
                  Correo
                </label>
                <input
                  id="employee-email"
                  required={!isEditing}
                  disabled={isEditing}
                  type="email"
                  className={`w-full rounded-xl border-2 p-3 outline-none ${
                    isEditing ? 'bg-gray-100 text-gray-400' : 'focus:border-brand-cyan'
                  }`}
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="employee-password"
                  className="block text-xs font-bold uppercase text-gray-500"
                >
                  Contrasena {isEditing && '(Dejalo en blanco para no cambiarla)'}
                </label>
                <input
                  id="employee-password"
                  required={!isEditing}
                  type="text"
                  className="w-full rounded-xl border-2 p-3 outline-none focus:border-brand-cyan"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="employee-role"
                  className="block text-xs font-bold uppercase text-gray-500"
                >
                  Rol
                </label>
                <select
                  id="employee-role"
                  className="w-full rounded-xl border-2 bg-white p-3 font-bold outline-none focus:border-brand-cyan"
                  value={formData.role}
                  onChange={(event) =>
                    setFormData({ ...formData, role: event.target.value as InternalRole })
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="mt-6 w-full rounded-xl bg-brand-cyan py-4 font-black text-gray-900 hover:bg-cyan-400"
              >
                {isEditing ? 'Guardar Cambios' : 'Registrar Empleado'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

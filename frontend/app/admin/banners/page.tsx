'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FiEdit2, FiEye, FiEyeOff, FiImage, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';

type Branding = {
  storeName: string;
  logoUrl: string | null;
  logoAlt: string | null;
};

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type BannerForm = {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyBannerForm: BannerForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  sortOrder: '0',
  isActive: true,
};

function getFriendlyBrandingError(error: unknown, fallback: string) {
  const message = getApiErrorMessage(error, fallback);
  if (message.toLowerCase().includes('uuid')) {
    return 'No se pudo guardar. Revisa los datos e intenta nuevamente.';
  }

  return message;
}

export default function AdminBannersPage() {
  const [branding, setBranding] = useState<Branding>({
    storeName: 'PCSystemStore',
    logoUrl: '',
    logoAlt: 'PCSystemStore',
  });
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBannerForm);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [bannerFiles, setBannerFiles] = useState<File[]>([]);
  const [bannerExistingImages, setBannerExistingImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    try {
      const [brandingRes, bannersRes] = await Promise.all([
        api.get('/admin/branding'),
        api.get('/admin/banners'),
      ]);
      setBranding({
        storeName: brandingRes.data.storeName || 'PCSystemStore',
        logoUrl: brandingRes.data.logoUrl || '',
        logoAlt: brandingRes.data.logoAlt || 'PCSystemStore',
      });
      setBanners(Array.isArray(bannersRes.data) ? bannersRes.data : []);
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo cargar la configuracion visual.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/admin/uploads/image', formData);
    return String(res.data.url);
  };

  const handleBrandingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSavingBranding(true);

    try {
      const logoUrl = logoFiles[0] ? await uploadImage(logoFiles[0]) : branding.logoUrl;
      const res = await api.patch('/admin/branding', {
        ...branding,
        logoUrl,
      });
      setBranding({
        storeName: res.data.storeName || 'PCSystemStore',
        logoUrl: res.data.logoUrl || '',
        logoAlt: res.data.logoAlt || 'PCSystemStore',
      });
      setLogoFiles([]);
      setMessage('Marca actualizada correctamente.');
    } catch (error) {
      setError(getFriendlyBrandingError(error, 'No se pudo guardar la marca.'));
    } finally {
      setSavingBranding(false);
    }
  };

  const handleBannerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const existingImageUrl = bannerExistingImages[0] || bannerForm.imageUrl;
    if (!bannerFiles[0] && !existingImageUrl) {
      setError('Debes subir una imagen de banner.');
      return;
    }

    setSavingBanner(true);

    try {
      const imageUrl = bannerFiles[0] ? await uploadImage(bannerFiles[0]) : existingImageUrl;
      const payload = {
        title: bannerForm.title || 'Banner home',
        subtitle: bannerForm.subtitle,
        imageUrl,
        linkUrl: bannerForm.linkUrl,
        sortOrder: Number(bannerForm.sortOrder) || 0,
        isActive: bannerForm.isActive,
      };

      if (editingId) {
        const res = await api.patch(`/admin/banners/${editingId}`, payload);
        setBanners((current) =>
          current
            .map((banner) => (banner.id === editingId ? res.data : banner))
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );
        setMessage('Banner actualizado correctamente.');
      } else {
        const res = await api.post('/admin/banners', payload);
        setBanners((current) => [res.data, ...current].sort((a, b) => a.sortOrder - b.sortOrder));
        setMessage('Banner creado correctamente.');
      }

      setBannerForm(emptyBannerForm);
      setBannerFiles([]);
      setBannerExistingImages([]);
      setEditingId(null);
    } catch (error) {
      setError(getFriendlyBrandingError(error, 'No se pudo guardar el banner.'));
    } finally {
      setSavingBanner(false);
    }
  };

  const startEditing = (banner: Banner) => {
    setEditingId(banner.id);
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      sortOrder: String(banner.sortOrder ?? 0),
      isActive: banner.isActive,
    });
    setBannerFiles([]);
    setBannerExistingImages(banner.imageUrl ? [banner.imageUrl] : []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setBannerForm(emptyBannerForm);
    setBannerFiles([]);
    setBannerExistingImages([]);
  };

  const toggleBanner = async (id: string) => {
    setMessage('');
    setError('');
    if (!id) {
      setError('No se pudo cambiar el estado del banner porque falta su identificador.');
      return;
    }

    try {
      const res = await api.patch(`/admin/banners/${id}/toggle`);
      setBanners((current) => current.map((banner) => (banner.id === id ? res.data : banner)));
    } catch (error) {
      setError(getFriendlyBrandingError(error, 'No se pudo cambiar el estado del banner.'));
    }
  };

  const deleteBanner = async (id: string) => {
    setMessage('');
    setError('');
    if (!id) {
      setError('No se pudo eliminar el banner porque falta su identificador.');
      return;
    }

    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners((current) => current.filter((banner) => banner.id !== id));
      if (editingId === id) {
        cancelEditing();
      }
    } catch (error) {
      setError(getFriendlyBrandingError(error, 'No se pudo eliminar el banner.'));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-brand-cyan">
          Gestion avanzada
        </p>
        <h1 className="mt-2 text-3xl font-black text-gray-900">Banners y marca</h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Gestiona el logo visible en la tienda y los banners principales del home.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
      ) : null}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <FiImage className="text-2xl text-brand-cyan" />
          <h2 className="text-xl font-black text-gray-900">Marca de la tienda</h2>
        </div>

        <form onSubmit={handleBrandingSubmit} className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Nombre de tienda"
              value={branding.storeName}
              onChange={(value) => setBranding((current) => ({ ...current, storeName: value }))}
            />
            <Field
              label="Texto alternativo del logo"
              value={branding.logoAlt || ''}
              onChange={(value) => setBranding((current) => ({ ...current, logoAlt: value }))}
            />
            <div className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase text-gray-900">
                Subir logo de tienda
              </span>
              <ImageUploader
                mode="logo"
                files={logoFiles}
                onFilesChange={setLogoFiles}
                existingImages={
                  branding.logoUrl && logoFiles.length === 0 ? [branding.logoUrl] : []
                }
                maxFiles={1}
                helperText="Recomendacion: sube un logo en formato PNG o WEBP, idealmente con fondo transparente. Tamano sugerido: 400 x 200 px."
              />
            </div>

            <button
              disabled={savingBranding}
              className="inline-flex w-max items-center gap-2 rounded-xl bg-brand-cyan px-6 py-3 text-sm font-black text-gray-900 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              <FiSave />
              {savingBranding ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <p className="mb-3 text-xs font-black uppercase text-gray-500">Vista previa</p>
            <div className="flex h-20 items-center justify-center rounded bg-white px-4 shadow-sm">
              {logoFiles[0] ? (
                <span className="text-xs font-bold text-gray-500">
                  Preview disponible en el selector
                </span>
              ) : branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.logoAlt || branding.storeName}
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <span className="text-sm font-black text-gray-500">
                  {branding.storeName || 'PCSystemStore'}
                </span>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className="grid gap-8 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleBannerSubmit}
          className="h-max rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-gray-900">
              {editingId ? 'Editar banner' : 'Crear banner'}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <FiX />
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <Field
              label="Titulo"
              required
              value={bannerForm.title}
              onChange={(value) => setBannerForm((current) => ({ ...current, title: value }))}
            />
            <Field
              label="Subtitulo"
              value={bannerForm.subtitle}
              onChange={(value) => setBannerForm((current) => ({ ...current, subtitle: value }))}
            />
            <div>
              <span className="mb-2 block text-xs font-black uppercase text-gray-900">
                Subir imagen de banner
              </span>
              <ImageUploader
                mode="banner"
                files={bannerFiles}
                onFilesChange={setBannerFiles}
                existingImages={bannerFiles.length === 0 ? bannerExistingImages : []}
                onExistingImagesChange={setBannerExistingImages}
                maxFiles={1}
                helperText="Recomendacion: sube una imagen horizontal de 1920 x 500 px para el banner principal. El sistema la adaptara automaticamente en dispositivos moviles. Evita colocar texto importante muy cerca de los bordes."
              />
            </div>
            <Field
              label="Link destino"
              value={bannerForm.linkUrl}
              placeholder="/categoria/graficas o https://..."
              onChange={(value) => setBannerForm((current) => ({ ...current, linkUrl: value }))}
            />

            <div className="grid gap-4">
              <Field
                label="Orden"
                type="number"
                min="0"
                value={bannerForm.sortOrder}
                onChange={(value) => setBannerForm((current) => ({ ...current, sortOrder: value }))}
              />
            </div>

            <label
              htmlFor="banner-is-active"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700"
            >
              <input
                id="banner-is-active"
                type="checkbox"
                checked={bannerForm.isActive}
                onChange={(event) =>
                  setBannerForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 accent-brand-cyan"
              />
              <span>Banner activo</span>
            </label>

            <button
              disabled={savingBanner}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-black text-white transition hover:bg-brand-cyan hover:text-gray-900 disabled:opacity-60"
            >
              <FiPlus />
              {savingBanner ? 'Guardando...' : editingId ? 'Guardar banner' : 'Crear banner'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-gray-900">Banners del home</h2>

          {banners.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Aun no hay banners registrados.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {banners.map((banner) => (
                <article
                  key={banner.id}
                  className="grid gap-4 rounded-2xl border border-gray-100 p-4 shadow-sm lg:grid-cols-[180px_1fr_auto]"
                >
                  <div className="h-28 overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900">{banner.title}</h3>
                      <span
                        className={
                          banner.isActive
                            ? 'rounded-full bg-green-50 px-2 py-1 text-xs font-black text-green-700'
                            : 'rounded-full bg-gray-100 px-2 py-1 text-xs font-black text-gray-500'
                        }
                      >
                        {banner.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {banner.subtitle ? (
                      <p className="mt-1 text-sm font-medium text-gray-500">{banner.subtitle}</p>
                    ) : null}
                    <p className="mt-2 text-xs font-bold text-gray-400">
                      Orden: {banner.sortOrder}
                    </p>
                    {banner.linkUrl ? (
                      <p className="mt-1 text-xs font-bold text-brand-cyan">
                        Link: {banner.linkUrl}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 lg:flex-col">
                    <ActionButton
                      label="Editar"
                      onClick={() => startEditing(banner)}
                      icon={<FiEdit2 />}
                    />
                    <ActionButton
                      label={banner.isActive ? 'Desactivar' : 'Activar'}
                      onClick={() => void toggleBanner(banner.id)}
                      icon={banner.isActive ? <FiEyeOff /> : <FiEye />}
                    />
                    <ActionButton
                      danger
                      label="Eliminar"
                      onClick={() => void deleteBanner(banner.id)}
                      icon={<FiTrash2 />}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  placeholder = '',
  type = 'text',
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-gray-900">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none transition focus:border-brand-cyan"
      />
    </label>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition',
        danger
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-cyan-50 text-brand-cyan hover:bg-cyan-100',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

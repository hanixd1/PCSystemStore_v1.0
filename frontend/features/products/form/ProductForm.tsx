'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle, FiClock, FiGrid, FiRotateCcw, FiSave, FiZap } from 'react-icons/fi';
import ImageUploader from '@/components/ImageUploader';
import ProductOfferSection from '@/components/admin/product/ProductOfferSection';
import { api, getApiErrorMessage, isAuthenticationError } from '@/lib/api';
import { buildProductPayload } from '@/lib/products/buildProductPayload';
import { validateProductForm } from '@/lib/products/validateProductForm';
import { notify } from '@/lib/notify';
import { CPU_SOCKETS_BY_BRAND, DEPARTMENTS } from './productFormConfig';
import {
  NON_NEGATIVE_FIELDS,
  NO_NEGATIVE_TEXT_FIELDS,
  applyFieldChange,
  changeCategory,
  createInitialFormData,
  toggleArrayValue,
} from './productFormState';
import type { ProductArrayField, ProductFormData, ProductFormField } from './productFormState';
import {
  INPUT_CLASS,
  LABEL_CLASS,
  NumberField,
  ProductFormProvider,
  TextField,
  fieldId,
} from './ProductFormFields';
import ProductSpecsFields from './ProductSpecsFields';
import { useAdminSessionWarning, useProductDraft } from './useProductFormSafety';

const MAX_IMAGES = 5;

type ProductFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; productId: string; initialData: ProductFormData; initialImages: string[] };

function departmentOf(category: string) {
  return (
    Object.keys(DEPARTMENTS).find((dept) =>
      DEPARTMENTS[dept].some((item) => item.value === category),
    ) ?? ''
  );
}

function categoryLabel(category: string) {
  for (const items of Object.values(DEPARTMENTS)) {
    const match = items.find((item) => item.value === category);
    if (match) return match.label;
  }
  return category;
}

function toMultipart(formData: ProductFormData, images: File[]) {
  const body = new FormData();
  for (const [key, value] of Object.entries(buildProductPayload(formData, { mode: 'create' }))) {
    if (value === undefined || value === null) continue;
    body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  }
  images.forEach((file) => body.append('images', file));
  return body;
}

async function uploadProductImage(file: File) {
  const body = new FormData();
  body.append('image', file);
  const res = await api.post('/admin/uploads/image?type=products', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return String(res.data.url);
}

export default function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const baseline = useMemo(
    () => (props.mode === 'edit' ? props.initialData : createInitialFormData()),
    // The baseline is the data the page loaded; later prop identity changes are irrelevant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [formData, setFormData] = useState<ProductFormData>(baseline);
  const [selectedDept, setSelectedDept] = useState(() => departmentOf(baseline.category));
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    props.mode === 'edit' ? props.initialImages : [],
  );
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(baseline),
    [formData, baseline],
  );
  const draftKey = props.mode === 'edit' ? `edit:${props.productId}` : 'create';
  const { pendingDraft, dismissPendingDraft, clearDraft, lastSavedAt } = useProductDraft(
    draftKey,
    formData,
    isDirty,
  );
  const session = useAdminSessionWarning();

  const setField = (name: ProductFormField, value: string) =>
    setFormData((prev) => applyFieldChange(prev, name, value));
  const toggleValue = (field: ProductArrayField, value: string) =>
    setFormData((prev) => toggleArrayValue(prev, field, value));

  const selectDepartment = (dept: string) => {
    setSelectedDept(dept);
    setFormData((prev) => changeCategory(prev, DEPARTMENTS[dept][0].value));
  };

  const restoreDraft = () => {
    if (!pendingDraft) return;
    // Only restore into the same product category when editing.
    const data = isEdit ? { ...pendingDraft.data, category: baseline.category } : pendingDraft.data;
    setFormData({ ...createInitialFormData(data.category), ...data });
    setSelectedDept(departmentOf(data.category));
    dismissPendingDraft();
    notify.success('Borrador restaurado. Vuelve a adjuntar las imagenes nuevas.');
  };

  const discardDraft = () => {
    clearDraft();
  };

  const validate = () => {
    if (!formData.category) return 'Selecciona la categoria del producto.';
    const imageCount = existingImages.length + imageFiles.length;
    if (imageCount > MAX_IMAGES)
      return `El producto puede tener como máximo ${MAX_IMAGES} imágenes.`;
    return validateProductForm(formData, {
      mode: props.mode,
      imageCount,
      requireImages: !isEdit,
      nonNegativeFields: NON_NEGATIVE_FIELDS,
      noNegativeTextFields: NO_NEGATIVE_TEXT_FIELDS,
      buildPayload: buildProductPayload,
      cpuSocketsByBrand: CPU_SOCKETS_BY_BRAND,
    });
  };

  const resetAfterCreate = () => {
    setFormData(createInitialFormData());
    setSelectedDept('');
    setImageFiles([]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      notify.error(validationError);
      return;
    }

    setSaving(true);
    try {
      if (props.mode === 'edit') {
        const uploaded = await Promise.all(imageFiles.map(uploadProductImage));
        await api.patch(`/products/${props.productId}`, {
          ...buildProductPayload(formData, { clearSalePriceWhenOff: true }),
          images: [...existingImages, ...uploaded],
        });
        clearDraft();
        notify.success('Producto actualizado correctamente');
        router.push('/admin/inventario');
      } else {
        await api.post('/products', toMultipart(formData, imageFiles), {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        clearDraft();
        resetAfterCreate();
        notify.success('Producto creado correctamente.');
      }
    } catch (error: unknown) {
      if (isAuthenticationError(error)) {
        session.markExpired();
        notify.error(
          'Tu sesión expiró. Tus datos están guardados: inicia sesión en otra pestaña y vuelve a intentar.',
        );
        return;
      }
      notify.error(
        getApiErrorMessage(
          error,
          isEdit
            ? 'Error al actualizar'
            : 'Error al guardar. Revisa la configuracion del backend o Cloudinary.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductFormProvider value={{ values: formData, setField, toggleValue }}>
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {pendingDraft && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <span className="flex items-center gap-2 font-semibold">
                <FiRotateCcw /> Tienes un borrador sin publicar del{' '}
                {new Date(pendingDraft.savedAt).toLocaleString('es-PE')}.
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="rounded-lg bg-amber-500 px-3 py-2 font-bold text-white hover:bg-amber-600"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="rounded-lg border border-amber-300 px-3 py-2 font-bold hover:bg-amber-100"
                >
                  Descartar
                </button>
              </span>
            </div>
          )}

          {(session.expired || session.minutesLeft !== null) && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <p>
                {session.expired
                  ? 'Tu sesión expiró. Lo que escribiste está guardado como borrador. '
                  : `Tu sesión expira en ${session.minutesLeft} min. Publica pronto o renueva la sesión. `}
                <a
                  href="/admin/login"
                  target="_blank"
                  rel="noopener"
                  className="font-bold underline"
                >
                  Iniciar sesión en otra pestaña
                </a>{' '}
                para no perder las imágenes seleccionadas.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-8">
            <h2 className="mb-6 border-b pb-2 text-xl font-bold text-gray-800">
              Informacion Basica
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <TextField
                name="name"
                label="Nombre del Producto"
                placeholder="Ej: Laptop Gamer ASUS TUF F15"
                required
                wide
              />
              <TextField
                name="sku"
                label="SKU del producto"
                placeholder="Ej: PCS-CPU-AMD-R5-9600X"
                maxLength={80}
                required
                wide
                helper={
                  isEdit
                    ? 'Modificar el SKU puede afectar la sincronización con sistemas externos como Odoo.'
                    : 'Usa un código único para identificar el producto en inventario y futuras integraciones con Odoo.'
                }
                helperTone={isEdit ? 'danger' : 'muted'}
              />
              <NumberField
                name="price"
                label="Precio (S/.)"
                step="0.01"
                placeholder="0.00"
                required
              />
              <NumberField
                name="stock"
                label="Stock Disponible"
                step="1"
                placeholder="0"
                required
              />
              {isEdit && (
                <ProductOfferSection
                  isOnSale={formData.isOnSale}
                  price={formData.price}
                  salePrice={formData.salePrice}
                  onToggle={(checked) => setField('isOnSale', String(checked))}
                  onSalePriceChange={(value) => setField('salePrice', value)}
                  inputClassName={INPUT_CLASS}
                  labelClassName={LABEL_CLASS}
                />
              )}
              <div className="col-span-2">
                <label htmlFor={fieldId('description')} className={LABEL_CLASS}>
                  Descripcion del Producto
                </label>
                <textarea
                  id={fieldId('description')}
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={(event) => setField('description', event.target.value)}
                  className={`${INPUT_CLASS} resize-none`}
                  placeholder="Describe las caracteristicas principales del producto..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.description.length}/200 caracteres. Entre 10 y 200 caracteres.
                </p>
              </div>
              <div className="col-span-2">
                <span className={LABEL_CLASS}>Imagenes del Producto (Maximo {MAX_IMAGES})</span>
                <ImageUploader
                  mode="product"
                  files={imageFiles}
                  onFilesChange={setImageFiles}
                  existingImages={isEdit ? existingImages : undefined}
                  onExistingImagesChange={isEdit ? setExistingImages : undefined}
                  maxFiles={MAX_IMAGES}
                  helperText="Sube entre 1 y 5 imagenes. La primera sera la portada. Recomendacion: imagenes cuadradas de 550 x 550 px, fondo limpio, formato JPG, PNG o WEBP."
                />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70 p-8">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <FiZap size={100} />
            </div>
            <h2 className="relative z-10 mb-6 flex items-center gap-2 text-xl font-bold text-brand-cyan">
              <FiGrid /> Especificaciones: {categoryLabel(formData.category) || '—'}
            </h2>
            <div className="relative z-10 grid grid-cols-2 gap-6">
              <ProductSpecsFields />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="sticky top-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-6">
            <h3 className="mb-6 text-lg font-black text-gray-800">Clasificacion</h3>

            {isEdit ? (
              <p className="mb-8 rounded-xl border border-gray-200 bg-white p-4 text-sm">
                <span className={LABEL_CLASS}>Tipo de producto</span>
                <strong className="text-lg text-gray-900">
                  {categoryLabel(formData.category)}
                </strong>
              </p>
            ) : (
              <>
                <div className="mb-6">
                  <span className={LABEL_CLASS}>1. Categoria</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(DEPARTMENTS).map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => selectDepartment(dept)}
                        className={`rounded-lg border p-3 text-xs font-bold transition-all ${
                          selectedDept === dept
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 bg-transparent text-gray-500 hover:border-brand-cyan hover:text-gray-900'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-8">
                  <label htmlFor={fieldId('category')} className={LABEL_CLASS}>
                    2. Tipo de Producto
                  </label>
                  <select
                    id={fieldId('category')}
                    name="category"
                    value={formData.category}
                    onChange={(event) => setField('category', event.target.value)}
                    disabled={!selectedDept}
                    className="w-full cursor-pointer rounded-xl border-2 border-gray-300 bg-gray-50 p-4 text-lg font-bold text-gray-900 outline-none transition focus:border-black focus:bg-white disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {!selectedDept && <option value="">Selecciona una categoria</option>}
                    {(DEPARTMENTS[selectedDept] ?? []).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-4 text-lg font-black text-gray-900 shadow-xl shadow-brand-cyan/30 transition hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-50"
            >
              <FiSave size={24} />
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Publicar Producto'}
            </button>
            {lastSavedAt && (
              <p className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-500">
                <FiClock /> Borrador guardado{' '}
                {new Date(lastSavedAt).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>

          {!isEdit && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <strong>Tip:</strong> Asegurate de elegir la categoria correcta para que el producto
              aparezca en los filtros de busqueda de la tienda.
            </div>
          )}
        </div>
      </form>
    </ProductFormProvider>
  );
}

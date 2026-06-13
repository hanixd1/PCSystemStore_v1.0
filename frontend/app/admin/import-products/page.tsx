'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiGrid,
  FiLock,
  FiUploadCloud,
} from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';

type CategoryGroup = 'COMPONENTES' | 'ORDENADORES' | 'PERIFERICOS' | 'AUDIO';
type AdminAccessState = 'checking' | 'allowed' | 'denied';

type ImportIssue = {
  row: number;
  field: string;
  message: string;
};

type PreviewRow = {
  row: number;
  status: 'valid' | 'invalid';
  action: 'create' | 'update';
  name: string;
  numeroParte: string;
  imageCount: number;
};

type PreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newProducts: number;
  productsToUpdate: number;
  imagesFound: number;
  imagesMissing: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  rows: PreviewRow[];
};

type ConfirmResult = {
  created: number;
  updated: number;
  failed: number;
  uploadedImages: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
};

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const PRODUCT_TYPES: Record<CategoryGroup, string[]> = {
  COMPONENTES: [
    'Procesador (CPU)',
    'Placa Madre',
    'Memoria RAM',
    'Tarjeta de Video',
    'Fuente de Poder',
    'Gabinete / Case',
    'Refrigeracion',
    'Almacenamiento',
  ],
  ORDENADORES: [
    'Laptop / Portatil',
    'PC de Escritorio',
    'Software / Licencia',
    'Base refrigeradora',
    'Mochila',
  ],
  PERIFERICOS: [
    'Monitor',
    'Teclado',
    'Mouse',
    'Mousepad',
    'Silla Gamer',
    'Mesa Gamer',
    'Webcam',
    'Capturadora',
    'Cables y Hub',
  ],
  AUDIO: ['Audífono / Headset', 'Micrófono', 'Parlantes'],
};

function buildFormData(
  category: CategoryGroup,
  productType: string,
  excelFile: File | null,
  zipFile: File | null,
) {
  if (!excelFile || !zipFile) {
    throw new Error('Selecciona el Excel y el ZIP de imagenes.');
  }

  const formData = new FormData();
  formData.append('category', category);
  formData.append('productType', productType);
  formData.append('excel', excelFile);
  formData.append('imagesZip', zipFile);
  return formData;
}

function readAdminRole() {
  try {
    const stored = localStorage.getItem('adminUser') || localStorage.getItem('user');
    if (!stored) return '';
    return String((JSON.parse(stored) as { role?: string }).role || '');
  } catch {
    return '';
  }
}

function hasExtension(file: File | null, extension: string) {
  if (!file) return false;
  return file.name.toLowerCase().endsWith(extension);
}

function getTemplateFileName(productType: string) {
  const fallback = productType
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `plantilla-${fallback || 'producto'}.xlsx`;
}

function getFileNameFromDisposition(disposition: unknown) {
  if (typeof disposition !== 'string') return null;
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || null;
}

function getArrayBufferErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  if (!(responseData instanceof ArrayBuffer)) {
    return null;
  }

  try {
    const text = new TextDecoder().decode(responseData);
    if (!text.trim()) return null;
    const parsed = JSON.parse(text) as { message?: unknown };
    if (typeof parsed.message === 'string') return parsed.message;
    if (Array.isArray(parsed.message)) return parsed.message.join('\n');
  } catch {
    return null;
  }

  return null;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-950">{value}</p>
    </div>
  );
}

function IssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: ImportIssue[];
  tone: 'error' | 'warning';
}) {
  if (issues.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-5">
      <div className="flex items-center gap-3">
        <div
          className={[
            'rounded-xl p-2 text-white',
            tone === 'error' ? 'bg-red-500' : 'bg-amber-500',
          ].join(' ')}
        >
          <FiAlertTriangle />
        </div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">{title}</h2>
      </div>
      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm text-gray-700">
        {issues.map((issue, index) => (
          <p key={`${issue.row}-${issue.field}-${index}`}>
            <span className="font-bold text-gray-950">Fila {issue.row}</span> - {issue.field}:{' '}
            {issue.message}
          </p>
        ))}
      </div>
    </section>
  );
}

function FilePickerCard({
  id,
  title,
  description,
  buttonLabel,
  accept,
  file,
  expectedExtension,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  accept: string;
  file: File | null;
  expectedExtension: string;
  onChange: (file: File | null) => void;
}) {
  const hasFile = Boolean(file);
  const isValid = hasExtension(file, expectedExtension);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-4">
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />

      <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,0.85fr)] md:items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white">
          <FiFileText size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-gray-900">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
        </div>
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-cyan px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-cyan-400"
        >
          <FiUploadCloud />
          {buttonLabel}
        </label>
        <div className="min-w-0 text-sm md:text-right">
          <p className="truncate font-bold text-gray-800">
            {file?.name || 'Ningun archivo seleccionado'}
          </p>
          <p
            className={[
              'mt-1 text-xs font-semibold',
              !hasFile ? 'text-gray-400' : isValid ? 'text-emerald-600' : 'text-red-600',
            ].join(' ')}
          >
            {!hasFile
              ? 'Archivo requerido.'
              : isValid
                ? 'Extension valida.'
                : `Debe terminar en ${expectedExtension}.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ImportProductsPage() {
  const [access, setAccess] = useState<AdminAccessState>('checking');
  const [category, setCategory] = useState<CategoryGroup>('COMPONENTES');
  const [productType, setProductType] = useState(PRODUCT_TYPES.COMPONENTES[0]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  useEffect(() => {
    setAccess(readAdminRole() === 'ADMIN' ? 'allowed' : 'denied');
  }, []);

  const productTypeOptions = useMemo(() => PRODUCT_TYPES[category], [category]);
  const hasValidExcel = hasExtension(excelFile, '.xlsx');
  const hasValidZip = hasExtension(zipFile, '.zip');
  const canDownloadTemplate = Boolean(category && productType && !isDownloadingTemplate);
  const canPreview = Boolean(productType && hasValidExcel && hasValidZip && !isPreviewing);
  const canConfirm = Boolean(
    preview && preview.errors.length === 0 && preview.validRows > 0 && !isConfirming,
  );

  const handleCategoryChange = (nextCategory: CategoryGroup) => {
    setCategory(nextCategory);
    setProductType(PRODUCT_TYPES[nextCategory][0]);
    setPreview(null);
    setConfirmResult(null);
  };

  const handlePreview = async (event: FormEvent) => {
    event.preventDefault();
    if (!canPreview) return;
    setError('');
    setConfirmResult(null);
    setIsPreviewing(true);

    try {
      const formData = buildFormData(category, productType, excelFile, zipFile);
      const response = await api.post<PreviewResult>('/products/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setPreview(response.data);
    } catch (err) {
      setPreview(null);
      setError(getApiErrorMessage(err, 'No se pudo validar la importacion.'));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!canDownloadTemplate) return;
    setError('');
    setIsDownloadingTemplate(true);

    try {
      const response = await api.get('/products/import/template', {
        params: { category, productType },
        responseType: 'arraybuffer',
        transformResponse: [(data) => data],
        headers: {
          Accept: XLSX_MIME,
        },
      });
      const fileName =
        getFileNameFromDisposition(response.headers['content-disposition']) ||
        getTemplateFileName(productType);
      const bytes = new Uint8Array(response.data);
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new Error('La respuesta no es un XLSX valido');
      }

      const blob = new Blob([bytes], { type: XLSX_MIME });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(
        getArrayBufferErrorMessage(err) ||
          getApiErrorMessage(err, 'No se pudo descargar la plantilla.'),
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setError('');
    setConfirmResult(null);
    setIsConfirming(true);

    try {
      const formData = buildFormData(category, productType, excelFile, zipFile);
      const response = await api.post<ConfirmResult>('/products/import/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      setConfirmResult(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo confirmar la importacion.'));
    } finally {
      setIsConfirming(false);
    }
  };

  if (access === 'checking') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
        <section className="rounded-2xl border border-gray-200 bg-gray-50/80 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-950 text-white">
            <FiLock size={24} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-gray-950">Acceso denegado</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            La importacion masiva de productos esta disponible solo para administradores.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-xl bg-black p-3 text-white">
          <FiUploadCloud size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-800">Importar productos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Carga masiva desde Excel + ZIP de imagenes. Solo administradores.
          </p>
        </div>
      </div>

      <form
        onSubmit={handlePreview}
        className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 md:p-7"
      >
        <section>
          <h2 className="text-xl font-black text-gray-900">Clasificacion</h2>

          <div className="mt-6">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
              Categoria
            </span>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(Object.keys(PRODUCT_TYPES) as CategoryGroup[]).map((item) => {
                const active = category === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleCategoryChange(item)}
                    className={[
                      'h-12 rounded-xl border px-4 text-center text-sm font-black uppercase tracking-wide transition',
                      active
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-transparent text-gray-600 hover:border-brand-cyan hover:text-gray-950',
                    ].join(' ')}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 max-w-xl">
            <label
              htmlFor="productType"
              className="text-xs font-black uppercase tracking-[0.18em] text-gray-500"
            >
              Tipo de producto
            </label>
            <select
              id="productType"
              value={productType}
              onChange={(event) => {
                setProductType(event.target.value);
                setPreview(null);
                setConfirmResult(null);
              }}
              className="mt-3 h-14 w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 text-lg font-black text-gray-900 outline-none transition focus:border-black focus:bg-white"
            >
              {productTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs font-medium leading-5 text-gray-500">
              Esta seleccion define la categoria real del producto. Las columnas category o
              tipoProducto del Excel se ignoran.
            </p>
          </div>
        </section>

        <section className="mt-8 border-t border-gray-200 pt-7">
          <h2 className="text-xl font-black text-gray-900">Archivos de importacion</h2>
          <div className="mt-5 grid gap-4">
            <FilePickerCard
              id="excelFile"
              title="Archivo Excel (.xlsx)"
              description="Debe incluir columnas generales y specs segun el tipo seleccionado."
              buttonLabel="Seleccionar Excel"
              accept=".xlsx"
              file={excelFile}
              expectedExtension=".xlsx"
              onChange={(file) => {
                setExcelFile(file);
                setPreview(null);
                setConfirmResult(null);
              }}
            />

            <FilePickerCard
              id="zipFile"
              title="ZIP de imagenes (.zip)"
              description="Incluye la imagen principal y la galeria declarada en el Excel."
              buttonLabel="Seleccionar ZIP"
              accept=".zip"
              file={zipFile}
              expectedExtension=".zip"
              onChange={(file) => {
                setZipFile(file);
                setPreview(null);
                setConfirmResult(null);
              }}
            />
          </div>

          <div className="mt-7 flex flex-col gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              disabled={!canDownloadTemplate}
              onClick={handleDownloadTemplate}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-transparent px-8 py-4 text-sm font-black uppercase tracking-wide text-gray-800 transition hover:border-brand-cyan hover:text-gray-950 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 md:min-w-64"
            >
              <FiDownload size={20} />
              {isDownloadingTemplate ? 'Descargando...' : 'Descargar plantilla'}
            </button>
            <button
              type="submit"
              disabled={!canPreview}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-brand-cyan px-8 py-4 text-sm font-black uppercase tracking-wide text-gray-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 md:min-w-72"
            >
              <FiFileText size={20} />
              {isPreviewing ? 'Validando...' : 'Validar importacion'}
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-black px-8 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 md:min-w-72"
            >
              <FiUploadCloud size={20} />
              {isConfirming ? 'Importando...' : 'Confirmar importacion'}
            </button>
          </div>
        </section>
      </form>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Filas" value={preview.totalRows} />
            <StatCard label="Validas" value={preview.validRows} />
            <StatCard label="Crear" value={preview.newProducts} />
            <StatCard label="Actualizar" value={preview.productsToUpdate} />
            <StatCard label="Imagenes ZIP" value={preview.imagesFound} />
            <StatCard label="Imagenes faltantes" value={preview.imagesMissing} />
            <StatCard label="Errores" value={preview.errors.length} />
            <StatCard label="Warnings" value={preview.warnings.length} />
          </div>

          <IssueList title="Errores criticos" issues={preview.errors} tone="error" />
          <IssueList title="Advertencias" issues={preview.warnings} tone="warning" />

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/80">
            <div className="border-b border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-gray-900">
                <FiGrid /> Vista previa por fila
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Fila</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Accion</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">SKU del Producto</th>
                    <th className="px-4 py-3">Imagenes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.rows.map((row) => (
                    <tr key={row.row}>
                      <td className="px-4 py-3 font-bold">{row.row}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'inline-flex items-center gap-1 text-xs font-black uppercase',
                            row.status === 'valid' ? 'text-emerald-600' : 'text-red-600',
                          ].join(' ')}
                        >
                          {row.status === 'valid' ? <FiCheckCircle /> : <FiAlertTriangle />}
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.action === 'create' ? 'Crear' : 'Actualizar'}
                      </td>
                      <td className="max-w-md px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                      <td className="px-4 py-3">{row.numeroParte}</td>
                      <td className="px-4 py-3">{row.imageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {confirmResult ? (
        <section className="mt-8 rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
          <h2 className="text-lg font-black text-gray-950">Resultado de importacion</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Creados" value={confirmResult.created} />
            <StatCard label="Actualizados" value={confirmResult.updated} />
            <StatCard label="Fallidos" value={confirmResult.failed} />
            <StatCard label="Imagenes subidas" value={confirmResult.uploadedImages} />
          </div>
          <IssueList title="Errores finales" issues={confirmResult.errors} tone="error" />
        </section>
      ) : null}
    </div>
  );
}

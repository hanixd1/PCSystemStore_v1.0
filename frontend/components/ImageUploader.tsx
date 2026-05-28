'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { FiImage, FiTrash2, FiUploadCloud } from 'react-icons/fi';

type UploaderMode = 'logo' | 'banner' | 'product';

type ImageUploaderProps = {
  mode: UploaderMode;
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingImages?: string[];
  onExistingImagesChange?: (images: string[]) => void;
  maxFiles: number;
  helperText: string;
};

const MODE_CONFIG: Record<
  UploaderMode,
  {
    width: number;
    height: number;
    ratio: number;
    maxSizeMb: number;
    hardRatioRange?: [number, number];
  }
> = {
  logo: { width: 400, height: 200, ratio: 2, maxSizeMb: 2 },
  banner: { width: 1800, height: 600, ratio: 3, maxSizeMb: 10, hardRatioRange: [2.7, 3.3] },
  product: { width: 550, height: 550, ratio: 1, maxSizeMb: 5 },
};

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Preview = {
  id: string;
  src: string;
  name: string;
  warnings: string[];
};

async function inspectImage(file: File) {
  const src = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = src;
    });

    return { src, ...dimensions };
  } catch {
    URL.revokeObjectURL(src);
    throw new Error('No se pudo leer la imagen seleccionada.');
  }
}

function buildWarnings(mode: UploaderMode, width: number, height: number) {
  const config = MODE_CONFIG[mode];
  const warnings: string[] = [];
  const ratio = width / height;

  if (mode === 'banner') {
    if (ratio < config.hardRatioRange![0] || ratio > config.hardRatioRange![1]) {
      return {
        blockingError: 'La proporcion del banner no es adecuada para el carrusel principal.',
        warnings,
      };
    }

    if (width !== config.width || height !== config.height) {
      warnings.push(
        'La imagen no tiene el tamano recomendado de 1800 x 600 px; podria recortarse o verse mal en algunas pantallas.',
      );
    }
  }

  if (mode === 'logo') {
    if (width < config.width || height < config.height) {
      warnings.push('La imagen puede verse pixelada. Se recomienda 400 x 200 px.');
    }
    if (Math.abs(ratio - config.ratio) > 0.35) {
      warnings.push('La proporcion recomendada para el logo es 2:1.');
    }
  }

  if (mode === 'product') {
    if (width < config.width || height < config.height) {
      warnings.push(
        'La imagen puede verse pixelada. Se recomienda usar imágenes cuadradas de al menos 550 x 550 px.',
      );
    }
    if (width !== height) {
      warnings.push('Se recomienda usar imágenes cuadradas para evitar recortes o deformaciones.');
    }
  }

  return { warnings };
}

export default function ImageUploader({
  mode,
  files,
  onFilesChange,
  existingImages = [],
  onExistingImagesChange,
  maxFiles,
  helperText,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [error, setError] = useState('');

  const config = MODE_CONFIG[mode];
  const totalImages =
    maxFiles === 1 && files.length > 0 ? files.length : existingImages.length + files.length;

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    const loadPreviews = async () => {
      const nextPreviews = await Promise.all(
        files.map(async (file, index) => {
          const inspected = await inspectImage(file);
          objectUrls.push(inspected.src);
          const { warnings } = buildWarnings(mode, inspected.width, inspected.height);

          return {
            id: `${file.name}-${file.lastModified}-${index}`,
            src: inspected.src,
            name: file.name,
            warnings,
          };
        }),
      );

      if (!cancelled) {
        setPreviews(nextPreviews);
      }
    };

    void loadPreviews().catch((err: Error) => {
      if (!cancelled) {
        setError(err.message);
      }
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files, mode]);

  const acceptLabel = useMemo(() => 'JPG, PNG o WEBP', []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    if (maxFiles === 1 && selectedFiles.length > 1) {
      setError(`Solo puedes tener hasta ${maxFiles} ${maxFiles === 1 ? 'imagen' : 'imagenes'}.`);
      return;
    }

    if (maxFiles > 1 && existingImages.length + files.length + selectedFiles.length > maxFiles) {
      setError(`Solo puedes tener hasta ${maxFiles} imagenes.`);
      return;
    }

    const acceptedFiles: File[] = [];
    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setError('Formato no permitido. Usa JPG, PNG o WEBP.');
        return;
      }

      if (file.size > config.maxSizeMb * 1024 * 1024) {
        setError(`La imagen no debe superar ${config.maxSizeMb} MB.`);
        return;
      }

      if (mode === 'banner') {
        const inspected = await inspectImage(file);
        URL.revokeObjectURL(inspected.src);
        const { blockingError } = buildWarnings(mode, inspected.width, inspected.height);
        if (blockingError) {
          setError(blockingError);
          return;
        }
      }

      acceptedFiles.push(file);
    }

    onFilesChange(maxFiles === 1 ? acceptedFiles.slice(0, 1) : [...files, ...acceptedFiles]);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, currentIndex) => currentIndex !== index));
  };

  const removeExisting = (index: number) => {
    onExistingImagesChange?.(existingImages.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl bg-white p-6 text-center shadow-sm transition hover:border-brand-cyan hover:bg-cyan-50">
        <FiUploadCloud className="text-4xl text-brand-cyan" />
        <span className="mt-3 text-sm font-black text-gray-900">
          Seleccionar {maxFiles === 1 ? 'imagen' : 'imagenes'}
        </span>
        <span className="mt-1 text-xs font-medium text-gray-500">{acceptLabel}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={maxFiles > 1}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      <p className="mt-3 text-xs font-medium leading-5 text-gray-500">{helperText}</p>
      <p className="mt-1 text-xs font-bold text-gray-400">
        {totalImages}/{maxFiles} {maxFiles === 1 ? 'imagen' : 'imagenes'}
      </p>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>
      ) : null}

      {existingImages.length > 0 || previews.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {existingImages.map((image, index) => (
            <ImagePreview
              key={`${image}-${index}`}
              src={image}
              label={index === 0 ? 'Portada actual' : `Imagen ${index + 1}`}
              onRemove={onExistingImagesChange ? () => removeExisting(index) : undefined}
            />
          ))}

          {previews.map((preview, index) => (
            <ImagePreview
              key={preview.id}
              src={preview.src}
              label={existingImages.length + index === 0 ? 'Portada nueva' : preview.name}
              warnings={preview.warnings}
              onRemove={() => removeFile(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ImagePreview({
  src,
  label,
  warnings = [],
  onRemove,
}: {
  src: string;
  label: string;
  warnings?: string[];
  onRemove?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-2">
      <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
        {failed ? (
          <FiImage className="text-4xl text-gray-300" />
        ) : (
          <img
            src={src}
            alt={label}
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <p className="mt-2 truncate text-[11px] font-bold text-gray-600">{label}</p>
      {warnings.map((warning) => (
        <p key={warning} className="mt-1 text-[10px] font-bold leading-4 text-yellow-700">
          {warning}
        </p>
      ))}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow"
          aria-label="Eliminar imagen"
        >
          <FiTrash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

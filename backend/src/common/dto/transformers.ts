import { TransformFnParams } from 'class-transformer';

export function toTrimmedString({ value }: TransformFnParams) {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = String(value).trim();
  return normalized === '' ? undefined : normalized;
}

export function toOptionalNumber({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = Number(value);
  return Number.isNaN(normalized) ? value : normalized;
}

export function toOptionalBoolean({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

export function toOptionalStringArray({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return value;
}

export type ProductImportCategoryGroup = 'COMPONENTES' | 'ORDENADORES' | 'PERIFERICOS' | 'AUDIO';

export type ProductImportAction = 'create' | 'update';
export type ProductImportRowStatus = 'valid' | 'invalid';

export type ProductImportIssue = {
  row: number;
  field: string;
  message: string;
};

export type ProductImportPreviewRow = {
  row: number;
  status: ProductImportRowStatus;
  action: ProductImportAction;
  name: string;
  numeroParte: string;
  imageCount: number;
};

export type ProductImportPreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newProducts: number;
  productsToUpdate: number;
  imagesFound: number;
  imagesMissing: number;
  errors: ProductImportIssue[];
  warnings: ProductImportIssue[];
  rows: ProductImportPreviewRow[];
};

export type ProductImportConfirmResult = {
  created: number;
  updated: number;
  failed: number;
  uploadedImages: number;
  errors: ProductImportIssue[];
  warnings: ProductImportIssue[];
};

export type ProductImportBody = {
  category?: ProductImportCategoryGroup;
  productType?: string;
};

export type PreparedImportRow = {
  row: number;
  action: ProductImportAction;
  productId?: string;
  payload: Record<string, unknown>;
  imageFiles: string[];
};

export type PreparedImport = ProductImportPreviewResult & {
  preparedRows: PreparedImportRow[];
};

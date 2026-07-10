export type ChatProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  productUrl: string;
};

export type ChatMessage = {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  products?: ChatProduct[];
};

export type ChatAction = {
  type: 'add_to_cart';
  productId: string;
  quantity?: number;
};

export type ConversationState = {
  intent:
    | 'product_search'
    | 'pc_build'
    | 'budget_pc_build'
    | 'cart_action'
    | 'total_query'
    | 'checkout_guidance'
    | 'support'
    | 'unknown'
    | null;
  budget: number | null;
  usage: string | null;
  includesPeripherals: boolean | null;
  mentionedProducts: string[];
  lastRecommendedProducts: ChatProduct[];
  lastRecommendedBuild: ChatProduct[];
  lastFocusedProductId: string | null;
  awaiting: string | null;
};

export type CatalogCategory =
  | 'GPU'
  | 'CPU'
  | 'RAM'
  | 'MOTHERBOARD'
  | 'STORAGE'
  | 'PSU'
  | 'CASE'
  | 'COOLER'
  | 'MONITOR'
  | 'KEYBOARD'
  | 'MOUSE'
  | 'HEADSET'
  | 'MICROPHONE'
  | 'LAPTOP';

export type GuidedStep =
  | 'gpuBrand'
  | 'cpuBrand'
  | 'ramType'
  | 'ramCapacity'
  | 'ramModules'
  | 'motherboardPlatform'
  | 'motherboardSocket'
  | 'storageType'
  | 'storageCapacity'
  | 'psuWattage'
  | 'caseFormFactor'
  | 'caseIncludesPsu'
  | 'coolerType'
  | 'coolerRadiator';

export type GuidedSearchState = {
  category: CatalogCategory;
  step: GuidedStep;
  filters: Record<string, string>;
};

export type CatalogProduct = Record<string, any> & {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  images?: string[];
  imageUrl?: string | null;
  category?: string;
};

export type CatalogSearchResponse = {
  success: boolean;
  searchAvailable?: boolean;
  message?: string;
  items: CatalogProduct[];
};


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
  lastSearchQuery?: string | null;
};

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import { api } from '@/lib/api';
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '@/store/useCartStore';

type ChatProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  productUrl: string;
};

type ChatMessage = {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  products?: ChatProduct[];
};

type ChatAction = {
  type: 'add_to_cart';
  productId: string;
  quantity?: number;
};

type ConversationState = {
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

const STARTER_PROMPTS = [
  'Tengo 3000 soles y quiero una PC para jugar',
  'Busco una PC para oficina con monitor',
  'Quiero una PC para estudio, solo torre',
  'Tienes alguna RTX para gaming?',
];

function ChatProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-400">
        Sin imagen
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-16 w-16 shrink-0 rounded-lg object-cover bg-gray-100"
      onError={() => setHasError(true)}
    />
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const [conversationState, setConversationState] = useState<ConversationState>({
    intent: null,
    budget: null,
    usage: null,
    includesPeripherals: null,
    mentionedProducts: [],
    lastRecommendedProducts: [],
    lastRecommendedBuild: [],
    lastFocusedProductId: null,
    awaiting: null,
  });
  const messageSequenceRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Hola, soy tu Alex, tu asistente virtual. Si quieres, te ayudo a encontrar una pieza puntual o a armar una PC segun tu presupuesto y uso.',
      role: 'assistant',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const activeRequestControllerRef = useRef<AbortController | null>(null);

  const nextMessageId = (prefix: 'user' | 'assistant') => {
    const id = `${prefix}-${messageSequenceRef.current}`;
    messageSequenceRef.current += 1;
    return id;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeRequestControllerRef.current?.abort();
    };
  }, []);

  const normalizeRecommendedProducts = (value: unknown): ChatProduct[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((product): product is ChatProduct => {
      const candidate = product as Partial<ChatProduct>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.price === 'number' &&
        typeof candidate.stock === 'number' &&
        typeof candidate.productUrl === 'string'
      );
    });
  };

  const appendAssistantMessage = (text: string) => {
    if (!isMountedRef.current) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: nextMessageId('assistant'),
        text,
        role: 'assistant',
      },
    ]);
  };

  const findActionProduct = (
    productId: string,
    responseProducts: ChatProduct[],
    state: ConversationState,
  ) => {
    return [
      ...responseProducts,
      ...state.lastRecommendedProducts,
      ...state.lastRecommendedBuild,
    ].find((product) => String(product.id) === String(productId));
  };

  const addProductToCart = (product: ChatProduct, quantity = 1): string => {
    if (product.stock <= 0) {
      return `${product.name} esta sin stock disponible.`;
    }

    const currentItem = useCartStore
      .getState()
      .items.find((item) => String(item.id) === String(product.id));
    const currentQty = currentItem?.qty ?? 0;
    const maxAllowed = Math.min(product.stock, MAX_CART_ITEM_QUANTITY);
    const availableQty = Math.max(0, maxAllowed - currentQty);

    if (availableQty <= 0) {
      return `${product.name} ya alcanzo la cantidad maxima disponible en tu carrito.`;
    }

    const quantityToAdd = Math.min(Math.max(1, quantity), availableQty);
    for (let index = 0; index < quantityToAdd; index += 1) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        image: product.imageUrl ?? undefined,
      });
    }

    return quantityToAdd === 1
      ? `${product.name} agregado al carrito.`
      : `${product.name} agregado al carrito (${quantityToAdd} unidades).`;
  };

  const handleBotActions = (
    actions: ChatAction[],
    responseProducts: ChatProduct[],
    nextState: ConversationState,
  ): string[] => {
    if (actions.length === 0) {
      return [];
    }

    return actions.map((action) => {
      if (action.type !== 'add_to_cart') {
        return 'No pude ejecutar una accion no soportada.';
      }

      const product = findActionProduct(action.productId, responseProducts, nextState);
      if (!product) {
        return 'No pude encontrar el producto para agregarlo al carrito.';
      }

      return addProductToCart(product, action.quantity ?? 1);
    });
  };

  const handleProductCardAdd = (product: ChatProduct) => {
    appendAssistantMessage(addProductToCart(product, 1));
  };

  const sendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: nextMessageId('user'),
      text: trimmed,
      role: 'user',
    };

    const historyForBackend = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    activeRequestControllerRef.current?.abort();
    const controller = new AbortController();
    activeRequestControllerRef.current = controller;

    try {
      const res = await api.post(
        '/ai/chat',
        {
          message: trimmed,
          history: historyForBackend,
          conversationState,
        },
        { signal: controller.signal },
      );

      if (!isMountedRef.current) {
        return;
      }

      const responseState = res.data?.conversationState ?? {};
      const nextState: ConversationState = {
        ...conversationState,
        ...responseState,
        mentionedProducts: Array.isArray(responseState.mentionedProducts)
          ? responseState.mentionedProducts
          : conversationState.mentionedProducts,
        lastRecommendedProducts: Object.prototype.hasOwnProperty.call(
          responseState,
          'lastRecommendedProducts',
        )
          ? normalizeRecommendedProducts(responseState.lastRecommendedProducts)
          : conversationState.lastRecommendedProducts,
        lastRecommendedBuild: Object.prototype.hasOwnProperty.call(
          responseState,
          'lastRecommendedBuild',
        )
          ? normalizeRecommendedProducts(responseState.lastRecommendedBuild)
          : conversationState.lastRecommendedBuild,
        lastFocusedProductId:
          typeof responseState.lastFocusedProductId === 'string'
            ? responseState.lastFocusedProductId
            : responseState.lastFocusedProductId === null
              ? null
              : conversationState.lastFocusedProductId,
        awaiting:
          typeof responseState.awaiting === 'string'
            ? responseState.awaiting
            : responseState.awaiting === null
              ? null
              : conversationState.awaiting,
      };

      if (res.data?.conversationState) {
        setConversationState(nextState);
      }

      const responseProducts = Array.isArray(res.data?.products) ? res.data.products : [];

      const botMessage: ChatMessage = {
        id: nextMessageId('assistant'),
        text:
          typeof res.data?.reply === 'string'
            ? res.data.reply
            : 'No pude procesar bien tu pedido. Intentemos con otra forma de decirlo.',
        role: 'assistant',
        products: responseProducts,
      };

      const actionMessages = handleBotActions(
        Array.isArray(res.data?.actions) ? res.data.actions : [],
        responseProducts,
        nextState,
      ).map<ChatMessage>((text) => ({
        id: nextMessageId('assistant'),
        text,
        role: 'assistant',
      }));

      setMessages((prev) => [...prev, botMessage, ...actionMessages]);
    } catch {
      if (controller.signal.aborted) {
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId('assistant'),
          text: 'Se corto la conexion con el asistente. Intentalo de nuevo en un momento.',
          role: 'assistant',
        },
      ]);
    } finally {
      if (activeRequestControllerRef.current === controller) {
        activeRequestControllerRef.current = null;
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] bg-brand-cyan text-gray-900 p-4 rounded-full shadow-2xl shadow-brand-cyan/40 hover:bg-cyan-400 hover:scale-110 transition-all duration-300 flex items-center justify-center"
        >
          <FiMessageSquare size={28} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[100] w-[350px] sm:w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-fade-in-up"
          style={{ height: '580px', maxHeight: '85vh' }}
        >
          <div className="bg-[#1a1f2b] text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="bg-brand-cyan text-gray-900 p-2 rounded-full">
                <FiCpu size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">Alex</h3>
                <p className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  En linea
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            <p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest my-2">
              Hoy
            </p>

            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Prueba con algo como:
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="text-left text-xs px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-gray-900 transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[88%] space-y-2">
                  <div
                    className={`p-3.5 text-sm shadow-sm whitespace-pre-line ${
                      msg.role === 'assistant'
                        ? 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                        : 'bg-brand-cyan text-gray-900 font-medium rounded-2xl rounded-tr-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.role === 'assistant' && msg.products && msg.products.length > 0 ? (
                    <div className="space-y-2">
                      {msg.products.map((product) => (
                        <div
                          key={`${msg.id}-${product.id}`}
                          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                        >
                          <div className="flex gap-3 p-3">
                            <ChatProductImage src={product.imageUrl} alt={product.name} />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-black text-gray-900">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs font-bold text-gray-700">
                                S/. {Number(product.price).toFixed(2)}
                              </p>
                              <p className="text-[11px] font-medium text-gray-500">
                                {product.stock > 0 ? `En stock: ${product.stock}` : 'Sin stock'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 border-t border-gray-100 text-center text-xs font-black">
                            <Link
                              href={product.productUrl}
                              className="px-3 py-2 text-brand-cyan hover:bg-cyan-50"
                            >
                              Ver producto
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleProductCardAdd(product)}
                              disabled={product.stock <= 0}
                              className="border-l border-gray-100 px-3 py-2 text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                              Agregar al carrito
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  ></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                className="flex-1 border-2 border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:border-brand-cyan transition-colors"
                placeholder="Ej: tengo 3000 soles y quiero una PC gamer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 bg-[#1a1f2b] text-white px-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                <FiSend size={18} />
              </button>
            </form>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              La recomendacion se basa en el catalogo y stock actual. Verifica el carrito antes de
              pagar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

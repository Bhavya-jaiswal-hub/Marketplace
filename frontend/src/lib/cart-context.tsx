'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { cartService } from './api';
import { useAuth } from './auth-context';
import { CartItem, Product } from './types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      // Local storage fallback for unauthenticated guest cart
      const localCart = localStorage.getItem('guest_cart');
      if (localCart) {
        try {
          setItems(JSON.parse(localCart));
        } catch (e) {
          setItems([]);
        }
      }
      return;
    }

    try {
      const cart = await cartService.getCart();
      setItems(cart.items || []);
    } catch (e) {
      console.error('Failed to fetch backend cart:', e);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [isAuthenticated]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const addItem = async (product: Product, quantity: number = 1) => {
    if (isAuthenticated) {
      try {
        await cartService.addItem(product.id, quantity);
        await refreshCart();
      } catch (e) {
        console.error('Failed to add item to backend cart:', e);
      }
    } else {
      // Guest cart management
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        let updated: CartItem[];
        if (existing) {
          updated = prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          updated = [
            ...prev,
            {
              id: `guest-${Date.now()}-${Math.random()}`,
              productId: product.id,
              product,
              quantity,
            },
          ];
        }
        localStorage.setItem('guest_cart', JSON.stringify(updated));
        return updated;
      });
    }
    openDrawer();
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    if (isAuthenticated) {
      try {
        await cartService.updateItemQuantity(itemId, quantity);
        await refreshCart();
      } catch (e) {
        console.error('Failed to update quantity:', e);
      }
    } else {
      setItems((prev) => {
        const updated = prev.map((i) => (i.id === itemId ? { ...i, quantity } : i));
        localStorage.setItem('guest_cart', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    if (isAuthenticated) {
      try {
        await cartService.removeItem(itemId);
        await refreshCart();
      } catch (e) {
        console.error('Failed to remove item:', e);
      }
    } else {
      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== itemId);
        localStorage.setItem('guest_cart', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
        setItems([]);
      } catch (e) {
        console.error('Failed to clear cart:', e);
      }
    } else {
      localStorage.removeItem('guest_cart');
      setItems([]);
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.product?.price || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalAmount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { Button } from './ui/Button';

export const CartDrawer: React.FC = () => {
  const { isDrawerOpen, closeDrawer, items, totalAmount, updateQuantity, removeItem } = useCart();

  if (!isDrawerOpen) return null;

  // Group items by seller
  const sellerGroups: Record<string, { sellerName: string; items: typeof items }> = {};

  items.forEach((item) => {
    const sellerId = item.product?.sellerId || 'default-seller';
    const sellerName = item.product?.seller?.displayName || 'Verified Marketplace Vendor';

    if (!sellerGroups[sellerId]) {
      sellerGroups[sellerId] = { sellerName, items: [] };
    }
    sellerGroups[sellerId].items.push(item);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Your Shopping Cart ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4 text-brand-600">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Your cart is empty</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  Discover verified independent vendors across India and add top items to your cart.
                </p>
                <Button onClick={closeDrawer} className="mt-6">
                  Explore Marketplace
                </Button>
              </div>
            ) : (
              Object.entries(sellerGroups).map(([sellerId, group]) => (
                <div key={sellerId} className="py-4 first:pt-0">
                  {/* Seller Header */}
                  <div className="flex items-center gap-1.5 mb-3 px-1 py-1 rounded bg-slate-50 border border-slate-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      Shipped by: {group.sellerName}
                    </span>
                  </div>

                  {/* Seller Items */}
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const image =
                        item.product?.images?.[0]?.imageUrl ||
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
                      const price = Number(item.product?.price || 0);

                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm"
                        >
                          <div className="relative w-16 h-16 rounded-lg bg-slate-50 overflow-hidden flex-shrink-0">
                            <Image src={image} alt={item.product?.name || 'Product'} fill className="object-cover" />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate font-heading">
                                {item.product?.name}
                              </h4>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="text-xs font-bold text-slate-900 mt-1">
                              ₹{(price * item.quantity).toLocaleString('en-IN')}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="p-1 hover:bg-slate-200/60 rounded-l-lg text-slate-600"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-semibold px-2.5 text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 hover:bg-slate-200/60 rounded-r-lg text-slate-600"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <span className="text-[11px] text-slate-400">
                                ₹{price.toLocaleString('en-IN')} each
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Delivery</span>
                  <span className="text-emerald-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                  <span>Total Payable</span>
                  <span className="font-heading">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="outline" onClick={closeDrawer} asChild>
                  <Link href="/cart" onClick={closeDrawer}>
                    View Cart
                  </Link>
                </Button>
                <Button onClick={closeDrawer} asChild className="gap-1.5 shadow-md">
                  <Link href="/checkout" onClick={closeDrawer}>
                    <span>Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

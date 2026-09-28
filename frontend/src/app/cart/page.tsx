'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/Button';

export default function CartPage() {
  const { items, totalAmount, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto text-brand-600 shadow-sm">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Your Shopping Cart is Empty</h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Explore products from verified independent vendors across India and fill your cart!
        </p>
        <Button asChild size="lg" className="rounded-xl mt-4">
          <Link href="/products">Explore Marketplace</Link>
        </Button>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 font-heading">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">
            {items.reduce((s, i) => s + i.quantity, 0)} items across {Object.keys(sellerGroups).length} independent merchant(s)
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={clearCart} className="text-rose-600 hover:bg-rose-50">
          Clear All Items
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-6">
          {Object.entries(sellerGroups).map(([sellerId, group]) => (
            <div
              key={sellerId}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
            >
              {/* Seller Header */}
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 tracking-wide">
                    Fulfilled by: {group.sellerName}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                  Direct Vendor Dispatch
                </span>
              </div>

              {/* Items in this seller group */}
              <div className="divide-y divide-slate-100 px-6">
                {group.items.map((item) => {
                  const image =
                    item.product?.images?.[0]?.imageUrl ||
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
                  const price = Number(item.product?.price || 0);

                  return (
                    <div key={item.id} className="py-5 flex gap-5 items-center">
                      <div className="relative w-20 h-20 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                        <Image src={image} alt={item.product?.name || 'Product'} fill className="object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${item.productId}`}
                          className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors font-heading truncate block"
                        >
                          {item.product?.name}
                        </Link>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.product?.sku}</p>
                        <div className="text-sm font-extrabold text-slate-900 mt-2">
                          ₹{price.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-slate-200/60 rounded-l-xl text-slate-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold px-3 text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-slate-200/60 rounded-r-xl text-slate-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total Item Price */}
                      <div className="text-sm font-extrabold text-slate-950 w-24 text-right font-heading">
                        ₹{(price * item.quantity).toLocaleString('en-IN')}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 sticky top-24">
          <h3 className="text-base font-bold text-slate-900 font-heading">Order Summary</h3>

          <div className="space-y-3 text-xs text-slate-600 divide-y divide-slate-100">
            <div className="flex justify-between pt-1">
              <span>Items Subtotal</span>
              <span className="font-semibold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-3">
              <span>GST & Taxes</span>
              <span className="text-slate-500">Included in prices</span>
            </div>
            <div className="flex justify-between pt-3">
              <span>Standard Delivery</span>
              <span className="text-emerald-600 font-bold">FREE</span>
            </div>
            <div className="flex justify-between pt-3 text-base font-extrabold text-slate-950">
              <span>Total Payable</span>
              <span className="font-heading">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <Button size="lg" asChild className="w-full rounded-xl gap-2 shadow-lg shadow-brand-500/25">
            <Link href="/checkout">
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <p className="text-[11px] text-center text-slate-400">
            Protected by Razorpay 256-bit SSL encryption & 5-day return policy.
          </p>
        </div>
      </div>
    </div>
  );
}

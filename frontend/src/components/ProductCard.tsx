'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ShieldCheck, AlertCircle, Package } from 'lucide-react';
import { Product } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const primaryImage =
    product.images && product.images.length > 0
      ? product.images.find((img) => img.isPrimary)?.imageUrl || product.images[0].imageUrl
      : null;

  const price = Math.round(Number(product.price) || 0);
  const mrp = Math.round(product.mrp ? Number(product.mrp) : price * 1.35);
  const savings = mrp > price ? mrp - price : 0;
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const availableStock = product.inventory?.availableQuantity ?? 20;
  const lowStockThreshold = product.inventory?.lowStockThreshold ?? 10;
  const isLowStock = availableStock <= lowStockThreshold && availableStock > 0;
  const isOutOfStock = availableStock <= 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-slate-300 flex flex-col h-full">
      {/* Product Image Container */}
      <Link
        href={`/products/${product.id}`}
        className="block relative aspect-square w-full bg-slate-100 overflow-hidden"
      >
        {primaryImage && !imageError ? (
          <Image
            src={primaryImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            onError={() => setImageError(true)}
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          /* Graceful Fallback Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200/80 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-brand-600 transition-all duration-300">
              <Package className="w-7 h-7" />
            </div>
            <span className="mt-2.5 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              {product.category?.name || 'Product'}
            </span>
          </div>
        )}

        {/* Pinned Badges with High Z-Index */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          {discountPercent > 0 && (
            <span className="inline-flex items-center bg-rose-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-md tracking-wide">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          {isOutOfStock ? (
            <Badge variant="danger" size="sm" className="bg-rose-600 text-white border-0 shadow-md">
              Out of Stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="warning" size="sm" className="bg-amber-500 text-white border-0 shadow-md">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Only {availableStock} left
            </Badge>
          ) : null}
        </div>
      </Link>

      {/* Product Information Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Seller / Brand Info */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 tracking-wide truncate">
              {product.seller?.displayName || 'Verified Seller'}
            </span>
          </div>

          {/* Fixed-Height Title (Clamped to exactly 2 lines) */}
          <Link href={`/products/${product.id}`} className="block group-hover:text-brand-600 transition-colors">
            <h3
              className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug font-heading h-10 overflow-hidden"
              title={product.name}
            >
              {product.name}
            </h3>
          </Link>

          {/* Fixed-Height Category Pill Wrapper */}
          <div className="h-6 mt-1 flex items-center">
            {product.category?.name ? (
              <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                {product.category.name}
              </span>
            ) : null}
          </div>
        </div>

        {/* Bottom Price & Action Row (Anchored to baseline) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg font-extrabold text-slate-950 font-heading">
                ₹{formatCurrency(price)}
              </span>
              {mrp > price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{formatCurrency(mrp)}
                </span>
              )}
            </div>
            {savings > 0 && (
              <span className="block text-[11px] font-semibold text-emerald-600 truncate">
                Save ₹{formatCurrency(savings)}
              </span>
            )}
          </div>

          <Button
            size="sm"
            disabled={isOutOfStock}
            onClick={() => addItem(product, 1)}
            className="rounded-xl px-3.5 flex-shrink-0 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

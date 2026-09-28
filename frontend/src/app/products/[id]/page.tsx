'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  ShoppingBag,
  RotateCcw,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Share2,
  Plus,
  Minus,
  Package,
} from 'lucide-react';
import { productService } from '@/lib/api';
import { Product } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await productService.getProductById(productId);
        setProduct(data);
        if (data?.images && data.images.length > 0) {
          setSelectedImage(data.images[0].imageUrl);
        }
      } catch (err) {
        console.error('Failed to load product detail:', err);
      } finally {
        setLoading(false);
      }
    }
    if (productId) loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-200 rounded-3xl animate-pulse" />
          <div className="space-y-6">
            <div className="h-8 bg-slate-200 rounded-lg w-3/4 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
            <div className="h-24 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Product Not Found</h2>
        <p className="text-sm text-slate-500">The product you are looking for does not exist or has been unlisted.</p>
        <Button asChild>
          <Link href="/products">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const price = Math.round(Number(product?.price) || 0);
  const mrp = Math.round(product?.mrp ? Number(product.mrp) : price * 1.35);
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const availableStock = product?.inventory?.availableQuantity ?? 20;
  const lowStockThreshold = product?.inventory?.lowStockThreshold ?? 10;
  const isLowStock = availableStock <= lowStockThreshold && availableStock > 0;
  const isOutOfStock = availableStock <= 0;

  const currentImg =
    selectedImage ||
    product?.images?.[0]?.imageUrl ||
    null;

  const handleBuyNow = () => {
    if (product) {
      addItem(product, quantity);
      router.push('/checkout');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/products" className="hover:text-brand-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Gallery Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-sm flex items-center justify-center">
            {currentImg && !imgError ? (
              <Image
                src={currentImg}
                alt=""
                fill
                priority
                onError={() => setImgError(true)}
                className="object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center">
                <Package className="w-16 h-16 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {product.category?.name || 'Product Image'}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.imageUrl)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    selectedImage === img.imageUrl
                      ? 'border-brand-600 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={img.imageUrl} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Actions Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Seller Trust Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Merchant: {product.seller?.displayName || 'Independent Vendor'}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 leading-tight font-heading">
            {product.name}
          </h1>

          {/* Price & Savings Display */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-950 font-heading">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {mrp > price && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{mrp.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Inclusive of all applicable taxes & GST</p>
            </div>

            {/* Stock Status Indicator */}
            <div>
              {isOutOfStock ? (
                <Badge variant="danger">Out of Stock</Badge>
              ) : isLowStock ? (
                <Badge variant="warning">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Only {availableStock} Units Left
                </Badge>
              ) : (
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  In Stock ({availableStock} available)
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Overview</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-body">{product.description}</p>
          </div>

          {/* Purchase Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center border border-slate-200 rounded-xl bg-white h-11 px-2">
                <button
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-slate-900">{quantity}</span>
                <button
                  disabled={quantity >= availableStock}
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart */}
              <Button
                size="lg"
                variant="outline"
                disabled={isOutOfStock}
                onClick={() => addItem(product, quantity)}
                className="flex-1 rounded-xl h-11"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </Button>

              {/* Buy Now */}
              <Button
                size="lg"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="flex-1 rounded-xl h-11 shadow-md shadow-brand-500/20"
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* 5-Day Returns & Delivery Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">5-Day Easy Returns</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Physical inspection & full refund guarantee</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Direct Vendor Dispatch</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Fast courier tracking</p>
              </div>
            </div>
          </div>

          {/* Specifications Table */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Technical Specifications
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                {product.specifications.map((spec) => (
                  <div key={spec.id} className="grid grid-cols-3 p-3 bg-white">
                    <span className="font-semibold text-slate-500">{spec.name}</span>
                    <span className="col-span-2 text-slate-900 font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, Headphones, Laptop, Shirt, ShoppingBag } from 'lucide-react';
import { productService } from '@/lib/api';
import { Product, Category } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodsData, catsData] = await Promise.all([
          productService.getProducts(),
          productService.getCategories(),
        ]);
        setProducts(prodsData || []);
        setCategories(catsData || []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categoryIcons: Record<string, React.ReactNode> = {
    electronics: <Headphones className="w-5 h-5 text-indigo-600" />,
    'audio-accessories': <Headphones className="w-5 h-5 text-indigo-600" />,
    'laptops-computers': <Laptop className="w-5 h-5 text-blue-600" />,
    'fashion-apparel': <Shirt className="w-5 h-5 text-rose-600" />,
    'mens-clothing': <Shirt className="w-5 h-5 text-amber-600" />,
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-20 lg:py-28">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[300px] h-[200px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-brand-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>India&apos;s Curated Multi-Vendor Marketplace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading">
                Shop Directly From <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-200 to-emerald-400">
                  Verified Independent
                </span>{' '}
                Vendors.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-body">
                Discover top electronics, high-performance laptops, and handcrafted fashion from KYC-verified merchants. Enjoy 5-day easy returns and secure instant payments.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Button size="lg" asChild className="rounded-xl shadow-lg shadow-brand-500/30 gap-2">
                  <Link href="/products">
                    <span>Explore Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl backdrop-blur-md">
                  <Link href="/products?category=electronics">View Electronics</Link>
                </Button>
              </div>

              {/* Trust Micro-Badges */}
              <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>100% KYC Verified Sellers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span>5-Day Return Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Razorpay Instant Checkout</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Cards */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-slate-900/60 backdrop-blur-xl p-6 space-y-4">
                  <div className="relative h-60 rounded-2xl overflow-hidden bg-slate-800">
                    <Image
                      src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
                      alt="Featured Headphones"
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute top-3 left-3 bg-brand-600/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full">
                      Trending Device
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        TechGadgets India
                      </span>
                      <span className="text-xs text-slate-400 font-mono">SKU: TECH-ANC-001</span>
                    </div>
                    <h3 className="text-lg font-bold text-white font-heading">
                      Apex ANC Wireless Headphones Pro
                    </h3>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-2xl font-extrabold text-white font-heading">₹4,999</span>
                      <Button size="sm" asChild className="rounded-xl">
                        <Link href="/products">Quick Buy</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Discovery Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Browse Categories</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1 font-heading">
              Explore Popular Departments
            </h2>
          </div>
          <Link href="/products" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 uppercase tracking-wider">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group p-5 bg-white border border-slate-200/80 rounded-2xl hover:border-brand-500 hover:shadow-card-hover transition-all duration-200 flex flex-col items-center text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-brand-50 flex items-center justify-center transition-colors">
                {categoryIcons[cat.slug] || <ShoppingBag className="w-5 h-5 text-brand-600" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors font-heading">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {cat.description || 'Curated catalog'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Trending Right Now</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1 font-heading">
              Top Picks from Verified Sellers
            </h2>
          </div>
          <Link href="/products" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 uppercase tracking-wider">
            <span>Explore All ({products.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

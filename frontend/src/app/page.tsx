'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Truck,
  Lock,
  Star,
  ShoppingBag,
  Sparkles,
  Heart,
  Bolt,
  PlayCircle,
  Package,
  Layers,
  Award,
  Flame,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { productService } from '@/lib/api';
import { Product, Category } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cart-context';

export default function HomePage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'gi' | 'budget'>('trending');
  const [spotlightAdded, setSpotlightAdded] = useState(false);

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

  const spotlightProduct: Product = {
    id: 'spotlight-jaipur-vase',
    name: 'Hand-thrown Cobalt Indigo Ceramic Amphora Vase (28cm, Lead-Free Quartz Fired)',
    slug: 'jaipur-blue-pottery-vase',
    description: 'Authentic GI-registered Jaipur blue pottery vase fired with quartz and natural cobalt glaze.',
    price: 3490,
    mrp: 4750,
    sku: 'VNG-JAI-4820',
    status: 'ACTIVE',
    categoryId: 'studio-pottery',
    sellerId: 'jaipur-guild',
    seller: {
      id: 'jaipur-guild',
      businessName: 'Jaipur Blue Pottery Guild',
      displayName: 'Jaipur Blue Pottery Guild',
      contactEmail: 'guild@jaipurpottery.org',
      isVerified: true,
    },
    images: [
      {
        id: 'img-1',
        imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
        isPrimary: true,
        displayOrder: 1,
      },
    ],
    inventory: {
      availableQuantity: 7,
      reservedQuantity: 0,
      lowStockThreshold: 10,
    },
  };

  const handleAddSpotlight = () => {
    addItem(spotlightProduct, 1);
    setSpotlightAdded(true);
    setTimeout(() => setSpotlightAdded(false), 2000);
  };

  const craftCategories = [
    { title: 'Handcrafted Decor', count: '1,420 items', slug: 'handcrafted-decor', icon: '🏺' },
    { title: 'Pure Silk & Khadi', count: '890 items', slug: 'pure-silk-khadi', icon: '🧵' },
    { title: 'Artisanal Coffee', count: '340 blends', slug: 'artisanal-coffee', icon: '☕' },
    { title: 'Studio Pottery', count: '610 pieces', slug: 'studio-pottery', icon: '🍶' },
    { title: 'Brass & Bell Metal', count: '520 artifacts', slug: 'brass-metalwork', icon: '🪔' },
    { title: 'Organic Wellness', count: '740 products', slug: 'organic-wellness', icon: '🌿' },
    { title: 'Acoustic Audio', count: '190 pieces', slug: 'premium-audio', icon: '🎧' },
    { title: 'Fine Leather', count: '430 goods', slug: 'fine-leathergoods', icon: '💼' },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Top Ambient Glow Layer */}
      <div className="relative w-full overflow-hidden pt-6">
        <div className="absolute -top-32 right-1/4 w-[540px] h-[540px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-10 w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Section 1: Hero Section (Split Asymmetric Layout) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-7 flex flex-col items-start space-y-6">
              {/* Origin Escrow Badge */}
              <div className="inline-flex items-center gap-2 bg-slate-100/90 border border-slate-200/60 px-4 py-1.5 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider font-mono">
                  Direct Origin Dispatch
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600 font-semibold">
                  100% Razorpay Escrow Protected
                </span>
              </div>

              {/* Hero Display Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] text-slate-950 font-extrabold tracking-tight leading-[1.12] font-heading">
                Direct from India’s Top{' '}
                <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 bg-clip-text text-transparent">
                  Verified Independent
                </span>{' '}
                Craftsmen &amp; Brands.
              </h1>

              {/* Hero Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Discover authentic GI-tagged handwoven silks, lost-wax brassware, small-batch micro-lot coffees, and studio ceramics. Every rupee is held securely in institutional escrow until your 5-day inspection is complete.
              </p>

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
                <Button size="lg" asChild className="rounded-xl px-6 py-3.5 shadow-md hover:shadow-lg gap-2 text-sm font-bold">
                  <Link href="/products">
                    <span>Explore Marketplace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <a
                  href="#artisan-collective"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-800 border border-slate-200/80 hover:bg-slate-50 rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition-all"
                >
                  <PlayCircle className="w-5 h-5 text-emerald-600" />
                  <span>Meet the Artisans</span>
                </a>
              </div>

              {/* Live Trust & Metrics Strip */}
              <div className="w-full pt-4 mt-2 bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-slate-950 font-heading">1,240+</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Audited Studios
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-slate-950 font-heading">48,000+</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                      <Layers className="w-3.5 h-3.5 text-brand-600" />
                      Curated Crafts
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-slate-950 font-heading">4.94 ★</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      18,400+ Reviews
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-600 font-heading">₹0.00</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Escrow Risk
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Spotlight Feature Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-2 bg-gradient-to-tr from-brand-200 to-emerald-200 opacity-50 blur-2xl rounded-3xl" />
              <div className="relative bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                {/* Spotlight Header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                    <span>Artisan of the Week</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>GST &amp; GI Verified</span>
                  </div>
                </div>

                {/* Spotlight Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 my-4">
                  <Image
                    src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800"
                    alt="Jaipur Blue Pottery Vase"
                    fill
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md">
                    26% OFF
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-slate-800 flex items-center gap-1.5 shadow-sm text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Only 7 units fired &amp; ready</span>
                  </div>
                </div>

                {/* Store Title & Specs */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                      <span>Jaipur Blue Pottery Guild</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <span className="text-xs text-amber-600 font-bold">★ 4.98 (384)</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug font-heading">
                    Hand-thrown Cobalt Indigo Ceramic Amphora Vase (28cm, Lead-Free Quartz Fired)
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>Sanganer, Rajasthan</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">GI Registration #AU/4820</span>
                  </div>
                </div>

                {/* Price & Escrow Lock Block */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-slate-950 font-heading">₹3,490</span>
                      <span className="text-xs text-slate-400 line-through">₹4,750</span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Save ₹1,260
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Free Delivery</span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-slate-600 text-[11px] leading-tight bg-white p-2 rounded-xl border border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>Razorpay Escrow Vault:</strong> Merchant payment released 5 days post-delivery.</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 grid grid-cols-5 gap-2">
                  <Button
                    onClick={handleAddSpotlight}
                    className={`col-span-4 rounded-xl py-3 text-xs font-bold gap-2 ${
                      spotlightAdded ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                    }`}
                  >
                    {spotlightAdded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Added to Multi-Vendor Bag!</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Buy Now with Escrow</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAddSpotlight}
                    className="col-span-1 rounded-xl p-0 flex items-center justify-center"
                    title="Quick Add"
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-700" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2: 4 Pillars of Marketplace Trust */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-heading">100% Verified Sellers</h3>
                <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono">Zero Counterfeits</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              4-tier physical and documentation audit: GST verification, origin workshop inspections, and craft certification.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-heading">Direct Escrow Vault</h3>
                <span className="text-[10px] font-bold text-brand-700 uppercase font-mono">Razorpay Institutional</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Your payment remains insulated in a neutral reserve account until you receive, inspect, and approve your items.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-heading">5-Day Return Window</h3>
                <span className="text-[10px] font-bold text-amber-700 uppercase font-mono">No Interrogation</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Unhappy with craft fidelity or dimensions? Initiate automated doorstep reverse-pickup with automatic instant refund.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-heading">Direct Origin Shipping</h3>
                <span className="text-[10px] font-bold text-slate-600 uppercase font-mono">Zero Warehousing</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Packed and dispatched directly from the craftsman&apos;s kiln, loom, or roastery with real-time GPS freight tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Curated Craft Collectives (Category Discovery) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full" id="artisan-collective">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-brand-600 uppercase font-bold tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Regional Craft Pavilions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1 font-heading">
              Curated Craft Collectives
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider"
          >
            <span>Browse all 24 curated guilds</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 8 Categories Carousel/Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {craftCategories.map((cat, idx) => (
            <Link
              key={idx}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-brand-500 hover:bg-slate-50/80 transition-all duration-200 shadow-xs hover:shadow-md text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-brand-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-2.5">
                {cat.icon}
              </div>
              <span className="text-xs font-bold text-slate-900 leading-tight font-heading">
                {cat.title}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {cat.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 4: Trending Products Grid (4 Columns) with Filter Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 uppercase font-bold tracking-wider font-mono">
              <Bolt className="w-4 h-4 text-amber-500" />
              <span>Fast-Dispatch Catalog</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1 font-heading">
              Trending Direct from Studios
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'trending'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trending Across India
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'new'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Newly Verified Artisans
            </button>
            <button
              onClick={() => setActiveTab('gi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'gi'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GI Tagged Originals
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'budget'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bestsellers Under ₹2,999
            </button>
          </div>
        </div>

        {/* 4-Column Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Section 5: Artisan Impact & Verified Seller Story (Bento Split) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="relative bg-white border border-slate-200/80 rounded-3xl p-8 lg:p-12 overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col space-y-5">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono w-fit">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Institutional Escrow Transparency</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 leading-tight font-heading">
                Skip the Middlemen.<br />
                <span className="text-brand-600">Empower Indian Heritage.</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Conventional retail markups pocket up to 70% of artisan profits. At Vanguard Marketplace, our direct Razorpay escrow infrastructure ensures <span className="text-slate-950 font-bold">88% of your order value goes directly to the master creator’s verified bank account</span>.
              </p>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-3.5 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-2xl font-bold text-emerald-600 font-heading">88%</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">Direct Artisan Revenue</div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-2xl font-bold text-brand-600 font-heading">₹14.2 Cr</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">Disbursed via Escrow</div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-2xl font-bold text-slate-950 font-heading">100%</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">GST &amp; GI Verified</div>
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-4">
                <Button asChild size="lg" className="rounded-xl px-6 py-3 text-xs font-bold shadow-md gap-2">
                  <Link href="/products">
                    <BookOpen className="w-4 h-4" />
                    <span>Read Verified Seller Stories</span>
                  </Link>
                </Button>
                <Link
                  href="/auth/register"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider"
                >
                  Apply to Sell as an Artisan →
                </Link>
              </div>
            </div>

            {/* Right Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 shadow-md relative">
                <Image
                  src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800"
                  alt="Master craftsman in workshop"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md border border-slate-200/80 p-4 rounded-2xl shadow-xl flex items-center gap-3 max-w-xs">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 font-heading">Ramakanth Sharma</div>
                  <div className="text-[11px] text-slate-500">Master Brass Sculptor • 34 yrs craft legacy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

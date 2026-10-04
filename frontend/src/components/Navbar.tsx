'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  ShieldCheck,
  LogOut,
  Package,
  Menu,
  X,
  Heart,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Grid,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Button } from './ui/Button';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, openDrawer, items } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const vendorCount = new Set(items.map((i) => i.product?.sellerId).filter(Boolean)).size;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      {/* Top Announcement Bar */}
      <div className="bg-slate-50 border-b border-slate-200/60 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between text-[11px] font-medium">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              🇮🇳 Pan-India Express Delivery • 100% Escrow Protected by Razorpay • 1,200+ Verified Independent Artisans
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-500 flex-shrink-0">
            <Link href="/auth/register" className="hover:text-brand-600 transition-colors">
              Sell on Vanguard
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/orders" className="hover:text-brand-600 transition-colors">
              Track Order
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/orders" className="hover:text-brand-600 transition-colors">
              Help & Support
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Category Button */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-slate-950 leading-none tracking-tight font-heading">
                VANGUARD
              </span>
              <span className="text-[10px] font-bold text-brand-600 tracking-widest uppercase font-mono">
                MARKETPLACE
              </span>
            </div>
          </Link>

          <Link
            href="/products"
            className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl text-slate-800 text-xs font-bold transition-colors font-heading"
          >
            <Grid className="w-4 h-4 text-slate-500" />
            <span>All Categories</span>
          </Link>
        </div>

        {/* Global Omni-Search */}
        <div className="flex-1 max-w-xl mx-2 hidden md:block">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 50,000+ verified artisan products, brassware, textiles, audio..."
              className="w-full h-10 pl-10 pr-14 bg-slate-100/80 hover:bg-white focus:bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
            />
            <div className="absolute right-2.5 flex items-center">
              <kbd className="text-[10px] font-mono bg-white text-slate-400 border border-slate-200/80 px-1.5 py-0.5 rounded shadow-xs font-semibold">
                ⌘K
              </kbd>
            </div>
          </form>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Wishlist Link */}
          <Link
            href="/products"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex items-center justify-center"
            title="Wishlist"
          >
            <Heart className="w-5 h-5" />
          </Link>

          {/* Cart Trigger */}
          <button
            onClick={openDrawer}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-slate-700"
            aria-label="Shopping Cart"
          >
            <div className="relative flex items-center text-slate-800">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-brand-600 text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="text-left hidden xl:block">
              <div className="text-[10px] font-mono text-slate-400 leading-none">Multi-Vendor</div>
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {vendorCount > 0 ? `${vendorCount} Vendor${vendorCount > 1 ? 's' : ''}` : 'My Cart'}
              </div>
            </div>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          {/* User Account Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/80"
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[90px]">
                    {user?.fullName || 'Account'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold leading-none">
                    Verified Buyer
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  onClick={() => setIsUserMenuOpen(false)}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in-50 zoom-in-95"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                      {user?.role}
                    </span>
                  </div>

                  <Link
                    href="/orders"
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Package className="w-4 h-4 text-slate-400" />
                    <span>My Orders & Returns</span>
                  </Link>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border-t border-slate-100 text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="hidden sm:inline-flex rounded-xl text-xs shadow-sm">
                <Link href="/auth/register">Sign Up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sub-Header Category Navigation */}
      <div className="bg-slate-50/90 border-t border-slate-200/60 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs">
          <nav className="flex items-center gap-6 overflow-x-auto py-1 font-heading">
            <Link href="/products?category=handcrafted-decor" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Handcrafted Decor
            </Link>
            <Link href="/products?category=pure-silk-khadi" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Pure Silk & Khadi
            </Link>
            <Link href="/products?category=artisanal-coffee" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Artisanal Coffee
            </Link>
            <Link href="/products?category=organic-wellness" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Organic Wellness
            </Link>
            <Link href="/products?category=brass-metalwork" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Brass & Metalwork
            </Link>
            <Link href="/products?category=studio-pottery" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Studio Pottery
            </Link>
            <Link href="/products?category=premium-audio" className="text-slate-600 hover:text-brand-600 font-semibold whitespace-nowrap transition-colors">
              Premium Audio
            </Link>
          </nav>

          <div className="flex items-center gap-4 pl-4 flex-shrink-0 font-heading">
            <Link href="/products" className="flex items-center gap-1 text-amber-700 hover:text-amber-800 font-bold whitespace-nowrap transition-colors">
              <span>⚡ Flash Deals</span>
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/products" className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold whitespace-nowrap transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Sellers Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden py-4 px-4 bg-white border-t border-slate-200 space-y-3 animate-in slide-in-from-top-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-10 pl-9 pr-4 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-semibold text-slate-700">
            <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg">
              Explore All Catalog
            </Link>
            <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg">
              Track My Orders
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Lock, ShoppingBag } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900 mt-20">
      {/* Marketplace Guarantees Banner */}
      <div className="border-b border-slate-900/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-heading">Verified Vendors</h4>
                <p className="text-xs text-slate-400 mt-0.5">Strict KYC & GST compliance</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-heading">5-Day Easy Returns</h4>
                <p className="text-xs text-slate-400 mt-0.5">Physical inspection & refunds</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-heading">Secure Payments</h4>
                <p className="text-xs text-slate-400 mt-0.5">Razorpay Cards, UPI & NetBanking</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-heading">Multi-Vendor Delivery</h4>
                <p className="text-xs text-slate-400 mt-0.5">Live courier tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white font-heading">MarketPlace</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              India&apos;s premier multi-vendor commerce platform empowering verified independent sellers and customers with seamless, trusted transactions.
            </p>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Popular Categories</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/products?category=electronics" className="hover:text-white transition-colors">
                  Electronics & Audio
                </Link>
              </li>
              <li>
                <Link href="/products?category=laptops-computers" className="hover:text-white transition-colors">
                  Laptops & Computers
                </Link>
              </li>
              <li>
                <Link href="/products?category=fashion-apparel" className="hover:text-white transition-colors">
                  Fashion & Apparels
                </Link>
              </li>
              <li>
                <Link href="/products?category=mens-clothing" className="hover:text-white transition-colors">
                  Men&apos;s Collection
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Customer Care</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Your Orders
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  5-Day Return Policy
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Support: support@marketplace.example.com</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform & Legal */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Platform & Trust</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Verified Vendor Network</li>
              <li>7-Day Holding Settlement Cycle</li>
              <li>SSL 256-bit Encrypted Checkout</li>
              <li>GST Compliant Invoicing</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-900 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Multi-Vendor Marketplace Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

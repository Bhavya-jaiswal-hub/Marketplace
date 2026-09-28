'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setError('Please provide a valid verification token.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await api.post('/auth/verify-email', { token: tokenToVerify.trim() });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Verification failed or token has expired. Please request a new verification email.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-card-hover p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/25">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-950 font-heading">Email Verification</h1>
        <p className="text-xs text-slate-500">
          Verify your email address to activate your marketplace account
        </p>
      </div>

      {success ? (
        <div className="space-y-6 text-center">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Email Verified Successfully!</span>
            </div>
            <p className="text-xs text-emerald-700">
              Your account is now fully active. You can log in to start buying or selling.
            </p>
          </div>

          <Button size="lg" asChild className="w-full rounded-xl gap-2 shadow-md shadow-brand-500/25">
            <Link href="/auth/login">
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Verification Token / Code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token received in your email"
              disabled={isVerifying}
            />

            <Button
              onClick={() => handleVerify(token)}
              size="lg"
              isLoading={isVerifying}
              className="w-full rounded-xl gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify My Account</span>
            </Button>
          </div>

          <p className="text-xs text-center text-slate-500 pt-2">
            Already verified?{' '}
            <Link href="/auth/login" className="font-bold text-brand-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="h-80 w-full max-w-md bg-slate-100 rounded-3xl animate-pulse" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { BrandMark } from '../../../components/BrandMark';
import api from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError('Não foi possível enviar as instruções. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden login-hero"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(251,250,247,0.85) 0%, rgba(255,255,255,0.9) 60%), radial-gradient(80% 60% at 8% 55%, rgba(239,233,220,0.6) 0%, rgba(239,233,220,0.2) 60%, rgba(239,233,220,0) 61%), radial-gradient(50% 35% at 95% 70%, rgba(234,223,201,0.5) 0%, rgba(234,223,201,0.2) 55%, rgba(234,223,201,0) 56%), url(/bg.png)',
          backgroundSize: 'auto, auto, auto, cover',
          backgroundPosition: 'center, center, center, center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="absolute left-6 top-6">
        <BrandMark iconClassName="h-16 w-16 text-lg" titleClassName="text-3xl font-serif" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-xl rounded-[24px] border-2 border-primary bg-white/95 p-10 shadow-lg"
        >
          <div className="mb-4 flex justify-center">
            <BrandMark orientation="vertical" iconClassName="h-24 w-24 text-xl" titleClassName="text-2xl" />
          </div>
          <h1 className="mb-2 text-center text-3xl font-semibold text-slate-900">Recuperar senha</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Informe o e-mail da sua conta para receber um link de redefinição.
          </p>

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                Se o e-mail estiver cadastrado, enviaremos instruções em instantes.
              </div>
              <Link href="/login" className="block text-center text-sm underline text-primary">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <label className="mb-4 block text-sm font-medium text-gray-700">
                E-mail
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
                  placeholder="seu@email.com"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Enviando...' : 'Enviar link'}
              </button>
              <p className="mt-4 text-center text-xs text-gray-500">
                <Link href="/login" className="underline">
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

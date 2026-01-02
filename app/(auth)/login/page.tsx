'use client';

import { FormEvent, useState } from 'react';

import { BrandMark } from '../../../components/BrandMark';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(formState.email, formState.password);
    } catch (e) {
      setError('Credenciais inválidas. Verifique e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || loading;

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

      <a
        href="#"
        className="absolute right-6 top-6 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm hover:text-white"
      >
        Ajuda
      </a>

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-xl rounded-[24px] border-2 border-primary bg-white/95 p-10 shadow-lg"
        >
          <div className="mb-4 flex justify-center">
            <BrandMark orientation="vertical" iconClassName="h-24 w-24 text-xl" titleClassName="text-2xl" />
          </div>
          <h1 className="mb-3 text-center text-3xl font-semibold text-slate-900">Bem-vindo ao MVP CRM</h1>
          <p className="mb-8 text-center text-base text-gray-600">
            Faça login para acompanhar leads, clientes e integrações do seu MVP.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, email: event.target.value }))
              }
              className="w-full rounded-full border-2 border-primary bg-white px-6 py-3 text-slate-900 placeholder:font-semibold placeholder:text-primary focus:outline-none caret-primary"
              placeholder="E-mail"
            />

            <input
              type="password"
              required
              value={formState.password}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-full border-2 border-primary bg-white px-6 py-3 text-slate-900 placeholder:font-semibold placeholder:text-primary focus:outline-none caret-primary"
              placeholder="Senha"
            />
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="mt-6 w-full rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <a
            href="/register"
            className="mt-3 block w-full rounded-full border-2 border-primary px-6 py-3 text-center font-semibold text-primary transition hover:bg-primary/10"
          >
            Criar conta
          </a>

          <p className="mt-6 text-center text-sm text-gray-500">
            Esqueceu a senha?{' '}
            <a href="/forgot-password" className="underline text-primary">
              Clique aqui.
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BrandMark } from '../../../components/BrandMark';
import api from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError('As senhas nao conferem.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError('Nao foi possivel criar a conta. Verifique os dados.');
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
          <h1 className="mb-2 text-center text-3xl font-semibold text-slate-900">Criar conta</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Cadastre a sua empresa. Depois de acessar o CRM, cadastre os vendedores no menu apropriado.
          </p>

          {done ? (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
              Conta criada com sucesso. Redirecionando para o login...
            </div>
          ) : (
            error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )
          )}

          <label className="mb-4 block text-sm font-medium text-gray-700">
            Nome completo
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
              placeholder="Ex.: Clinica Exemplo"
            />
          </label>

          <label className="mb-4 block text-sm font-medium text-gray-700">
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
              placeholder="empresa@exemplo.com"
            />
          </label>

          <label className="mb-4 block text-sm font-medium text-gray-700">
            Senha
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
              placeholder="********"
            />
          </label>

          <label className="mb-6 block text-sm font-medium text-gray-700">
            Confirmar senha
            <input
              type="password"
              required
              value={form.confirm}
              onChange={(event) => setForm((prev) => ({ ...prev, confirm: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
              placeholder="********"
            />
          </label>

          {!done && (
            <>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Criando...' : 'Criar conta'}
              </button>

              <p className="mt-4 text-center text-xs text-gray-500">
                Ja tem conta?{' '}
                <Link className="underline" href="/login">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

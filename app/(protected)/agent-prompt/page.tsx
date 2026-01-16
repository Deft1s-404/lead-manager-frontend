'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

interface AgentPromptResponse {
  prompt: string;
}

export default function AgentPromptPage() {
  const router = useRouter();
  const { seller, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [savedPrompt, setSavedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (seller) {
      router.replace('/dashboard');
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    api
      .get<AgentPromptResponse>('/agent-prompt')
      .then((response) => {
        if (!isMounted) return;
        setPrompt(response.data.prompt ?? '');
        setSavedPrompt(response.data.prompt ?? '');
      })
      .catch((err) => {
        console.error(err);
        if (!isMounted) return;
        setError('Nao foi possivel carregar o prompt do agente.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, seller, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await api.put<AgentPromptResponse>('/agent-prompt', { prompt });
      setPrompt(response.data.prompt ?? '');
      setSavedPrompt(response.data.prompt ?? '');
      setSuccessMessage('Prompt salvo com sucesso.');
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel salvar o prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty = prompt !== savedPrompt;

  if (authLoading || seller) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Prompt do agente</h1>
        <p className="text-sm text-gray-500">
          Configure o prompt do seu agente de IA para personalizar o atendimento.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Prompt
          <textarea
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            rows={12}
            placeholder="Descreva o comportamento desejado do agente..."
            className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow focus:border-primary focus:outline-none"
            disabled={isLoading}
          />
        </label>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{prompt.length} caracteres</span>
          <button
            type="submit"
            disabled={isLoading || isSaving || !isDirty}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isSaving ? 'Salvando...' : 'Salvar prompt'}
          </button>
        </div>
      </form>
    </div>
  );
}

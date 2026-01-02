'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Client } from '../../../types';

interface ClientsApiResponse {
  data: Client[];
  total: number;
  page: number;
  limit: number;
}

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  source: string;
  status: string;
  tags: string;
  notes: string;
  age: string;
  country: string;
  birthDate: string;
  language: string;
  anamnesis: string;
}

const emptyForm: ClientFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  source: '',
  status: 'NEW',
  tags: '',
  notes: '',
  age: '',
  country: '',
  birthDate: '',
  language: '',
  anamnesis: ''
};

const PAGE_SIZE = 50;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lastFetchedSearch, setLastFetchedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<ClientFormState>({ ...emptyForm });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientPendingDeletion, setClientPendingDeletion] = useState<Client | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const latestRequestRef = useRef(0);
  const hasFetchedInitial = useRef(false);
  const isSearchDirty = search !== lastFetchedSearch;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const effectivePage = Math.min(currentPage, totalPages);
  const showingFrom = total === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(effectivePage * PAGE_SIZE, total);
  const canGoPrevious = effectivePage > 1;
  const canGoNext = effectivePage < totalPages && total > 0;
  const hasAnamnesisResponses = formState.anamnesis.trim().length > 0;

  const fetchClients = useCallback(
    async (options?: { page?: number; searchTerm?: string }) => {
      const pageToFetch = options?.page ?? currentPage;
      const searchTerm = options?.searchTerm ?? lastFetchedSearch;
      const previousPage = currentPage;
      if (pageToFetch !== currentPage) {
        setCurrentPage(pageToFetch);
      }
      const requestId = ++latestRequestRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<ClientsApiResponse>('/clients', {
          params: {
            search: searchTerm || undefined,
            page: pageToFetch,
            limit: PAGE_SIZE
          }
        });
        if (requestId !== latestRequestRef.current) {
          return;
        }
        const enrichedClients = response.data.data.map((client) => ({
          ...client,
          anamnesisResponses: client.anamnesisResponses ?? null
        }));
        setClients(enrichedClients);
        setTotal(response.data.total);
        setCurrentPage(response.data.page ?? pageToFetch);
        setLastFetchedSearch(searchTerm);
      } catch (e) {
        console.error(e);
        if (requestId === latestRequestRef.current) {
          setError('Nao foi possivel carregar os clientes.');
          if (pageToFetch !== previousPage) {
            setCurrentPage(previousPage);
          }
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [currentPage, lastFetchedSearch]
  );

  useEffect(() => {
    if (hasFetchedInitial.current) {
      return;
    }
    hasFetchedInitial.current = true;
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (!isSearchDirty) {
      return;
    }
    fetchClients({ page: 1, searchTerm: search });
  }, [fetchClients, isSearchDirty, search]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    fetchClients({ page, searchTerm: lastFetchedSearch });
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) {
      return;
    }
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (!canGoNext) {
      return;
    }
    handlePageChange(currentPage + 1);
  };

  const handleRefresh = () => {
    const nextPage = isSearchDirty ? 1 : effectivePage;
    fetchClients({
      page: nextPage,
      searchTerm: isSearchDirty ? search : lastFetchedSearch
    });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setError(null);
    setIsLoading(true);
  };

  const resetForm = () => setFormState({ ...emptyForm });

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClientId(client.id);
      setFormState({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
        source: client.source ?? '',
        status: client.status,
        tags: client.tags.join(', '),
        notes: client.notes ?? '',
        age: client.age !== undefined && client.age !== null ? String(client.age) : '',
        country: client.country ?? '',
        birthDate: client.birthDate ? client.birthDate.slice(0, 10) : '',
        language: client.language ?? '',
        anamnesis: client.anamnesisResponses ? JSON.stringify(client.anamnesisResponses, null, 2) : ''
      });
    } else {
      setEditingClientId(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let parsedAnamnesis: Record<string, unknown> | undefined;
    if (formState.anamnesis.trim()) {
      try {
        parsedAnamnesis = JSON.parse(formState.anamnesis);
      } catch (jsonError) {
        console.error(jsonError);
        setError('JSON da anamnese invalido. Confira o formato antes de salvar.');
        return;
      }
    }

    const payload = {
      name: formState.name,
      email: formState.email || undefined,
      phone: formState.phone || undefined,
      address: formState.address || undefined,
      source: formState.source || undefined,
      status: formState.status,
      notes: formState.notes || undefined,
      age: formState.age ? Number(formState.age) : undefined,
      country: formState.country || undefined,
      birthDate: formState.birthDate || undefined,
      language: formState.language || undefined,
      anamnesisResponses: parsedAnamnesis,
      tags: formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    };

    try {
      if (editingClientId) {
        await api.patch(`/clients/${editingClientId}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      setIsModalOpen(false);
      resetForm();
      await fetchClients({ page: currentPage, searchTerm: lastFetchedSearch });
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar cliente. Tente novamente.');
    }
  };

  const requestDeleteClient = (client: Client) => {
    setClientPendingDeletion(client);
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientPendingDeletion) {
      return;
    }
    try {
      setIsDeletingClient(true);
      await api.delete(`/clients/${clientPendingDeletion.id}`);
      setClientPendingDeletion(null);
      await fetchClients({ page: currentPage, searchTerm: lastFetchedSearch });
    } catch (e) {
      console.error(e);
      setError('Erro ao remover cliente.');
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleCancelDeleteClient = () => {
    if (isDeletingClient) {
      return;
    }
    setClientPendingDeletion(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-gray-500">Gerencie a base de clientes e leads ativos.</p>
        </div>

        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Buscar cliente..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleRefresh();
              }
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Origem</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Carregando clientes...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{client.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>{client.email}</div>
                    <div className="text-gray-400">{client.phone}</div>
                    {client.address && <div className="text-gray-400">{client.address}</div>}
                  </td>
                  <td className="px-6 py-4">{client.source ?? '--'}</td>
                  <td className="px-6 py-4 font-semibold text-primary">{client.score}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={client.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Visualizar
                      </Link>
                      <button
                        onClick={() => openModal(client)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => requestDeleteClient(client)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:text-sm">
        <p>
          {isLoading
            ? 'Carregando clientes...'
            : total > 0
            ? `Exibindo ${showingFrom}-${showingTo} de ${total} registros`
            : lastFetchedSearch
            ? `Nenhum resultado para "${lastFetchedSearch}".`
            : 'Nenhum registro encontrado'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={!canGoPrevious || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="font-medium text-gray-600">
            Pagina {total > 0 ? effectivePage : 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!canGoNext || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </div>

      <Modal
        title={editingClientId ? 'Editar cliente' : 'Novo cliente'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            Nome
            <input
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            E-mail
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Telefone
            <input
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Endereço
            <input
              value={formState.address}
              onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Origem
            <input
              value={formState.source}
              onChange={(event) => setFormState((prev) => ({ ...prev, source: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Status
            <select
              value={formState.status}
              onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="NEW">Novo</option>
              <option value="ACTIVE">Ativo</option>
              <option value="VIP">VIP</option>
              <option value="INACTIVE">Inativo</option>
              <option value="LOST">Perdido</option>
            </select>
          </label>

          <label className="block text-sm">
            Idade
            <input
              type="number"
              min={0}
              value={formState.age}
              onChange={(event) => setFormState((prev) => ({ ...prev, age: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Pais
            <input
              value={formState.country}
              onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Data de nascimento
            <input
              type="date"
              value={formState.birthDate}
              onChange={(event) => setFormState((prev) => ({ ...prev, birthDate: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Idioma
            <input
              value={formState.language}
              onChange={(event) => setFormState((prev) => ({ ...prev, language: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            Tags (separadas por virgula)
            <input
              value={formState.tags}
              onChange={(event) => setFormState((prev) => ({ ...prev, tags: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-4">
            <span className="block text-sm font-medium text-gray-700">Ficha de anamnese</span>
            <p className="mt-1 text-xs text-gray-500">
              {editingClientId
                ? hasAnamnesisResponses
                  ? 'Uma ficha de anamnese ja foi registrada. Utilize o botao abaixo para revisar ou atualizar.'
                  : 'Nenhuma ficha cadastrada para este cliente. Clique no botao para preencher a primeira ficha.'
                : 'Salve o cliente primeiro para liberar o preenchimento da ficha de anamnese.'}
            </p>
            {editingClientId ? (
              <Link
                href={`/clients/${editingClientId}/anamnesis`}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Preencher anamnese
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-3 inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500"
              >
                Preencher anamnese
              </button>
            )}
          </div>

          <label className="block text-sm md:col-span-2">
            Observacoes
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              rows={3}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={clientPendingDeletion !== null}
        title="Remover cliente"
        description={
          clientPendingDeletion ? (
            <p>
              Deseja realmente remover{' '}
              <span className="font-semibold text-slate-900">{clientPendingDeletion.name}</span>? Essa acao nao pode ser
              desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeletingClient}
        onCancel={handleCancelDeleteClient}
        onConfirm={handleConfirmDeleteClient}
      />
    </div>
  );
}


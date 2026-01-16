'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { Seller } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';

interface SellersResponse {
  data: Seller[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 50;

export default function SellersPage() {
  const router = useRouter();
  const { seller: loggedSeller, loading: authLoading } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lastFetchedSearch, setLastFetchedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    contactNumber: ''
  });
  const [editingSellerId, setEditingSellerId] = useState<string | null>(null);
  const [sellerPendingDeletion, setSellerPendingDeletion] = useState<Seller | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const latestRequestRef = useRef(0);
  const hasFetchedInitial = useRef(false);

  const isSearchDirty = search !== lastFetchedSearch;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const effectivePage = Math.min(currentPage, totalPages);
  const showingFrom = total === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(effectivePage * PAGE_SIZE, total);
  const canGoPrevious = effectivePage > 1;
  const canGoNext = effectivePage < totalPages && total > 0;
  const hasFilters = Boolean(lastFetchedSearch);

  const fetchSellers = useCallback(
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
        const response = await api.get<SellersResponse>('/sellers', {
          params: {
            page: pageToFetch,
            limit: PAGE_SIZE,
            search: searchTerm || undefined
          }
        });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        setSellers(response.data.data);
        setTotal(response.data.total);
        setCurrentPage(response.data.page ?? pageToFetch);
        setLastFetchedSearch(searchTerm);
      } catch (err) {
        console.error(err);
        if (requestId === latestRequestRef.current) {
          setError('Nao foi possivel carregar os vendedores.');
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
    if (authLoading) {
      return;
    }
    if (loggedSeller) {
      router.replace('/dashboard');
      return;
    }
    if (hasFetchedInitial.current) {
      return;
    }
    hasFetchedInitial.current = true;
    fetchSellers();
  }, [authLoading, loggedSeller, fetchSellers, router]);

  useEffect(() => {
    if (!isSearchDirty) {
      return;
    }
    const delay = setTimeout(() => {
      fetchSellers({ page: 1, searchTerm: search });
    }, 300);

    return () => clearTimeout(delay);
  }, [fetchSellers, isSearchDirty, search]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setError(null);
    setIsLoading(true);
  };

  const handleRefresh = () => {
    fetchSellers({
      page: isSearchDirty ? 1 : effectivePage,
      searchTerm: isSearchDirty ? search : lastFetchedSearch
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setLastFetchedSearch('');
    fetchSellers({ page: 1, searchTerm: '' });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    fetchSellers({
      page,
      searchTerm: isSearchDirty ? search : lastFetchedSearch
    });
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

  const openModal = (seller?: Seller) => {
    if (seller) {
      setEditingSellerId(seller.id);
      setFormState({
        name: seller.name,
        email: seller.email ?? '',
        contactNumber: seller.contactNumber ?? ''
      });
    } else {
      setEditingSellerId(null);
      setFormState({
        name: '',
        email: '',
        contactNumber: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError(null);
      const payload = {
        name: formState.name,
        email: formState.email || undefined,
        contactNumber: formState.contactNumber || undefined
      };
      if (editingSellerId) {
        await api.patch(`/sellers/${editingSellerId}`, payload);
      } else {
        await api.post('/sellers', payload);
      }
      setIsModalOpen(false);
      await fetchSellers({
        page: editingSellerId ? currentPage : 1,
        searchTerm: isSearchDirty ? search : lastFetchedSearch
      });
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar vendedor.');
    }
  };

  const requestDeleteSeller = (seller: Seller) => {
    setSellerPendingDeletion(seller);
  };

  const handleConfirmDeleteSeller = async () => {
    if (!sellerPendingDeletion) {
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      await api.delete(`/sellers/${sellerPendingDeletion.id}`);
      setSellerPendingDeletion(null);
      await fetchSellers({
        page: currentPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch
      });
    } catch (err) {
      console.error(err);
      setError('Erro ao remover vendedor.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeleteSeller = () => {
    if (isDeleting) {
      return;
    }
    setSellerPendingDeletion(null);
  };

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '--';
    }
  };

  if (authLoading || loggedSeller) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Vendedores</h1>
          <p className="text-sm text-gray-500">
            Cadastre e organize os vendedores que auxiliam no atendimento comercial.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Novo vendedor
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[220px] text-xs font-semibold text-gray-600">
            Buscar vendedor
            <input
              type="search"
              placeholder="Nome ou email"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleRefresh();
                }
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Atualizar
            </button>
            <button
              onClick={handleClearFilters}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Cadastro</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Carregando vendedores...
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Nenhum vendedor encontrado.
                </td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{seller.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500">{seller.email ?? '--'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500">{seller.contactNumber ?? '--'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(seller.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(seller)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Atualizar
                      </button>
                      <button
                        onClick={() => requestDeleteSeller(seller)}
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
            ? 'Carregando vendedores...'
            : total > 0
            ? `Exibindo ${showingFrom}-${showingTo} de ${total} registros`
            : hasFilters
            ? 'Nenhum resultado encontrado para a busca aplicada.'
            : 'Nenhum registro encontrado.'}
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

      <Modal title={editingSellerId ? 'Atualizar vendedor' : 'Novo vendedor'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="text-sm">
            Nome
            <input
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome completo"
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Email
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="email@exemplo.com"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Numero de contato
            <input
              value={formState.contactNumber}
              onChange={(event) => setFormState((prev) => ({ ...prev, contactNumber: event.target.value }))}
              placeholder="WhatsApp ou telefone"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
          >
            Salvar
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={sellerPendingDeletion !== null}
        title="Remover vendedor"
        description={
          sellerPendingDeletion ? (
            <p>
              Deseja remover{' '}
              <span className="font-semibold text-slate-900">
                {sellerPendingDeletion.name || sellerPendingDeletion.email || 'este vendedor'}
              </span>
              ? Essa acao nao pode ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeleting}
        onCancel={handleCancelDeleteSeller}
        onConfirm={handleConfirmDeleteSeller}
      />
    </div>
  );
}

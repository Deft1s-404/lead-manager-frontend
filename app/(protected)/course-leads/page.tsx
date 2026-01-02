'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { CourseLead } from '../../../types';

interface CourseLeadsResponse {
  data: CourseLead[];
  total: number;
  page: number;
  limit: number;
}

interface CourseLeadFormState {
  nomeCompleto: string;
  telefone: string;
  pais: string;
  email: string;
  origem: string;
  nota: string;
}

const emptyForm: CourseLeadFormState = {
  nomeCompleto: '',
  telefone: '',
  pais: '',
  email: '',
  origem: 'formulario online clinica yance',
  nota: ''
};

const PAGE_SIZE = 50;

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

export default function CourseLeadsPage() {
  const [leads, setLeads] = useState<CourseLead[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lastFetchedSearch, setLastFetchedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<CourseLeadFormState>({ ...emptyForm });
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadPendingDeletion, setLeadPendingDeletion] = useState<CourseLead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
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

  const fetchLeads = useCallback(
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
        const response = await api.get<CourseLeadsResponse>('/course-leads', {
          params: {
            search: searchTerm || undefined,
            page: pageToFetch,
            limit: PAGE_SIZE
          }
        });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        setLeads(response.data.data);
        setTotal(response.data.total);
        setCurrentPage(response.data.page ?? pageToFetch);
        setLastFetchedSearch(searchTerm);
      } catch (e) {
        console.error(e);
        if (requestId === latestRequestRef.current) {
          setError('Nao foi possivel carregar os leads de curso.');
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
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!isSearchDirty) {
      return;
    }
    fetchLeads({ page: 1, searchTerm: search });
  }, [fetchLeads, isSearchDirty, search]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    fetchLeads({ page, searchTerm: lastFetchedSearch });
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
    fetchLeads({
      page: nextPage,
      searchTerm: isSearchDirty ? search : lastFetchedSearch
    });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setError(null);
    setIsLoading(true);
  };

  const openModal = (lead?: CourseLead) => {
    if (lead) {
      setEditingLeadId(lead.id);
      setFormState({
        nomeCompleto: lead.nomeCompleto,
        telefone: lead.telefone ?? '',
        pais: lead.pais ?? '',
        email: lead.email ?? '',
        origem: lead.origem ?? 'formulario online clinica yance',
        nota: lead.nota ?? ''
      });
    } else {
      setEditingLeadId(null);
      setFormState({ ...emptyForm });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLeadId(null);
    setFormState({ ...emptyForm });
  };

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      const payload = {
        nomeCompleto: formState.nomeCompleto.trim(),
        telefone: formState.telefone.trim() || undefined,
        pais: formState.pais.trim() || undefined,
        email: formState.email.trim() || undefined,
        origem: formState.origem.trim() || undefined,
        nota: formState.nota.trim() || undefined
      };

      if (!payload.nomeCompleto) {
        setError('O nome completo e obrigatorio.');
        return;
      }

      if (editingLeadId) {
        await api.patch(`/course-leads/${editingLeadId}`, payload);
      } else {
        await api.post('/course-leads', payload);
      }

      const nextPage = editingLeadId ? currentPage : 1;
      closeModal();
      await fetchLeads({
        page: nextPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar lead.');
    }
  };

  const requestDeleteLead = (lead: CourseLead) => {
    setLeadPendingDeletion(lead);
  };

  const handleCancelDeleteLead = () => {
    setLeadPendingDeletion(null);
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadPendingDeletion) {
      return;
    }
    try {
      setIsDeletingLead(true);
      setError(null);
      await api.delete(`/course-leads/${leadPendingDeletion.id}`);
      setLeadPendingDeletion(null);
      const nextPage = Math.min(currentPage, totalPages);
      await fetchLeads({
        page: nextPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch
      });
    } catch (e) {
      console.error(e);
      setError('Nao foi possivel remover o lead.');
    } finally {
      setIsDeletingLead(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Leads de Curso</h1>
          <p className="text-sm text-gray-500">Cadastre e organize leads de cursos e mentorias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Buscar por nome, email ou origem..."
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
            onClick={handleRefresh}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Atualizar
          </button>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo Lead
          </button>
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
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Origem</th>
              <th className="px-6 py-3">Pais</th>
              <th className="px-6 py-3">Nota</th>
              <th className="px-6 py-3">Criado em</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Carregando leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{lead.nomeCompleto}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>{lead.email ?? '--'}</div>
                    {lead.telefone && <div className="text-gray-400">{lead.telefone}</div>}
                  </td>
                  <td className="px-6 py-4">{lead.origem ?? 'formulario online clinica yance'}</td>
                  <td className="px-6 py-4">{lead.pais ?? '--'}</td>
                  <td className="px-6 py-4 max-w-sm text-gray-600">{lead.nota ?? '--'}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(lead.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(lead)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteLead(lead)}
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
            ? 'Carregando leads...'
            : total > 0
            ? `Exibindo ${showingFrom}-${showingTo} de ${total} registros`
            : hasFilters
            ? 'Nenhum resultado encontrado para os filtros aplicados.'
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

      <Modal title={editingLeadId ? 'Editar lead' : 'Novo lead'} isOpen={isModalOpen} onClose={closeModal}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm md:col-span-2">
            Nome completo
            <input
              type="text"
              name="nomeCompleto"
              value={formState.nomeCompleto}
              onChange={handleFormChange}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            E-mail
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Telefone
            <input
              type="text"
              name="telefone"
              value={formState.telefone}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Pais
            <input
              type="text"
              name="pais"
              value={formState.pais}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Origem
            <input
              type="text"
              name="origem"
              value={formState.origem}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            Nota
            <textarea
              name="nota"
              value={formState.nota}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              rows={3}
            />
          </label>

          {error && (
            <p className="md:col-span-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              {editingLeadId ? 'Salvar alteracoes' : 'Criar lead'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={leadPendingDeletion !== null}
        title="Remover lead"
        description={
          leadPendingDeletion ? (
            <p>
              Deseja realmente remover{' '}
              <span className="font-semibold text-slate-900">{leadPendingDeletion.nomeCompleto}</span>? Essa acao nao
              pode ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeletingLead}
        onCancel={handleCancelDeleteLead}
        onConfirm={handleConfirmDeleteLead}
      />
    </div>
  );
}

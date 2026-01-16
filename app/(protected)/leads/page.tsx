'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Lead } from '../../../types';

type LeadStageOption = 'NOVO' | 'AGENDOU_CALL' | 'ENTROU_CALL' | 'COMPROU' | 'NO_SHOW';

interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

const stageOptions: Array<{ value: LeadStageOption; label: string }> = [
  { value: 'NOVO', label: 'Novo' },
  { value: 'AGENDOU_CALL', label: 'Agendou uma call' },
  { value: 'ENTROU_CALL', label: 'Entrou na call' },
  { value: 'COMPROU', label: 'Comprou' },
  { value: 'NO_SHOW', label: 'Não compareceu' }
];

const PAGE_SIZE = 50;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lastFetchedSearch, setLastFetchedSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    contact: '',
    source: '',
    notes: '',
    stage: 'NOVO' as LeadStageOption
  });
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadPendingDeletion, setLeadPendingDeletion] = useState<Lead | null>(null);
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
  const hasFilters = Boolean(selectedStage || selectedSource || lastFetchedSearch);
  const fetchLeads = useCallback(
    async (options?: { page?: number; searchTerm?: string; stage?: string; source?: string }) => {
      const pageToFetch = options?.page ?? currentPage;
      const searchTerm = options?.searchTerm ?? lastFetchedSearch;
      const stage = options?.stage ?? selectedStage;
      const source = options?.source ?? selectedSource;
      const previousPage = currentPage;

      if (pageToFetch !== currentPage) {
        setCurrentPage(pageToFetch);
      }

      const requestId = ++latestRequestRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get<LeadsResponse>('/leads', {
          params: {
            search: searchTerm || undefined,
            stage: stage || undefined,
            source: source || undefined,
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
          setError('Nao foi possivel carregar os leads.');
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
    [currentPage, lastFetchedSearch, selectedSource, selectedStage]
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

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setError(null);
    setIsLoading(true);
  };

  const handleStageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const stage = event.target.value;
    setSelectedStage(stage);
    fetchLeads({
      page: 1,
      searchTerm: isSearchDirty ? search : lastFetchedSearch,
      stage,
      source: selectedSource
    });
  };

  const handleSourceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const source = event.target.value;
    setSelectedSource(source);
    fetchLeads({
      page: 1,
      searchTerm: isSearchDirty ? search : lastFetchedSearch,
      stage: selectedStage,
      source
    });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    fetchLeads({
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

  const handleRefresh = () => {
    const nextPage = isSearchDirty ? 1 : effectivePage;
    const searchTerm = isSearchDirty ? search : lastFetchedSearch;
    fetchLeads({
      page: nextPage,
      searchTerm,
      stage: selectedStage,
      source: selectedSource
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStage('');
    setSelectedSource('');
    setLastFetchedSearch('');
    fetchLeads({ page: 1, searchTerm: '', stage: '', source: '' });
  };

  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLeadId(lead.id);
      setFormState({
        name: lead.name ?? '',
        email: lead.email ?? '',
        contact: lead.contact ?? '',
        source: lead.source ?? '',
        notes: lead.notes ?? '',
        stage: (lead.stage as LeadStageOption) ?? 'NOVO'
      });
    } else {
      setEditingLeadId(null);
      setFormState({
        name: '',
        email: '',
        contact: '',
        source: '',
        notes: '',
        stage: 'NOVO'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError(null);
      if (editingLeadId) {
        await api.patch(`/leads/${editingLeadId}`, formState);
      } else {
        await api.post('/leads', formState);
      }
      setIsModalOpen(false);
      await fetchLeads({
        page: currentPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar lead.');
    }
  };

  const requestDeleteLead = (lead: Lead) => {
    setLeadPendingDeletion(lead);
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadPendingDeletion) {
      return;
    }
    try {
      setIsDeletingLead(true);
      setError(null);
      await api.delete(`/leads/${leadPendingDeletion.id}`);
      setLeadPendingDeletion(null);
      await fetchLeads({
        page: currentPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao remover lead.');
    } finally {
      setIsDeletingLead(false);
    }
  };

  const handleCancelDeleteLead = () => {
    if (isDeletingLead) {
      return;
    }
    setLeadPendingDeletion(null);
  };

  const handleExportCsv = async () => {
    try {
      setError(null);
      const searchTerm = isSearchDirty ? search : lastFetchedSearch;
      const response = await api.get('/leads/export', {
        params: {
          stage: selectedStage || undefined,
          source: selectedSource || undefined,
          search: searchTerm || undefined
        },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = (response.headers['content-disposition'] as string | undefined) ?? '';
      const match = /filename="?([^";]+)"?/i.exec(cd);
      a.href = url;
      a.download = match?.[1] ?? 'leads_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError('Erro ao exportar CSV.');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Leads e Funil</h1>
          <p className="text-sm text-gray-500">Controle o funil comercial e qualifique os leads.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Novo Lead
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[220px] text-xs font-semibold text-gray-600">
            Buscar lead ou origem
            <input
              type="search"
              placeholder="Nome, email ou origem"
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

          <label className="text-xs font-semibold text-gray-600">
            Estágio
            <select
              value={selectedStage}
              onChange={handleStageChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Todos os estágios</option>
              {stageOptions.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-600">
            Origem
            <select
              value={selectedSource}
              onChange={handleSourceChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Todas as origens</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="indicacao">Indicação</option>
              <option value="site">Site</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Atualizar
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Exportar CSV
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Origem</th>
              <th className="px-6 py-3">Cadastrado em</th>
              <th className="px-6 py-3">Notas</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{lead.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-gray-400">{lead.email ?? '--'}</p>
                    <p className="text-xs text-gray-400">{lead.contact ?? '--'}</p>
                  </td>
                  <td className="px-6 py-4">{lead.source ?? '--'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{lead.notes ?? '--'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={lead.stage} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(lead)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Atualizar
                      </button>
                      <button
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

      <Modal
        title={editingLeadId ? 'Atualizar lead' : 'Novo lead'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="text-sm">
            Nome
            <input
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome do lead"
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
            Contato
            <input
              value={formState.contact}
              onChange={(event) => setFormState((prev) => ({ ...prev, contact: event.target.value }))}
              placeholder="WhatsApp ou telefone"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Origem
            <select
              value={formState.source}
              onChange={(event) => setFormState((prev) => ({ ...prev, source: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Selecione a origem</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="indicacao">Indicacao</option>
              <option value="site">Site</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>

          <label className="text-sm">
            Status
            <select
              value={formState.stage}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, stage: event.target.value as LeadStageOption }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {stageOptions.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Notas
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              rows={3}
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
          >
            Salvar lead
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={leadPendingDeletion !== null}
        title="Remover lead"
        description={
          leadPendingDeletion ? (
            <p>
              Deseja realmente remover{' '}
              <span className="font-semibold text-slate-900">
                {leadPendingDeletion.name ?? leadPendingDeletion.email ?? 'este lead'}
              </span>
              ? Essa acao nao pode ser desfeita.
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

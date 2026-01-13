'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Appointment, Lead } from '../../../types';

type AppointmentStatusOption = 'AGENDADA' | 'NO_SHOW';

interface AppointmentsResponse {
  data: Appointment[];
  total: number;
  page: number;
  limit: number;
}

interface LeadsResponse {
  data: Lead[];
}

const statusOptions: AppointmentStatusOption[] = ['AGENDADA', 'NO_SHOW'];
const statusLabels: Record<AppointmentStatusOption, string> = {
  AGENDADA: 'Agendada',
  NO_SHOW: 'Nao compareceu'
};
const PAGE_SIZE = 20;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [isLeadsLoading, setIsLeadsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    leadId: '',
    start: '',
    end: '',
    status: 'AGENDADA' as AppointmentStatusOption,
    meetLink: ''
  });
  const [appointmentPendingDeletion, setAppointmentPendingDeletion] = useState<Appointment | null>(null);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);
  const hasFetchedInitial = useRef(false);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const effectivePage = Math.min(currentPage, totalPages);
  const showingFrom = total === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(effectivePage * PAGE_SIZE, total);
  const canGoPrevious = effectivePage > 1;
  const canGoNext = effectivePage < totalPages && total > 0;
  const hasFilters = Boolean(selectedStatus);

  const fetchAppointments = useCallback(
    async (options?: { page?: number; status?: string }) => {
      const pageToFetch = options?.page ?? currentPage;
      const statusFilter = options?.status ?? selectedStatus;
      const previousPage = currentPage;

      if (pageToFetch !== currentPage) {
        setCurrentPage(pageToFetch);
      }

      try {
        setIsLoading(true);
        setError(null);
        const params: Record<string, unknown> = {
          limit: PAGE_SIZE,
          page: pageToFetch
        };
        if (statusFilter) {
          params.status = statusFilter;
        }
        const response = await api.get<AppointmentsResponse>('/appointments', { params });
        setAppointments(response.data.data);
        setTotal(response.data.total);
        setCurrentPage(response.data.page ?? pageToFetch);
      } catch (e) {
        console.error(e);
        setError('Nao foi possivel carregar as calls.');
        setCurrentPage(previousPage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, selectedStatus]
  );

  const fetchLeads = async (searchTerm?: string) => {
    try {
      setIsLeadsLoading(true);
      const response = await api.get<LeadsResponse>('/leads', {
        params: { limit: 50, search: searchTerm || undefined }
      });
      setLeads(response.data.data);
    } catch (e) {
      console.error('Erro ao buscar leads', e);
      setLeads([]);
    } finally {
      setIsLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedInitial.current) {
      return;
    }
    hasFetchedInitial.current = true;
    fetchAppointments();
    fetchLeads();
  }, [fetchAppointments]);

  const isoToLocalInput = (iso: string) => {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const openModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointmentId(appointment.id);
      setFormState({
        leadId: appointment.leadId,
        start: isoToLocalInput(appointment.start),
        end: isoToLocalInput(appointment.end),
        status: appointment.status as AppointmentStatusOption,
        meetLink: appointment.meetLink ?? ''
      });
    } else {
      setEditingAppointmentId(null);
      setFormState({
        leadId: '',
        start: '',
        end: '',
        status: 'AGENDADA',
        meetLink: ''
      });
    }
    void fetchLeads(leadSearch.trim() || undefined);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      leadId: formState.leadId,
      start: new Date(formState.start).toISOString(),
      end: new Date(formState.end).toISOString(),
      status: formState.status,
      meetLink: formState.meetLink || null
    };

    try {
      if (editingAppointmentId) {
        await api.patch(`/appointments/${editingAppointmentId}`, payload);
      } else {
        await api.post('/appointments', payload);
      }
      setIsModalOpen(false);
      await fetchAppointments({ page: currentPage, status: selectedStatus });
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar call.');
    }
  };

  const requestDeleteAppointment = (appointment: Appointment) => {
    setAppointmentPendingDeletion(appointment);
  };

  const handleConfirmDeleteAppointment = async () => {
    if (!appointmentPendingDeletion) {
      return;
    }
    try {
      setIsDeletingAppointment(true);
      await api.delete(`/appointments/${appointmentPendingDeletion.id}`);
      setAppointmentPendingDeletion(null);
      await fetchAppointments({ page: currentPage, status: selectedStatus });
    } catch (e) {
      console.error(e);
      setError('Erro ao remover call.');
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  const handleCancelDeleteAppointment = () => {
    if (isDeletingAppointment) {
      return;
    }
    setAppointmentPendingDeletion(null);
  };

  const handleLeadSearch = async () => {
    await fetchLeads(leadSearch.trim() || undefined);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    fetchAppointments({ page });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Video chamadas</h1>
          <p className="text-sm text-gray-500">Agende e acompanhe as chamadas dos leads.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedStatus}
            onChange={(event) => {
              const status = event.target.value;
              setSelectedStatus(status);
              fetchAppointments({ page: 1, status });
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Todos os status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Nova call
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
              <th className="px-6 py-3">Lead</th>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Inicio</th>
              <th className="px-6 py-3">Fim</th>
              <th className="px-6 py-3">Link</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                  Nenhuma call encontrada.
                </td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{appointment.lead.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-gray-400">{appointment.lead.email ?? '--'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {appointment.lead.contact ?? '--'}
                  </td>
                  <td className="px-6 py-4">{formatDateTime(appointment.start)}</td>
                  <td className="px-6 py-4">{formatDateTime(appointment.end)}</td>
                  <td className="px-6 py-4">
                    {appointment.meetLink ? (
                      <a
                        href={appointment.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Abrir link
                      </a>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge value={appointment.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(appointment)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Atualizar
                      </button>
                      <button
                        onClick={() => requestDeleteAppointment(appointment)}
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
            ? 'Carregando chamadas...'
            : total > 0
            ? `Exibindo ${showingFrom}-${showingTo} de ${total} chamadas`
            : hasFilters
            ? 'Nenhuma chamada encontrada para os filtros aplicados.'
            : 'Nenhuma chamada registrada.'}
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
        title={editingAppointmentId ? 'Atualizar call' : 'Nova call'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2 text-sm">
            <label className="block">
              Buscar lead
              <div className="mt-1 flex gap-2">
                <input
                  type="search"
                  value={leadSearch}
                  onChange={(event) => setLeadSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleLeadSearch();
                    }
                  }}
                  placeholder="Digite o nome ou contato"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleLeadSearch}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Buscar
                </button>
              </div>
            </label>

            <label className="block">
              Lead
              <select
                required
                value={formState.leadId}
                onChange={(event) => setFormState((prev) => ({ ...prev, leadId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um lead</option>
                {isLeadsLoading ? (
                  <option disabled>Carregando leads...</option>
                ) : leads.length === 0 ? (
                  <option disabled>Nenhum lead encontrado</option>
                ) : (
                  leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name ?? lead.email ?? 'Lead sem nome'}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <label className="text-sm">
            Link da call (Google Meet)
            <input
              value={formState.meetLink}
              onChange={(event) => setFormState((prev) => ({ ...prev, meetLink: event.target.value }))}
              placeholder="https://meet.google.com/..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Inicio
            <input
              required
              type="datetime-local"
              value={formState.start}
              onChange={(event) => setFormState((prev) => ({ ...prev, start: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Fim
            <input
              required
              type="datetime-local"
              value={formState.end}
              onChange={(event) => setFormState((prev) => ({ ...prev, end: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm md:col-span-2">
            Status
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, status: event.target.value as AppointmentStatusOption }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
            >
              Salvar call
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={appointmentPendingDeletion !== null}
        title="Remover call"
        description={
          appointmentPendingDeletion ? (
            <p>
              Deseja realmente remover a call de{' '}
              <span className="font-semibold text-slate-900">
                {appointmentPendingDeletion.lead.name ??
                  appointmentPendingDeletion.lead.email ??
                  'lead'}
              </span>
              ? Essa acao nao pode ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeletingAppointment}
        onCancel={handleCancelDeleteAppointment}
        onConfirm={handleConfirmDeleteAppointment}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { MetricCard } from '../../../components/MetricCard';
import api from '../../../lib/api';
import { AppointmentsReport, FunnelReport } from '../../../types';

interface ReportFilters {
  start?: string;
  end?: string;
}

export default function ReportsPage() {
  const [funnelReport, setFunnelReport] = useState<FunnelReport | null>(null);
  const [appointmentsReport, setAppointmentsReport] = useState<AppointmentsReport | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const filtersRef = useRef(filters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchReports = useCallback(async (customFilters: ReportFilters = filtersRef.current) => {
    try {
      setLoading(true);
      setError(null);
      const [funnelRes, appointmentsRes] = await Promise.all([
        api.get<FunnelReport>('/reports/funnel', { params: customFilters }),
        api.get<AppointmentsReport>('/reports/appointments', { params: customFilters })
      ]);

      setFunnelReport(funnelRes.data);
      setAppointmentsReport(appointmentsRes.data);
    } catch (e) {
      console.error(e);
      setError('Nao foi possivel carregar os relatorios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    filtersRef.current = next;
  };

  const totalLeads = funnelReport?.counts?.lead_created ?? 0;
  const conversionRate = funnelReport?.conversionRate ?? 0;
  const bookedCalls = funnelReport?.counts?.appointment_booked ?? 0;
  const agendedCalls = appointmentsReport?.byStatus?.AGENDADA ?? 0;
  const weeklySeries = appointmentsReport?.byWeek ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Relatorios e metricas</h1>
          <p className="text-sm text-gray-500">
            Acompanhe o funil de leads e a cadencia das videochamadas.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de leads" value={totalLeads} />
        <MetricCard label="Calls agendadas" value={bookedCalls} />
        <MetricCard label="Calls confirmadas" value={agendedCalls} />
        <MetricCard label="Taxa de conversao" value={`${conversionRate}%`} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtro de periodo</h2>
            <p className="text-xs text-gray-500">Use um intervalo para refinar os relatorios.</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex flex-col">
              <span className="text-xs text-gray-400">Inicio</span>
              <input
                type="date"
                value={filters.start ?? ''}
                onChange={(event) => handleFilterChange('start', event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-gray-400">Fim</span>
              <input
                type="date"
                value={filters.end ?? ''}
                onChange={(event) => handleFilterChange('end', event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <button
              onClick={() => fetchReports(filters)}
              className="self-end rounded-lg border border-gray-200 px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {loading && <div className="text-sm text-gray-500">Carregando relatorios...</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Calls por semana</h2>
          <div className="mt-4 h-72 w-full">
            {weeklySeries.length === 0 ? (
              <p className="text-sm text-gray-500">Sem chamadas registradas para o periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#d4b26e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Calls por status</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {appointmentsReport && Object.keys(appointmentsReport.byStatus).length > 0 ? (
              Object.entries(appointmentsReport.byStatus).map(([status, total]) => (
                <div key={status} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <p className="font-semibold capitalize text-gray-600">{status.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="text-lg font-bold text-primary">{total}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Sem informacoes de status para o intervalo.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Detalhe do funil</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {funnelReport ? (
            Object.entries(funnelReport.counts).map(([stage, count]) => (
              <div key={stage} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">{stage.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{count}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Sem dados de funil.</p>
          )}
        </div>
      </div>
    </div>
  );
}

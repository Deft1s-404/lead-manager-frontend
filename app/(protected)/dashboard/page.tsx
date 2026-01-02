'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import api from '../../../lib/api';
import { MetricCard } from '../../../components/MetricCard';
import { Loading } from '../../../components/Loading';
import { AppointmentsReport, FunnelReport } from '../../../types';

interface LeadsByOrigin {
  label: string;
  total: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnelReport, setFunnelReport] = useState<FunnelReport | null>(null);
  const [appointmentsReport, setAppointmentsReport] = useState<AppointmentsReport | null>(null);
  const [leadsByOrigin, setLeadsByOrigin] = useState<LeadsByOrigin[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [funnelRes, appointmentsRes, leadsRes] = await Promise.all([
          api.get<FunnelReport>('/reports/funnel'),
          api.get<AppointmentsReport>('/reports/appointments'),
          api.get<{ data: { source?: string | null }[] }>('/leads', { params: { limit: 100 } })
        ]);

        setFunnelReport(funnelRes.data);
        setAppointmentsReport(appointmentsRes.data);

        const originsMap = leadsRes.data.data.reduce<Record<string, number>>((acc, lead) => {
          const origin = lead.source ?? 'Nao informado';
          acc[origin] = (acc[origin] ?? 0) + 1;
          return acc;
        }, {});

        setLeadsByOrigin(
          Object.entries(originsMap)
            .map(([label, total]) => ({ label, total }))
            .sort((a, b) => b.total - a.total)
        );
      } catch (e) {
        console.error(e);
        setError('Nao foi possivel carregar os dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const conversionRate = funnelReport?.conversionRate ?? 0;
  const leadsCount = funnelReport?.counts?.lead_created ?? 0;
  const appointmentsCount = funnelReport?.counts?.appointment_booked ?? 0;
  const agendedCalls = appointmentsReport?.byStatus?.AGENDADA ?? 0;

  const topOrigins = useMemo(() => leadsByOrigin.slice(0, 4), [leadsByOrigin]);
  const weeklySeries = appointmentsReport?.byWeek ?? [];
  const funnelBreakdown = useMemo(() => {
    if (!funnelReport) return [];
    return Object.entries(funnelReport.counts).map(([stage, total]) => ({
      label: stage.replace(/_/g, ' '),
      total
    }));
  }, [funnelReport]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-slate-900">Visao Geral</h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leads totais" value={leadsCount} helper="Novos contatos no funil" />
        <MetricCard label="Calls agendadas" value={appointmentsCount} helper="Leads com call marcada" />
        <MetricCard label="Calls confirmadas" value={agendedCalls} helper="Status agendada" />
        <MetricCard
          label="Taxa de conversao"
          value={`${conversionRate}%`}
          helper="Leads convertidos em call"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Leads por origem</h2>
          {topOrigins.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Sem dados suficientes para o periodo.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topOrigins.map((origin) => (
                <li key={origin.label} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600">{origin.label}</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {origin.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Distribuicao do funil</h2>
          {funnelBreakdown.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Nenhum dado de funil registrado.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {funnelBreakdown.map((stage) => (
                <div key={stage.label} className="flex items-center justify-between text-sm">
                  <span className="uppercase tracking-wide text-gray-500">{stage.label}</span>
                  <span className="font-semibold text-slate-900">{stage.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Calls por semana</h2>
        <div className="mt-4 h-64 w-full">
          {weeklySeries.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma call registrada nesse periodo.</p>
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
            <p className="text-sm text-gray-500">Sem informacoes de status.</p>
          )}
        </div>
      </div>
    </div>
  );
}

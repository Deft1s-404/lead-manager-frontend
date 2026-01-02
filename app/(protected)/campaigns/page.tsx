'use client';

import { FormEvent, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Campaign, CampaignLog } from '../../../types';

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type CampaignStatusOption = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface CampaignsResponse {
  data: (Campaign & { logs: CampaignLog[] })[];
  total: number;
}

const statusOptions: CampaignStatusOption[] = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED'
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { logs: CampaignLog[] })[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    channel: '',
    message: '',
    imageUrl: '',
    status: 'DRAFT',
    scheduledAt: ''
  });
  const [campaignPendingDeletion, setCampaignPendingDeletion] =
    useState<(Campaign & { logs: CampaignLog[] }) | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<CampaignsResponse>('/campaigns', { params: { limit: 100 } });
      setCampaigns(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar as campanhas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const openModal = (campaign?: Campaign & { logs: CampaignLog[] }) => {
    if (campaign) {
      setEditingCampaignId(campaign.id);
      setFormState({
        name: campaign.name,
        channel: campaign.channel,
        message: campaign.message,
        imageUrl: campaign.imageUrl ?? '',
        status: campaign.status,
        scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : ''
      });
    } else {
      setEditingCampaignId(null);
      setFormState({
        name: '',
        channel: '',
        message: '',
        imageUrl: '',
        status: 'DRAFT',
        scheduledAt: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    try {
      const [file] = Array.from(fileList);
      const dataUrl = await readFileAsDataUrl(file);
      setFormState((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (uploadError) {
      console.error(uploadError);
      setError('Nao foi possivel ler a imagem selecionada.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      ...formState,
      imageUrl: formState.imageUrl || null,
      scheduledAt: formState.scheduledAt ? new Date(formState.scheduledAt).toISOString() : null
    };

    try {
      if (editingCampaignId) {
        await api.patch(`/campaigns/${editingCampaignId}`, payload);
      } else {
        await api.post('/campaigns', payload);
      }
      setIsModalOpen(false);
      await fetchCampaigns();
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar campanha.');
    }
  };

  const handleSend = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/send`);
      await fetchCampaigns();
    } catch (e) {
      console.error(e);
      setError('Não foi possível enviar a campanha.');
    }
  };

  const requestDeleteCampaign = (campaign: Campaign & { logs: CampaignLog[] }) => {
    setCampaignPendingDeletion(campaign);
  };

  const handleConfirmDeleteCampaign = async () => {
    if (!campaignPendingDeletion) {
      return;
    }
    try {
      setIsDeletingCampaign(true);
      await api.delete(`/campaigns/${campaignPendingDeletion.id}`);
      setCampaignPendingDeletion(null);
      await fetchCampaigns();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover campanha.');
    } finally {
      setIsDeletingCampaign(false);
    }
  };

  const handleCancelDeleteCampaign = () => {
    if (isDeletingCampaign) {
      return;
    }
    setCampaignPendingDeletion(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Campanhas</h1>
          <p className="text-sm text-gray-500">Organize disparos promocionais e acompanhe logs.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Nova campanha
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow">
            Carregando...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow">
            Nenhuma campanha cadastrada.
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{campaign.name}</h2>
                  <p className="text-sm text-gray-500">
                    Canal: <span className="font-semibold text-gray-700">{campaign.channel}</span>
                  </p>
                  {campaign.scheduledAt && (
                    <p className="text-xs text-gray-400">
                      Agendado para:{' '}
                      {new Date(campaign.scheduledAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <StatusBadge value={campaign.status} />
                  <button
                    onClick={() => handleSend(campaign.id)}
                    className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => openModal(campaign)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => requestDeleteCampaign(campaign)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-700">{campaign.message}</p>

              {campaign.logs && campaign.logs.length > 0 && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-600">Logs de envio</h3>
                  <ul className="mt-2 space-y-2 text-xs text-gray-500">
                    {campaign.logs.map((log) => (
                      <li key={log.id} className="flex justify-between">
                        <span>{log.message}</span>
                        <span>
                          {new Date(log.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-400">Total de campanhas: {total}</p>

      <Modal
        title={editingCampaignId ? 'Editar campanha' : 'Nova campanha'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="text-sm">
            Nome
            <input
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Canal
            <input
              required
              value={formState.channel}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, channel: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Status
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, status: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Agendamento
            <input
              type="datetime-local"
              value={formState.scheduledAt}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, scheduledAt: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Mensagem
            <textarea
              required
              value={formState.message}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, message: event.target.value }))
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Imagem
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImageUpload(event.target.files)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          {formState.imageUrl && (
            <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <img
                src={formState.imageUrl}
                alt="Imagem da campanha selecionada"
                className="h-16 w-16 rounded object-cover"
              />
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Uma imagem sera enviada com a campanha.</p>
                <button
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, imageUrl: '' }))}
                  className="text-xs font-semibold text-red-600 transition hover:underline"
                >
                  Remover imagem
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
          >
            Salvar campanha
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={campaignPendingDeletion !== null}
        title="Remover campanha"
        description={
          campaignPendingDeletion ? (
            <p>
              Deseja realmente remover a campanha{' '}
              <span className="font-semibold text-slate-900">{campaignPendingDeletion.name}</span>? Essa acao nao pode
              ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeletingCampaign}
        onCancel={handleCancelDeleteCampaign}
        onConfirm={handleConfirmDeleteCampaign}
      />
    </div>
  );
}

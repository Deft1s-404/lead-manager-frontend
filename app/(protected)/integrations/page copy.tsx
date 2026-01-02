'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

const normalizeScopes = (value?: string) =>
  value
    ?.split(/[,\s]+/)
    .filter(Boolean)
    .join(' ') ?? 'https://www.googleapis.com/auth/calendar';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const fallbackRedirectUri =
  process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? 'http://localhost:3001/api/google/oauth/callback';

type GoogleOAuthStateResponse = {
  state: string;
  redirectUri: string;
  expiresAt: string;
};

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
};

type GoogleConnectionStatus = {
  connected: boolean;
  email: string | null;
  scope: string | null;
  expiresAt: string | null;
  hasRefreshToken: boolean;
  lastSyncedAt: string | null;
};

type PaypalOAuthStateResponse = {
  authorizeUrl?: string;
  state: string;
  redirectUri: string;
  expiresAt: string;
  scope: string[];
};

type PaypalConnectionStatus = {
  connected: boolean;
  email: string | null;
  scope: string | null;
  expiresAt: string | null;
  hasRefreshToken: boolean;
  lastSyncedAt: string | null;
  merchantId: string | null;
  payerId: string | null;
};

type MetaOAuthStateResponse = {
  authorizeUrl: string;
  state: string;
  redirectUri: string;
  expiresAt: string;
  scope: string[];
};

type MetaConnectionStatus = {
  connected: boolean;
  email: string | null;
  metaUserId: string | null;
  metaUserName: string | null;
  businessId: string | null;
  businessName: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappBusinessAccountName: string | null;
  phoneNumberId: string | null;
  phoneNumber: string | null;
  scope: string | null;
  expiresAt: string | null;
  dataAccessExpiresAt: string | null;
  lastSyncedAt: string | null;
};

type EvolutionQrPayload = {
  svg: string | null;
  base64: string | null;
  code?: string | null;
  status: string | null;
  pairingCode?: string | null;
  count?: number | null;
};

type EvolutionSession = {
  instanceId: string;
  status: 'connected' | 'pending' | 'disconnected';
  qrCode?: EvolutionQrPayload | null;
  number?: string | null;
  name?: string | null;
  providerStatus?: string;
  message?: string | null;
  pairingCode?: string | null;
  slotId?: string | null;
};

type EvolutionGenerateQrRequest = {
  number?: string;
};

 

const resolveQrImageSource = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
};

// INSTANCIAS
const EVOLUTION_MODAL_AUTO_CLOSE_DELAY = 30000;
const EVOLUTION_INSTANCE_PRESETS = [
  {
    id: 'slot1',
    name: 'MvpInstance1',
    webhookUrl: 'https://renovo-ia-n8n.ogy936.easypanel.host/webhook/mvp-crm-evo-1'
  },
  {
    id: 'slot2',
    name: 'MvpInstance2',
    webhookUrl: 'https://renovo-ia-n8n.ogy936.easypanel.host/webhook/mvp-crm-evo-2'
  },
  {
    id: 'slot3',
    name: 'MvpInstance3',
    webhookUrl: 'https://renovo-ia-n8n.ogy936.easypanel.host/webhook/mvp-crm-evo-3'
  },
  {
    id: 'slot4',
    name: 'MvpInstance4',
    webhookUrl: 'https://renovo-ia-n8n.ogy936.easypanel.host/webhook/mvp-crm-evo-4'
  }
] as const;
const EVOLUTION_FIRST_POLL_DELAY = 30000;

 

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleStatusLoading, setGoogleStatusLoading] = useState(true);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionStatus | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [isPaypalLoading, setIsPaypalLoading] = useState(false);
  const [paypalStatusLoading, setPaypalStatusLoading] = useState(true);
  const [paypalConnection, setPaypalConnection] = useState<PaypalConnectionStatus | null>(null);

  const [metaError, setMetaError] = useState<string | null>(null);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [metaStatusLoading, setMetaStatusLoading] = useState(true);
  const [metaConnection, setMetaConnection] = useState<MetaConnectionStatus | null>(null);
  const [isMetaDisconnecting, setIsMetaDisconnecting] = useState(false);

  const [evolutionInstances, setEvolutionInstances] = useState<EvolutionSession[]>([]);
  const [selectedEvolutionInstanceId, setSelectedEvolutionInstanceId] = useState<string | null>(null);
  const selectedEvolutionInstanceIdRef = useRef<string | null>(null);
  const [evolutionSession, setEvolutionSession] = useState<EvolutionSession | null>(null);
  const [evolutionStatusLoading, setEvolutionStatusLoading] = useState(true);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isEvolutionActionLoading, setIsEvolutionActionLoading] = useState(false);
  const [isEvolutionQrRefreshing, setIsEvolutionQrRefreshing] = useState(false);
  const [isEvolutionCreatingInstance, setIsEvolutionCreatingInstance] = useState(false);
  const [isEvolutionCreateModalOpen, setIsEvolutionCreateModalOpen] = useState(false);
  const [selectedEvolutionSlot, setSelectedEvolutionSlot] =
    useState<(typeof EVOLUTION_INSTANCE_PRESETS)[number] | null>(null);
  const [evolutionInstanceNameInput, setEvolutionInstanceNameInput] = useState('');
  const [evolutionCreateError, setEvolutionCreateError] = useState<string | null>(null);
  const [evolutionRemovingInstanceId, setEvolutionRemovingInstanceId] = useState<string | null>(null);
  const [evolutionInstancePendingRemoval, setEvolutionInstancePendingRemoval] =
    useState<EvolutionSession | null>(null);
  const [evolutionError, setEvolutionError] = useState<string | null>(null);
  const [evolutionModalError, setEvolutionModalError] = useState<string | null>(null);
  const [evolutionPhoneInput, setEvolutionPhoneInput] = useState('');
  const evolutionPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evolutionPollingDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionModalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousEvolutionStatus = useRef<EvolutionSession['status'] | null>(null);

  

  const updateSelectedEvolutionInstanceId = useCallback((id: string | null) => {
    selectedEvolutionInstanceIdRef.current = id;
    setSelectedEvolutionInstanceId(id);
  }, []);

  

  const scopes = useMemo(
    () => normalizeScopes(process.env.NEXT_PUBLIC_GOOGLE_OAUTH_SCOPES),
    []
  );

  const createdInstanceNames = useMemo(() => {
    const names = new Set<string>();
    for (const instance of evolutionInstances) {
      if (instance.name) {
        names.add(instance.name);
      }
    }
    return names;
  }, [evolutionInstances]);

  

  const evolutionSlotAssignments = useMemo(() => {
    const assignments = new Map<string, EvolutionSession>();
    for (const instance of evolutionInstances) {
      const matchedSlot =
        instance.slotId ??
        EVOLUTION_INSTANCE_PRESETS.find(
        (preset) => preset.name === instance.name
      )?.id;

      if (matchedSlot) {
        assignments.set(matchedSlot, instance);
      }
    }
    return assignments;
  }, [evolutionInstances]);

  const usedEvolutionSlots = useMemo(() => {
    const slots = new Set<string>();
    evolutionSlotAssignments.forEach((_, slotId) => slots.add(slotId));
    return slots;
  }, [evolutionSlotAssignments]);

  const hasAvailableEvolutionPreset = useMemo(
    () => EVOLUTION_INSTANCE_PRESETS.some((preset) => !usedEvolutionSlots.has(preset.id)),
    [usedEvolutionSlots]
  );

  const hasGoogleConfig = clientId.length > 0 && fallbackRedirectUri.length > 0;

  

  

  

  const statusParam = searchParams.get('status');
  const messageParam = searchParams.get('message');
  const integrationParam = searchParams.get('integration');

  const requestEvolutionRemoveInstance = useCallback((instance: EvolutionSession) => {
    setEvolutionInstancePendingRemoval(instance);
  }, []);

  const loadGoogleStatus = useCallback(async () => {
    setGoogleStatusLoading(true);
    try {
      const { data } = await api.get<GoogleConnectionStatus>('/google/oauth/status');
      setGoogleConnection(data);
    } catch (err) {
      console.error(err);
      setGoogleConnection(null);
    } finally {
      setGoogleStatusLoading(false);
    }
  }, []);
  const loadPaypalStatus = useCallback(async () => {
    setPaypalStatusLoading(true);
    try {
      const { data } = await api.get<PaypalConnectionStatus>('/paypal/oauth/status');
      setPaypalConnection(data);
    } catch (err) {
      console.error(err);
      setPaypalConnection(null);
    } finally {
      setPaypalStatusLoading(false);
    }
  }, []);

  const loadMetaStatus = useCallback(async () => {
    setMetaStatusLoading(true);
    try {
      const { data } = await api.get<MetaConnectionStatus>('/meta/oauth/status');
      setMetaConnection(data);
    } catch (err) {
      console.error(err);
      setMetaConnection(null);
    } finally {
      setMetaStatusLoading(false);
    }
  }, []);

  const loadEvolutionStatus = useCallback(async (preferredInstanceId?: string | null) => {
    setEvolutionStatusLoading(true);
    try {
      const { data } = await api.get<EvolutionSession[]>('/integrations/evolution/instances/list');
      const instances = Array.isArray(data) ? data : [];

      setEvolutionInstances(instances);

      let nextInstanceId = preferredInstanceId ?? selectedEvolutionInstanceIdRef.current;
      if (!nextInstanceId || !instances.some((item) => item.instanceId === nextInstanceId)) {
        nextInstanceId = instances[0]?.instanceId ?? null;
      }

      updateSelectedEvolutionInstanceId(nextInstanceId);

      const selectedInstance = nextInstanceId
        ? instances.find((item) => item.instanceId === nextInstanceId) ?? null
        : null;

      setEvolutionSession(selectedInstance ?? null);
      setEvolutionPhoneInput(selectedInstance?.number ?? '');
      setEvolutionError(null);
    } catch (err) {
      console.error(err);
      setEvolutionInstances([]);
      setEvolutionSession(null);
      setEvolutionPhoneInput('');
      setEvolutionError('Nao foi possivel carregar o status do WhatsApp.');
    } finally {
      setEvolutionStatusLoading(false);
    }
  }, [updateSelectedEvolutionInstanceId]);

  

  useEffect(() => {
    void loadGoogleStatus();
    void loadPaypalStatus();
    void loadMetaStatus();
    void loadEvolutionStatus();
  }, [loadGoogleStatus, loadPaypalStatus, loadMetaStatus, loadEvolutionStatus]);

  useEffect(() => {
    if (!statusParam) {
      return;
    }

    const integration = integrationParam ?? 'google';
    const type = statusParam === 'success' ? 'success' : 'error';
    const fallbackMessage =
      integration === 'paypal'
        ? type === 'success'
          ? 'Conta PayPal conectada com sucesso.'
          : 'Nao foi possivel concluir a conexao com o PayPal.'
        : integration === 'meta-whatsapp'
        ? type === 'success'
          ? 'Conta WhatsApp Business conectada com sucesso.'
          : 'Nao foi possivel concluir a conexao com a Meta.'
        : type === 'success'
        ? 'Conexao com o Google concluida com sucesso.'
        : 'Nao foi possivel concluir a conexao com o Google.';

    const message = messageParam ?? fallbackMessage;

    setFeedback({ type, message });

    if (type === 'success') {
      if (integration === 'paypal') {
        loadPaypalStatus();
      } else if (integration === 'meta-whatsapp') {
        loadMetaStatus();
      } else {
        loadGoogleStatus();
      }
    }

    const timeout = setTimeout(() => {
      router.replace('/integrations');
    }, 150);

    return () => clearTimeout(timeout);
  }, [
    statusParam,
    messageParam,
    integrationParam,
    router,
    loadGoogleStatus,
    loadPaypalStatus,
    loadMetaStatus
  ]);

  const handleGoogleConnect = useCallback(async () => {
    if (!hasGoogleConfig) {
      setGoogleError('Variaveis de ambiente do Google nao estao configuradas.');
      return;
    }

    setGoogleError(null);
    setFeedback(null);
    setIsGoogleLoading(true);

    try {
      const { data } = await api.post<GoogleOAuthStateResponse>('/google/oauth/state');

      const state = data.state;
      const redirectUri = data.redirectUri ?? fallbackRedirectUri;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('google_oauth_state', state);
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
        state
      });

      window.location.href = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
    } catch (err) {
      console.error(err);
      setGoogleError('Nao foi possivel iniciar a autorizacao com o Google. Tente novamente.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [hasGoogleConfig, scopes]);
  const handlePaypalConnect = useCallback(async () => {
    setPaypalError(null);
    setFeedback(null);
    setIsPaypalLoading(true);

    try {
      const { data } = await api.post<PaypalOAuthStateResponse>('/paypal/oauth/state');

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('paypal_oauth_state', data.state);
      }

      if (!data.authorizeUrl) {
        throw new Error('Authorize URL ausente na resposta da API.');
      }

      window.location.href = data.authorizeUrl;
    } catch (err) {
      console.error(err);
      setPaypalError('Nao foi possivel iniciar a autorizacao com o PayPal. Tente novamente.');
    } finally {
      setIsPaypalLoading(false);
    }
  }, []);

  const handleMetaConnect = useCallback(async () => {
    setMetaError(null);
    setFeedback(null);
    setIsMetaLoading(true);

    try {
      const { data } = await api.post<MetaOAuthStateResponse>('/meta/oauth/state');

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('meta_oauth_state', data.state);
      }

      if (!data.authorizeUrl) {
        throw new Error('Authorize URL ausente na resposta da API.');
      }

      window.location.href = data.authorizeUrl;
    } catch (err) {
      console.error(err);
      setMetaError('Nao foi possivel iniciar a autorizacao com a Meta. Tente novamente.');
    } finally {
      setIsMetaLoading(false);
    }
  }, []);

  const handleMetaDisconnect = useCallback(async () => {
    setMetaError(null);
    setIsMetaDisconnecting(true);

    try {
      await api.delete('/meta/oauth/disconnect');
      await loadMetaStatus();
      setFeedback({
        type: 'success',
        message: 'Conexao com a Meta removida com sucesso.'
      });
    } catch (err) {
      console.error(err);
      setMetaError('Nao foi possivel remover a conexao com a Meta. Tente novamente.');
    } finally {
      setIsMetaDisconnecting(false);
    }
  }, [loadMetaStatus]);

  const stopEvolutionPolling = useCallback(() => {
    if (evolutionPollingRef.current) {
      clearInterval(evolutionPollingRef.current);
      evolutionPollingRef.current = null;
    }
    if (evolutionPollingDelayTimeoutRef.current) {
      clearTimeout(evolutionPollingDelayTimeoutRef.current);
      evolutionPollingDelayTimeoutRef.current = null;
    }
  }, []);

  const clearEvolutionModalAutoClose = useCallback(() => {
    if (evolutionModalCloseTimeoutRef.current) {
      clearTimeout(evolutionModalCloseTimeoutRef.current);
      evolutionModalCloseTimeoutRef.current = null;
    }
  }, []);

  // cleanup will be registered below after both stop* callbacks are declared

  const pollEvolutionStatus = useCallback(async (instanceId: string) => {
    try {
      const { data } = await api.get<EvolutionSession>(
        `/integrations/evolution/instances/${instanceId}/status`
      );

      setEvolutionSession(data);
      setEvolutionInstances((prev) =>
        prev.map((instance) => (instance.instanceId === data.instanceId ? data : instance))
      );
    } catch (err) {
      console.error(err);
    }
  }, []);

  

  // Register global cleanup once both stop callbacks exist
  useEffect(() => {
    return () => {
      stopEvolutionPolling();
      clearEvolutionModalAutoClose();
    };
  }, [clearEvolutionModalAutoClose, stopEvolutionPolling]);

  

  const handleEvolutionConnect = useCallback(
    async (target?: EvolutionSession) => {
      const instance = target ?? evolutionSession;

      if (!instance) {
        setEvolutionError('Nenhuma instancia Evolution disponivel.');
        return;
      }

      if (evolutionRemovingInstanceId) {
        return;
      }

      updateSelectedEvolutionInstanceId(instance.instanceId);
      setEvolutionSession(instance);
      setEvolutionPhoneInput(instance.number ?? '');
      clearEvolutionModalAutoClose();
      stopEvolutionPolling();

      setEvolutionModalError(null);
      setEvolutionError(null);
      setFeedback(null);

      if (instance.status === 'connected') {
        setIsEvolutionModalOpen(true);
        return;
      }

      setIsEvolutionActionLoading(true);

      try {
        const trimmedInput = evolutionPhoneInput.trim();
        const payload: EvolutionGenerateQrRequest = {
          number: trimmedInput || instance.number?.trim() || undefined
        };

        const { data } = await api.post<EvolutionSession>(
          `/integrations/evolution/instances/${instance.instanceId}/qr`,
          payload
        );

      setEvolutionSession(data);
      updateSelectedEvolutionInstanceId(data.instanceId);
      setEvolutionPhoneInput(data.number ?? payload.number ?? '');
      setEvolutionStatusLoading(false);
      setIsEvolutionModalOpen(true);
      setEvolutionInstances((prev) => {
        const exists = prev.some((item) => item.instanceId === data.instanceId);
        if (exists) {
          return prev.map((item) => (item.instanceId === data.instanceId ? data : item));
        }
        return [...prev, data];
      });
      } catch (err) {
        console.error(err);
        setEvolutionError('Nao foi possivel iniciar a integracao com a Evolution.');
      } finally {
        setIsEvolutionActionLoading(false);
      }
    },
    [
      clearEvolutionModalAutoClose,
      evolutionPhoneInput,
      evolutionRemovingInstanceId,
      evolutionSession,
      stopEvolutionPolling,
      updateSelectedEvolutionInstanceId
    ]
  );

  const handleOpenEvolutionCreateModal = useCallback(
    (slotId: string) => {
      const preset = EVOLUTION_INSTANCE_PRESETS.find((item) => item.id === slotId);
      if (!preset) {
        return;
      }

      if (usedEvolutionSlots.has(preset.id)) {
        const assigned = evolutionSlotAssignments.get(preset.id);
        setEvolutionError(
          assigned?.name
            ? `Slot ${preset.name} ja esta em uso pela instancia ${assigned.name}.`
            : `Slot ${preset.name} ja esta em uso.`
        );
        return;
      }

      setEvolutionError(null);
      setEvolutionModalError(null);
      setEvolutionCreateError(null);
      setFeedback(null);
      setSelectedEvolutionSlot(preset);
      setEvolutionInstanceNameInput(preset.name);
      setIsEvolutionCreateModalOpen(true);
    },
    [evolutionSlotAssignments, setFeedback, usedEvolutionSlots]
  );

  

  

  

  

  

  

  

  

  
  

  

  

  

  const handleEvolutionCreateSlotChange = useCallback(
    (slotId: string) => {
      if (!slotId) {
        setSelectedEvolutionSlot(null);
        setEvolutionInstanceNameInput('');
        setEvolutionCreateError(null);
        return;
      }

      const preset = EVOLUTION_INSTANCE_PRESETS.find((item) => item.id === slotId) ?? null;
      if (!preset) {
        setSelectedEvolutionSlot(null);
        setEvolutionCreateError('Slot selecionado e invalido.');
        return;
      }

      if (usedEvolutionSlots.has(preset.id) && preset.id !== selectedEvolutionSlot?.id) {
        setEvolutionCreateError('Slot selecionado ja esta em uso.');
        return;
      }

      const previousDefault = selectedEvolutionSlot?.name ?? '';
      setSelectedEvolutionSlot(preset);
      setEvolutionInstanceNameInput((prev) => {
        if (!prev || prev === previousDefault) {
          return preset.name;
        }
        return prev;
      });
      setEvolutionCreateError(null);
    },
    [selectedEvolutionSlot, usedEvolutionSlots]
  );

  const handleEvolutionCreateModalClose = useCallback(() => {
    if (isEvolutionCreatingInstance) {
      return;
    }

    setIsEvolutionCreateModalOpen(false);
    setSelectedEvolutionSlot(null);
    setEvolutionInstanceNameInput('');
    setEvolutionCreateError(null);
  }, [isEvolutionCreatingInstance]);

  const handleEvolutionCreateSubmit = useCallback(async () => {
    const preset = selectedEvolutionSlot;
    const trimmedName = evolutionInstanceNameInput.trim();

    if (!preset) {
      setEvolutionCreateError('Selecione um slot Evolution disponivel.');
      return;
    }

    if (!trimmedName) {
      setEvolutionCreateError('Informe um nome para a instancia.');
      return;
    }

    if (createdInstanceNames.has(trimmedName)) {
      setEvolutionCreateError('Ja existe uma instancia com esse nome.');
      return;
    }

    setEvolutionCreateError(null);
    setEvolutionError(null);
    setFeedback(null);
    setIsEvolutionCreatingInstance(true);

    try {
      const { data } = await api.post<EvolutionSession>(
        '/integrations/evolution/instances/create',
        {
          instanceName: trimmedName,
          webhookUrl: preset.webhookUrl,
          slotId: preset.id
        }
      );

      updateSelectedEvolutionInstanceId(data.instanceId);
      await loadEvolutionStatus(data.instanceId);
      setEvolutionPhoneInput('');
      setFeedback({
        type: 'success',
        message: `Instancia ${trimmedName} criada com sucesso.`
      });
      setIsEvolutionCreateModalOpen(false);
      setSelectedEvolutionSlot(null);
      setEvolutionInstanceNameInput('');
    } catch (err) {
      console.error(err);
      setEvolutionCreateError('Nao foi possivel criar a instancia Evolution.');
    } finally {
      setIsEvolutionCreatingInstance(false);
    }
  }, [
    createdInstanceNames,
    evolutionInstanceNameInput,
    loadEvolutionStatus,
    selectedEvolutionSlot,
    updateSelectedEvolutionInstanceId
  ]);

  const handleEvolutionCreateFormSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleEvolutionCreateSubmit();
    },
    [handleEvolutionCreateSubmit]
  );

  const handleEvolutionDisconnect = useCallback(async () => {
    if (!evolutionSession?.instanceId) {
      return;
    }

    setEvolutionModalError(null);
    clearEvolutionModalAutoClose();
    setIsEvolutionActionLoading(true);

    try {
      const { data } = await api.delete<EvolutionSession>(
        `/integrations/evolution/instances/${evolutionSession.instanceId}`
      );

      setEvolutionSession(data);
      setEvolutionPhoneInput('');
      setFeedback({ type: 'success', message: 'WhatsApp desconectado com sucesso.' });
      setIsEvolutionModalOpen(false);
      stopEvolutionPolling();
      updateSelectedEvolutionInstanceId(data.instanceId);
      setEvolutionInstances((prev) =>
        prev.map((item) => (item.instanceId === data.instanceId ? data : item))
      );
    } catch (err) {
      console.error(err);
      setEvolutionModalError('Nao foi possivel desconectar o WhatsApp.');
    } finally {
      setIsEvolutionActionLoading(false);
    }
  }, [
    clearEvolutionModalAutoClose,
    evolutionSession,
    stopEvolutionPolling,
    updateSelectedEvolutionInstanceId
  ]);

  const handleEvolutionRemoveInstance = useCallback(
    async (instance: EvolutionSession) => {
      const instanceId = instance.instanceId;
      if (!instanceId) {
        return;
      }

      setEvolutionError(null);
      setEvolutionModalError(null);
      setEvolutionPhoneInput('');
      setFeedback(null);
      setEvolutionRemovingInstanceId(instanceId);

      try {
        await api.delete(`/integrations/evolution/instances/${instanceId}/remove`);
        await loadEvolutionStatus();
        setFeedback({
          type: 'success',
          message: `Instancia ${instance.name ?? instanceId} removida com sucesso.`
        });
      } catch (err) {
        console.error(err);
        setEvolutionError('Nao foi possivel remover a instancia Evolution.');
      } finally {
        setEvolutionRemovingInstanceId(null);
        setEvolutionInstancePendingRemoval(null);
      }
    },
    [loadEvolutionStatus]
  );

  const confirmEvolutionRemoveInstance = useCallback(async () => {
    if (!evolutionInstancePendingRemoval) {
      return;
    }
    await handleEvolutionRemoveInstance(evolutionInstancePendingRemoval);
  }, [evolutionInstancePendingRemoval, handleEvolutionRemoveInstance]);

  const cancelEvolutionRemoveInstance = useCallback(() => {
    if (evolutionRemovingInstanceId) {
      return;
    }
    setEvolutionInstancePendingRemoval(null);
  }, [evolutionRemovingInstanceId]);

  const handleRefreshEvolutionQr = useCallback(async () => {
    if (!evolutionSession?.instanceId) {
      return;
    }

    setEvolutionModalError(null);
    clearEvolutionModalAutoClose();
    setIsEvolutionQrRefreshing(true);

    try {
      const { data } = await api.post<EvolutionSession>(
        `/integrations/evolution/instances/${evolutionSession.instanceId}/qr`,
        {
          number: evolutionPhoneInput.trim() || undefined
        }
      );
      setEvolutionSession(data);
      setEvolutionPhoneInput(data.number ?? evolutionPhoneInput);
      await loadEvolutionStatus(data.instanceId);
    } catch (err) {
      console.error(err);
      setEvolutionModalError('Nao foi possivel gerar um novo QR code. Tente novamente.');
    } finally {
      setIsEvolutionQrRefreshing(false);
    }
  }, [clearEvolutionModalAutoClose, evolutionPhoneInput, evolutionSession, loadEvolutionStatus]);

  const closeEvolutionModal = useCallback(() => {
    setIsEvolutionModalOpen(false);
    setEvolutionModalError(null);
    clearEvolutionModalAutoClose();
    stopEvolutionPolling();
  }, [clearEvolutionModalAutoClose, stopEvolutionPolling]);

  const evolutionInstanceId = evolutionSession?.instanceId ?? null;
  const evolutionStatus = evolutionSession?.status ?? null;

  useEffect(() => {
    if (!isEvolutionModalOpen || !evolutionInstanceId || evolutionStatus !== 'pending') {
      stopEvolutionPolling();
      return;
    }

    if (evolutionPollingRef.current || evolutionPollingDelayTimeoutRef.current) {
      return;
    }

    const instanceId = evolutionInstanceId;

    const startPolling = () => {
      evolutionPollingDelayTimeoutRef.current = null;

      if (evolutionPollingRef.current) {
        return;
      }

      evolutionPollingRef.current = setInterval(() => {
        void pollEvolutionStatus(instanceId);
      }, 5000);

      void pollEvolutionStatus(instanceId);
    };

    evolutionPollingDelayTimeoutRef.current = setTimeout(() => {
      startPolling();
    }, EVOLUTION_FIRST_POLL_DELAY);

    return () => {
      stopEvolutionPolling();
    };
  }, [
    evolutionInstanceId,
    evolutionStatus,
    isEvolutionModalOpen,
    pollEvolutionStatus,
    stopEvolutionPolling
  ]);

  

  useEffect(() => {
    const currentStatus = evolutionSession?.status ?? null;
    const previousStatus = previousEvolutionStatus.current;

    if (currentStatus === 'connected' && previousStatus === 'pending') {
      setFeedback({
        type: 'success',
        message: 'WhatsApp (Evolution) conectado com sucesso.'
      });
      stopEvolutionPolling();
      void loadEvolutionStatus();

      clearEvolutionModalAutoClose();
      evolutionModalCloseTimeoutRef.current = setTimeout(() => {
        setIsEvolutionModalOpen(false);
        evolutionModalCloseTimeoutRef.current = null;
      }, EVOLUTION_MODAL_AUTO_CLOSE_DELAY);
    }

    previousEvolutionStatus.current = currentStatus;
  }, [
    clearEvolutionModalAutoClose,
    evolutionSession?.status,
    loadEvolutionStatus,
    stopEvolutionPolling
  ]);

  const dismissFeedback = () => setFeedback(null);

  const evolutionButtonLabel = (() => {
    if (isEvolutionActionLoading) {
      return 'Processando...';
    }

    if (evolutionSession?.status === 'connected') {
      return 'Gerenciar WhatsApp';
    }

    if (evolutionSession) {
      return 'Gerar novo QR';
    }

    return 'Conectar WhatsApp';
  })();

  const evolutionPairingCode =
    evolutionSession?.qrCode?.pairingCode ?? evolutionSession?.pairingCode ?? null;
  const evolutionQrToken = evolutionSession?.qrCode?.code ?? null;
  const evolutionQrCount =
    typeof evolutionSession?.qrCode?.count === 'number'
      ? evolutionSession?.qrCode?.count ?? null
      : null;

  const evolutionSummaryContent = () => {
    if (evolutionStatusLoading) {
      return <span>Verificando status do WhatsApp...</span>;
    }

    if (!evolutionSession) {
      return (
        <span>
          {'Nenhum numero conectado. Clique em "Conectar WhatsApp" para gerar um QR code.'}
        </span>
      );
    }

    if (evolutionSession.status === 'connected') {
      return (
        <div className="flex flex-col gap-1">
          <strong className="text-emerald-700">WhatsApp conectado</strong>
          {evolutionSession.number && <span>Numero: {evolutionSession.number}</span>}
          {evolutionSession.name && <span>Nome: {evolutionSession.name}</span>}
          <span>Status no provedor: {evolutionSession.providerStatus ?? 'desconhecido'}</span>
        </div>
      );
    }

    if (evolutionSession.status === 'pending') {
      return (
        <div className="flex flex-col gap-1">
          <strong className="text-amber-600">Conexao pendente</strong>
          <span>Escaneie o QR code gerado para finalizar a configuracao.</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <strong className="text-slate-700">Nenhum numero conectado</strong>
        <span>
          Clique em &quot;Gerar novo QR&quot; para reconectar ou em &quot;Conectar WhatsApp&quot; para criar
          uma nova sessao.
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Integrações</h1>
        <p className="mt-2 text-sm text-slate-500">
          Conecte a agenda do Google e o WhatsApp via Evolution para automatizar o atendimento.
        </p>
      </header>

      {feedback && (
        <div
          className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={dismissFeedback}
            className="ml-4 text-xs font-semibold uppercase tracking-wide text-current opacity-70 transition hover:opacity-100"
          >
            fechar
          </button>
        </div>
      )}


      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Google Calendar</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Ao conectar, o sistema podera criar, atualizar e cancelar eventos diretamente na sua
              agenda autorizada.
            </p>
          </div>
          <button
            onClick={handleGoogleConnect}
            disabled={!hasGoogleConfig || isGoogleLoading}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isGoogleLoading
              ? 'Redirecionando...'
              : googleConnection?.connected
              ? 'Reconectar Google Calendar'
              : 'Conectar Google Calendar'}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {googleStatusLoading ? (
            <span>Verificando status da integracao...</span>
          ) : googleConnection?.connected ? (
            <div className="flex flex-col gap-1">
              <strong className="text-emerald-700">Agenda conectada</strong>
              {googleConnection.email && <span>Conta: {googleConnection.email}</span>}
              {googleConnection.expiresAt && (
                <span>
                  Token expira em:{' '}
                  {new Date(googleConnection.expiresAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              )}
              <span>
                Renovacao automatica:{' '}
                {googleConnection.hasRefreshToken ? 'ativada' : 'nao disponivel'}
              </span>
            </div>
          ) : (
            <span>{'Nenhuma conta Google vinculada. Clique em "Conectar Google Calendar".'}</span>
          )}
        </div>

        {googleError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {googleError}
          </div>
        )}

        {!hasGoogleConfig && (
          <p className="mt-4 text-xs text-gray-400">
            Defina NEXT_PUBLIC_GOOGLE_CLIENT_ID e NEXT_PUBLIC_GOOGLE_REDIRECT_URI para habilitar a
            conexao.
          </p>
        )}
      </section>

      {/* <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">WhatsApp Cloud (Meta)</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Permita que cada usuario conecte sua propria conta WhatsApp Business via Meta OAuth2,
              mantendo os tokens seguros no CRM.
            </p>
          </div>
          <button
            onClick={handleMetaConnect}
            disabled={isMetaLoading}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isMetaLoading
              ? 'Redirecionando...'
              : metaConnection?.connected
              ? 'Reconectar conta Meta'
              : 'Conectar conta Meta'}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {metaStatusLoading ? (
            <span>Verificando status da integracao...</span>
          ) : metaConnection?.connected ? (
            <div className="flex flex-col gap-1">
              <strong className="text-emerald-700">Conta Meta conectada</strong>
              {metaConnection.metaUserName && (
                <span>Usuario Meta: {metaConnection.metaUserName}</span>
              )}
              {metaConnection.email && <span>E-mail: {metaConnection.email}</span>}
              {metaConnection.businessName && (
                <span>Business Manager: {metaConnection.businessName}</span>
              )}
              {metaConnection.whatsappBusinessAccountName && (
                <span>WABA: {metaConnection.whatsappBusinessAccountName}</span>
              )}
              {metaConnection.phoneNumber && <span>Numero: {metaConnection.phoneNumber}</span>}
              {metaConnection.expiresAt && (
                <span>
                  Token expira em:{' '}
                  {new Date(metaConnection.expiresAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              )}
              {metaConnection.dataAccessExpiresAt && (
                <span>
                  Data access expira em:{' '}
                  {new Date(metaConnection.dataAccessExpiresAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void handleMetaDisconnect()}
                  disabled={isMetaDisconnecting}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                >
                  {isMetaDisconnecting ? 'Desconectando...' : 'Desconectar conta Meta'}
                </button>
              </div>
            </div>
          ) : (
            <span>{'Nenhuma conta Meta vinculada. Clique em "Conectar conta Meta".'}</span>
          )}
        </div>

        {metaError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {metaError}
          </div>
        )}
      </section> */}

      {/* <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">PayPal</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Conecte sua conta PayPal para sincronizar automaticamente os pagamentos recebidos e
              consulta-los dentro do CRM.
            </p>
          </div>
          <button
            onClick={handlePaypalConnect}
            disabled={isPaypalLoading}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isPaypalLoading
              ? 'Redirecionando...'
              : paypalConnection?.connected
              ? 'Reconectar conta PayPal'
              : 'Conectar conta PayPal'}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {paypalStatusLoading ? (
            <span>Verificando status da integracao...</span>
          ) : paypalConnection?.connected ? (
            <div className="flex flex-col gap-1">
              <strong className="text-emerald-700">Conta PayPal conectada</strong>
              {paypalConnection.email && <span>Conta: {paypalConnection.email}</span>}
              {paypalConnection.merchantId && <span>Merchant ID: {paypalConnection.merchantId}</span>}
              {paypalConnection.expiresAt && (
                <span>
                  Token expira em:{' '}
                  {new Date(paypalConnection.expiresAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              )}
              <span>
                Renovacao automatica:{' '}
                {paypalConnection.hasRefreshToken ? 'ativada' : 'nao disponivel'}
              </span>
              {paypalConnection.lastSyncedAt && (
                <span>
                  Ultima sincronizacao:{' '}
                  {new Date(paypalConnection.lastSyncedAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              )}
            </div>
          ) : (
            <span>{'Nenhuma conta PayPal vinculada. Clique em "Conectar conta PayPal".'}</span>
          )}
        </div>

        {paypalError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {paypalError}
          </div>
        )}
      </section> */}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Evolution WhatsApp</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Gere um QR code para autenticar um numero de WhatsApp via Evolution API e envie mensagens
              diretamente pelo sistema.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap gap-2">
              {EVOLUTION_INSTANCE_PRESETS.map((preset, index) => {
                const assignedInstance = evolutionSlotAssignments.get(preset.id);
                const isInUse = Boolean(assignedInstance);
                const buttonDisabled =
                  isInUse || isEvolutionCreatingInstance || evolutionRemovingInstanceId !== null;
                const label = isInUse
                  ? `Instancia ${index + 1} em uso`
                  : `Adicionar instancia ${index + 1}`;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleOpenEvolutionCreateModal(preset.id)}
                    disabled={buttonDisabled}
                    className={`min-w-[12rem] rounded-lg border px-4 py-2 text-left text-sm font-semibold transition ${
                      isInUse
                        ? 'border-gray-200 bg-gray-100 text-gray-500'
                        : 'border-primary text-primary hover:bg-primary/10'
                    } disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400`}
                    title={
                      isInUse
                        ? `Em uso por ${assignedInstance?.name ?? 'outra instancia'}`
                        : `Webhook: ${preset.webhookUrl}`
                    }
                  >
                    <span className="block">{label}</span>
                    {isInUse && assignedInstance?.name && (
                      <span className="block text-xs font-normal text-gray-500">
                        {assignedInstance.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!hasAvailableEvolutionPreset && (
              <span className="text-xs text-gray-500">
                Todos os slots Evolution estao em uso. Remova uma instancia para liberar um slot.
              </span>
            )}
            <button
              onClick={() => void handleEvolutionConnect()}
              disabled={
                isEvolutionActionLoading ||
                !evolutionSession ||
                evolutionRemovingInstanceId !== null ||
                isEvolutionCreatingInstance
              }
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {evolutionButtonLabel}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {evolutionStatusLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              Carregando instancias...
            </div>
          ) : evolutionInstances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Nenhuma instancia criada. Clique em &quot;Adicionar instancia&quot; para provisionar uma nova sessao Evolution.
            </div>
          ) : (
            evolutionInstances.map((instance) => {
              const isSelected = selectedEvolutionInstanceId === instance.instanceId;

              const statusBadgeClass =
                instance.status === 'connected'
                  ? 'bg-emerald-100 text-emerald-700'
                  : instance.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600';

              const statusLabel =
                instance.status === 'connected'
                  ? 'Conectada'
                  : instance.status === 'pending'
                    ? 'Pendente'
                    : 'Desconectada';

              const actionLabel = (() => {
                if (isEvolutionActionLoading && isSelected) {
                  return 'Processando...';
                }

                if (instance.status === 'connected') {
                  return 'Gerenciar';
                }

                if (instance.status === 'pending') {
                  return 'Ver QR code';
                }

                return 'Conectar';
              })();

              return (
                <div
                  key={instance.instanceId}
                  className={`rounded-xl border bg-white p-4 shadow-sm transition ${
                    isSelected ? 'border-primary shadow-md' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {instance.name ?? instance.instanceId}
                      </h3>
                      <p className="mt-1 text-xs text-gray-400 break-all">{instance.instanceId}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    {instance.number && (
                      <p>
                        <span className="font-medium text-gray-700">Numero:</span> {instance.number}
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-gray-700">Status no provedor:</span>{' '}
                      {instance.providerStatus ?? 'desconhecido'}
                    </p>
                    {instance.pairingCode && (
                      <p>
                        <span className="font-medium text-gray-700">Pairing:</span> {instance.pairingCode}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEvolutionConnect(instance)}
                      disabled={
                        isEvolutionActionLoading ||
                        (isEvolutionQrRefreshing && isSelected) ||
                        isEvolutionCreatingInstance ||
                        evolutionRemovingInstanceId === instance.instanceId
                      }
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {actionLabel}
                    </button>
                    <button
                      onClick={() => {
                        updateSelectedEvolutionInstanceId(instance.instanceId);
                        setEvolutionSession(instance);
                        setEvolutionPhoneInput(instance.number ?? '');
                        setEvolutionModalError(null);
                        setEvolutionError(null);
                        setIsEvolutionModalOpen(true);
                      }}
                      disabled={evolutionRemovingInstanceId === instance.instanceId}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                    >
                      Detalhes
                    </button>
                    <button
                      onClick={() => requestEvolutionRemoveInstance(instance)}
                      disabled={
                        evolutionRemovingInstanceId === instance.instanceId || isEvolutionCreatingInstance
                      }
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-red-300"
                    >
                      {evolutionRemovingInstanceId === instance.instanceId ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {evolutionError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {evolutionError}
          </div>
        )}
      </section>

      <Modal
        title="Criar instancia Evolution"
        isOpen={isEvolutionCreateModalOpen}
        onClose={handleEvolutionCreateModalClose}
      >
        <form onSubmit={handleEvolutionCreateFormSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Escolha um dos slots pre-configurados e defina um nome para a nova instancia.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="evolution-slot-select">
              Slot Evolution
            </label>
            <select
              id="evolution-slot-select"
              value={selectedEvolutionSlot?.id ?? ''}
              onChange={(event) => handleEvolutionCreateSlotChange(event.target.value)}
              disabled={isEvolutionCreatingInstance}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Selecione um slot</option>
              {EVOLUTION_INSTANCE_PRESETS.map((preset) => {
                const assignedInstance = evolutionSlotAssignments.get(preset.id);
                const isDisabled =
                  Boolean(assignedInstance) && preset.id !== selectedEvolutionSlot?.id;

                return (
                  <option key={preset.id} value={preset.id} disabled={isDisabled}>
                    {`${preset.name}${assignedInstance ? ' - em uso' : ''}`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500">
              Cada slot possui um webhook unico. Apenas um cliente pode utilizar cada slot.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="evolution-instance-name">
              Nome da instancia
            </label>
            <input
              id="evolution-instance-name"
              type="text"
              value={evolutionInstanceNameInput}
              onChange={(event) => setEvolutionInstanceNameInput(event.target.value)}
              placeholder="Ex.: WhatsApp atendimento"
              disabled={isEvolutionCreatingInstance}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          {selectedEvolutionSlot && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <strong className="font-semibold text-slate-700">Webhook:</strong>{' '}
              <span className="break-all">{selectedEvolutionSlot.webhookUrl}</span>
            </div>
          )}

          {evolutionCreateError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {evolutionCreateError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleEvolutionCreateModalClose}
              disabled={isEvolutionCreatingInstance}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isEvolutionCreatingInstance || !selectedEvolutionSlot}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isEvolutionCreatingInstance ? 'Criando instancia...' : 'Criar instancia'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="WhatsApp via Evolution"
        isOpen={isEvolutionModalOpen}
        onClose={closeEvolutionModal}
      >
        {evolutionModalError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {evolutionModalError}
          </div>
        )}

        {!evolutionSession ? (
          <p className="text-sm text-gray-600">Carregando dados da instancia...</p>
        ) : evolutionSession.status === 'pending' ? (
          <>
            <p className="text-sm text-gray-600">
              Escaneie o QR code abaixo usando o WhatsApp do numero que deseja conectar. O QR code
              expira em poucos minutos.
            </p>
            <div className="flex justify-center">
              {resolveQrImageSource(evolutionSession.qrCode?.base64) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveQrImageSource(evolutionSession.qrCode?.base64) ?? ''}
                  alt="QR code Evolution"
                  className="h-60 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow"
                />
              ) : evolutionSession.qrCode?.svg ? (
                <div
                  className="h-60 w-60"
                  dangerouslySetInnerHTML={{ __html: evolutionSession.qrCode.svg }}
                />
              ) : (
                <span className="text-sm text-gray-500">
                  Aguarde enquanto geramos o QR code...
                </span>
              )}
            </div>
            {(evolutionPairingCode || evolutionQrToken || evolutionQrCount !== null) && (
              <div className="mt-3 space-y-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                {evolutionPairingCode && (
                  <p>
                    <span className="font-semibold text-gray-700">Pairing code:</span>{' '}
                    {evolutionPairingCode}
                  </p>
                )}
                {evolutionQrToken && (
                  <p className="break-all">
                    <span className="font-semibold text-gray-700">Token:</span> {evolutionQrToken}
                  </p>
                )}
                {evolutionQrCount !== null && (
                  <p>
                    <span className="font-semibold text-gray-700">Tentativa:</span>{' '}
                    {evolutionQrCount}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleRefreshEvolutionQr}
                disabled={isEvolutionQrRefreshing}
                className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              >
                {isEvolutionQrRefreshing ? 'Gerando novo QR...' : 'Gerar novo QR code'}
              </button>
              <button
                onClick={handleEvolutionDisconnect}
                disabled={isEvolutionActionLoading}
                className="rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              >
                {isEvolutionActionLoading ? 'Cancelando...' : 'Cancelar conexao'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Certifique-se de que o WhatsApp selecionado continua com o aplicativo aberto durante o
              processo de pareamento.
            </p>
          </>
        ) : evolutionSession.status === 'connected' ? (
          <div className="space-y-3 text-sm text-gray-600">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
              Numero conectado com sucesso.
            </div>
            {evolutionSession.number && <p>Numero: {evolutionSession.number}</p>}
            {evolutionSession.name && <p>Nome: {evolutionSession.name}</p>}
            <p>Status no provedor: {evolutionSession.providerStatus ?? 'conectado'}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleEvolutionDisconnect}
                disabled={isEvolutionActionLoading}
                className="rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              >
                {isEvolutionActionLoading ? 'Desconectando...' : 'Desconectar numero'}
              </button>
              <button
                onClick={closeEvolutionModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-600">
            <p>{'Nenhum numero conectado no momento. Clique em "Conectar WhatsApp" para gerar um QR.'}</p>
            <button
              onClick={() => void handleEvolutionConnect()}
              disabled={isEvolutionActionLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isEvolutionActionLoading ? 'Iniciando...' : 'Iniciar nova conexao'}
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={evolutionInstancePendingRemoval !== null}
        title="Remover instancia"
        description={
          evolutionInstancePendingRemoval ? (
            <p>
              Deseja realmente remover a instancia{' '}
              <span className="font-semibold text-slate-900">
                {evolutionInstancePendingRemoval.name ?? evolutionInstancePendingRemoval.instanceId}
              </span>
              ? Essa acao nao pode ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={
          evolutionRemovingInstanceId !== null &&
          evolutionRemovingInstanceId === evolutionInstancePendingRemoval?.instanceId
        }
        onCancel={cancelEvolutionRemoveInstance}
        onConfirm={confirmEvolutionRemoveInstance}
      />
    </div>
  );
}

'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import { Loading } from '../../../components/Loading';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import { SellerAvailabilitySlot, WeekDay } from '../../../types';

const weekDayOrder: WeekDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const calendarWeekHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

interface SellerWithAvailability {
  id: string;
  name: string;
  email?: string | null;
  availabilitySlots: SellerAvailabilitySlot[];
}

const getWeekDayFromDate = (date: Date): WeekDay => weekDayOrder[date.getDay()];
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const buildCalendarDays = (month: Date): Date[] => {
  const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const firstCalendarDay = new Date(firstDayOfMonth);
  firstCalendarDay.setDate(firstCalendarDay.getDate() - firstDayOfMonth.getDay());

  const lastCalendarDay = new Date(lastDayOfMonth);
  lastCalendarDay.setDate(lastCalendarDay.getDate() + (6 - lastDayOfMonth.getDay()));

  const days: Date[] = [];
  const cursor = new Date(firstCalendarDay);
  while (cursor <= lastCalendarDay) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const doesSlotMatchDate = (slot: SellerAvailabilitySlot, date: Date): boolean => {
  if (slot.specificDate) {
    return isSameDay(new Date(slot.specificDate), date);
  }
  if (slot.dayOfMonth) {
    return slot.dayOfMonth === date.getDate();
  }
  return slot.day === getWeekDayFromDate(date);
};

const SellerAttendanceManager = () => {
  const [slots, setSlots] = useState<SellerAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({ startTime: '', endTime: '' });
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SellerAvailabilitySlot[]>('/seller-availability');
      setSlots(data);
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel carregar seus horarios. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    setSelectedDate((prev) => {
      if (
        prev.getFullYear() === currentMonth.getFullYear() &&
        prev.getMonth() === currentMonth.getMonth()
      ) {
        return prev;
      }
      return new Date(currentMonth);
    });
  }, [currentMonth]);

  useEffect(() => {
    setFormState({ startTime: '', endTime: '' });
  }, [selectedDate]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const getSlotsForDate = useCallback(
    (date: Date) => {
      return slots.filter((slot) => doesSlotMatchDate(slot, date));
    },
    [slots]
  );

  const slotsForSelectedDate = useMemo(() => getSlotsForDate(selectedDate), [selectedDate, getSlotsForDate]);

  const handleInputChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.startTime || !formState.endTime) {
      setError('Preencha os horarios antes de salvar.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSaving(true);
    try {
      await api.post('/seller-availability', {
        day: getWeekDayFromDate(selectedDate),
        dayOfMonth: selectedDate.getDate(),
        specificDate: selectedDate.toISOString(),
        startTime: formState.startTime,
        endTime: formState.endTime
      });

      setSuccessMessage('Horario adicionado com sucesso.');
      setFormState({ startTime: '', endTime: '' });
      await loadSlots();
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel adicionar o horario.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    setSuccessMessage(null);
    setError(null);
  };

  const handleMonthChange = (offset: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSuccessMessage(null);
  };

  const handleRemoveSlot = async (slotId: string) => {
    setError(null);
    setSuccessMessage(null);
    setRemovingId(slotId);
    try {
      await api.delete(`/seller-availability/${slotId}`);
      setSuccessMessage('Horario removido com sucesso.');
      setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel remover o horario.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-10">
        <Loading />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sua agenda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Escolha os dias no calendario e indique em quais horarios voce estara disponivel. Fica facil visualizar o
          mes inteiro e registrar apenas as datas em que realmente ira trabalhar.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

        <div className="grid gap-8 xl:grid-cols-[7fr,3fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Mes anterior
            </button>
            <p className="text-lg font-semibold text-gray-900">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Proximo mes
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-gray-400">
            {calendarWeekHeaders.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isTodayDate = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);
              const dateSlots = getSlotsForDate(date);

              return (
                <button
                  key={date.toDateString()}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                    className={clsx(
                      'flex h-32 min-h-[8rem] min-w-[7.5rem] flex-col rounded-xl border px-4 py-3 text-left transition',
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400',
                      isSelected && 'border-primary bg-primary/10 text-primary',
                      isTodayDate && 'border-primary/70'
                    )}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{date.getDate()}</span>
                    {isTodayDate && <span className="text-[10px] uppercase text-primary">Hoje</span>}
                  </div>
                  {dateSlots.length === 0 ? (
                    <p className="mt-auto text-[11px] text-gray-400">Sem horarios</p>
                  ) : (
                    <div className="mt-auto text-[11px] text-primary">
                      {dateSlots.length} horario{dateSlots.length === 1 ? '' : 's'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-gray-500">Data selecionada</p>
          <p className="text-xl font-semibold text-gray-900">
            {selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long'
            })}
          </p>
          <p className="text-sm text-gray-500">
            Registre os horarios em que voce estara disponivel no dia selecionado.
          </p>

          <div className="mt-4 space-y-2">
            {slotsForSelectedDate.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum horario cadastrado para este dia.</p>
            ) : (
              slotsForSelectedDate.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-800">
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slot.id)}
                    disabled={removingId === slot.id}
                    className={clsx(
                      'text-xs font-semibold text-red-600 transition hover:text-red-800',
                      removingId === slot.id && 'opacity-50'
                    )}
                  >
                    {removingId === slot.id ? 'Removendo...' : 'Remover'}
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddSlot} className="mt-6 space-y-3">
            <div className="flex gap-3">
              <label className="flex-1 text-xs font-semibold text-gray-600">
                Inicio
                <input
                  type="time"
                  value={formState.startTime}
                  onChange={(event) => handleInputChange('startTime', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex-1 text-xs font-semibold text-gray-600">
                Fim
                <input
                  type="time"
                  value={formState.endTime}
                  onChange={(event) => handleInputChange('endTime', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className={clsx(
                'w-full rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white',
                saving && 'cursor-not-allowed opacity-60'
              )}
            >
              {saving ? 'Salvando...' : 'Adicionar horario'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

const CompanyAttendanceOverview = () => {
  const today = useMemo(() => new Date(), []);
  const [sellers, setSellers] = useState<SellerWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ startTime: '', endTime: '' });
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SellerWithAvailability[]>('/seller-availability/overview');
      setSellers(data);
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel carregar a agenda dos vendedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sellers.length === 0) {
      setSelectedSellerId(null);
      return;
    }
    if (!selectedSellerId || !sellers.some((seller) => seller.id === selectedSellerId)) {
      setSelectedSellerId(sellers[0].id);
    }
  }, [sellers, selectedSellerId]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const getSellersWithSlotsForDate = useCallback(
    (date: Date) => {
      return sellers
        .map((seller) => {
          const slotsForDay = seller.availabilitySlots.filter((slot) => doesSlotMatchDate(slot, date));
          if (slotsForDay.length === 0) {
            return null;
          }
          return {
            ...seller,
            slotsForDay
          };
        })
        .filter((seller): seller is SellerWithAvailability & { slotsForDay: SellerAvailabilitySlot[] } => seller !== null);
    },
    [sellers]
  );

  const sellersForSelectedDate = useMemo(
    () => getSellersWithSlotsForDate(selectedDate),
    [getSellersWithSlotsForDate, selectedDate]
  );

  const selectedSeller = selectedSellerId ? sellers.find((seller) => seller.id === selectedSellerId) ?? null : null;

  const editableSlots = selectedSeller
    ? selectedSeller.availabilitySlots.filter((slot) => doesSlotMatchDate(slot, selectedDate))
    : [];

  const handleMonthChange = (offset: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSuccessMessage(null);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const available = getSellersWithSlotsForDate(date);
    if (available.length > 0) {
      setSelectedSellerId((prev) => (available.some((seller) => seller.id === prev) ? prev ?? available[0].id : available[0].id));
    }
    setSuccessMessage(null);
    setError(null);
  };

  const handleSellerChange = (sellerId: string) => {
    setSelectedSellerId(sellerId || null);
    setFormState({ startTime: '', endTime: '' });
    setSuccessMessage(null);
  };

  const handleInputChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSellerId) {
      setError('Selecione um vendedor para editar os horarios.');
      return;
    }
    if (!formState.startTime || !formState.endTime) {
      setError('Preencha os horarios antes de salvar.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSaving(true);
    try {
      await api.post(`/seller-availability/manage/${selectedSellerId}`, {
        day: getWeekDayFromDate(selectedDate),
        dayOfMonth: selectedDate.getDate(),
        specificDate: selectedDate.toISOString(),
        startTime: formState.startTime,
        endTime: formState.endTime
      });
      setSuccessMessage('Horario cadastrado para o vendedor selecionado.');
      setFormState({ startTime: '', endTime: '' });
      await load();
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel adicionar o horario para o vendedor.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    if (!selectedSellerId) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setRemovingId(slotId);
    try {
      await api.delete(`/seller-availability/manage/${selectedSellerId}/${slotId}`);
      setSuccessMessage('Horario removido com sucesso.');
      await load();
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel remover o horario.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-10">
        <Loading />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Agenda dos vendedores</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visualize em um calendario quando cada vendedor esta escalado e ajuste a disponibilidade diretamente por aqui.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {sellers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Nenhum vendedor cadastrado ainda. Adicione vendedores na aba &quot;Vendedores&quot; para visualizar os
          horarios aqui.
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[3fr,1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Mes anterior
              </button>
              <p className="text-lg font-semibold text-gray-900">
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Proximo mes
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-gray-400">
              {calendarWeekHeaders.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date) => {
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isTodayDate = isSameDay(date, today);
                const isSelected = isSameDay(date, selectedDate);
                const sellersInDay = getSellersWithSlotsForDate(date);

                return (
                  <button
                    key={date.toDateString()}
                    type="button"
                    onClick={() => handleSelectDate(date)}
                    className={clsx(
                      'flex h-32 min-h-[8rem] min-w-[7.5rem] flex-col rounded-xl border px-4 py-3 text-left transition',
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400',
                      isSelected && 'border-primary bg-primary/10 text-primary',
                      isTodayDate && 'border-primary/70'
                    )}
                  >
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{date.getDate()}</span>
                      {isTodayDate && <span className="text-[10px] uppercase text-primary">Hoje</span>}
                    </div>
                    {sellersInDay.length === 0 ? (
                      <p className="mt-auto text-[11px] text-gray-400">Sem vendedores</p>
                    ) : (
                      <>
                        <p className="mt-auto text-[11px] text-primary">
                          {`${sellersInDay.length} vendedor${sellersInDay.length === 1 ? '' : 'es'}`}
                        </p>
                        <div className="text-[10px] text-gray-500">
                          {sellersInDay.slice(0, 2).map((entry) => (
                            <p key={entry.id} className="truncate">
                              {entry.name}
                            </p>
                          ))}
                          {sellersInDay.length > 2 ? <p>+{sellersInDay.length - 2} outros</p> : null}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-gray-500">Data selecionada</p>
            <p className="text-xl font-semibold text-gray-900">
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long'
              })}
            </p>
            <p className="text-sm text-gray-500">Veja os vendedores escalados e ajuste horarios conforme necessario.</p>

            <div className="mt-4 space-y-2">
              {sellersForSelectedDate.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum vendedor escalado neste dia.</p>
              ) : (
                sellersForSelectedDate.map((entry) => (
                  <div
                    key={entry.id}
                    className={clsx(
                      'rounded-md border px-3 py-2 text-sm',
                      entry.id === selectedSellerId ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{entry.name}</p>
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary underline"
                        onClick={() => handleSellerChange(entry.id)}
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">{entry.slotsForDay.length} horario(s)</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 space-y-3">
              <label className="text-xs font-semibold text-gray-600">
                Selecionar vendedor
                <select
                  value={selectedSellerId ?? ''}
                  onChange={(event) => handleSellerChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Selecione um vendedor</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                {selectedSellerId === null ? (
                  <p className="text-sm text-gray-500">Escolha um vendedor para visualizar e editar os horarios.</p>
                ) : editableSlots.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum horario cadastrado para este vendedor nesta data.</p>
                ) : (
                  editableSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-800">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        disabled={removingId === slot.id}
                        className={clsx(
                          'text-xs font-semibold text-red-600 transition hover:text-red-800',
                          removingId === slot.id && 'opacity-50'
                        )}
                      >
                        {removingId === slot.id ? 'Removendo...' : 'Remover'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddSlot} className="space-y-3">
                <div className="flex gap-3">
                  <label className="flex-1 text-xs font-semibold text-gray-600">
                    Inicio
                    <input
                      type="time"
                      value={formState.startTime}
                      onChange={(event) => handleInputChange('startTime', event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex-1 text-xs font-semibold text-gray-600">
                    Fim
                    <input
                      type="time"
                      value={formState.endTime}
                      onChange={(event) => handleInputChange('endTime', event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving || !selectedSellerId}
                  className={clsx(
                    'w-full rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white',
                    (saving || !selectedSellerId) && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {saving ? 'Salvando...' : 'Adicionar horario'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default function SellerAttendancePage() {
  const { seller } = useAuth();

  if (seller) {
    return <SellerAttendanceManager />;
  }

  return <CompanyAttendanceOverview />;
}

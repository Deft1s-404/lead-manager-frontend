'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import api from "../../../../../lib/api";
import { Client } from "../../../../../types";

type YesNo = "Sim" | "Não";

interface ClientForm {
  name: string;
  email: string;
  contact: string;
  age: string;
  country: string;
  birthDate: string;
  language: string;
  howDidYouKnow: string;
  referredBy: string;
  selfEsteem: string;
  consent: boolean;
  formDate: string;
  signature: string;
  habits: Record<string, YesNo>;
  habitsAdditional: Record<string, string>;
  medical: Record<string, YesNo>;
  medicalAdditional: Record<string, string>;
}

const yesNoOptions: YesNo[] = ["Sim", "Não"];
const howDidYouKnowOptions = ["Instagram", "Facebook", "Outros"];

const initialHabitsQuestions: Record<string, YesNo> = {
  "Já realizou tratamento estético anteriormente?": "Não",
  "Usa cosméticos diariamente?": "Não",
  "Usa protetor solar diariamente?": "Não",
  "Está exposta ao sol?": "Não",
  "Consome bebidas alcoólicas ou fuma?": "Não",
  "Realiza atividade física?": "Não",
  "Usa anticoncepcionais?": "Não",
  "Está grávida ou amamentando?": "Não",
  "Tem filhos?": "Não",
  "Está sob tratamento médico?": "Não",
  "Toma medicamentos ou anticoagulantes?": "Não",
  "Tem alergias?": "Não"
};

const initialHabitsAdditional: Record<string, string> = {
  "Passa mais tempo em pé ou sentada?": ""
};

const initialMedicalQuestions: Record<string, YesNo> = {
  "Reação alérgica a anestésicos?": "Não",
  "Usa marcapasso?": "Não",
  "Alterações cardíacas?": "Não",
  "Epilepsia ou convulsões?": "Não",
  "Alterações psicológicas ou psiquiátricas?": "Não",
  "Pessoa estressada?": "Não",
  "Hipo/hipertensão?": "Não",
  "Diabetes?": "Não",
  "Transtorno circulatório?": "Não",
  "Transtorno renal?": "Não",
  "Transtorno hormonal?": "Não",
  "Transtorno gastrointestinal?": "Não",
  "Antecedente oncológico?": "Não",
  "Doença autoimune?": "Não",
  "Herpes?": "Não",
  "Portador(a) de HIV?": "Não",
  "Prótese metálica ou implante dental?": "Não",
  "Cirurgia plástica ou reparadora?": "Não",
  "Uso de PMMA (preenchimento)?": "Não"
};

const initialMedicalAdditional: Record<string, string> = {
  "Hipo/hipertensão? Usa medicação?": "",
  "Diabetes (Tipo)": "",
  "Uso de PMMA (Zona)": ""
};

const emptyForm: ClientForm = {
  name: "",
  email: "",
  contact: "",
  age: "",
  country: "",
  birthDate: "",
  language: "",
  howDidYouKnow: howDidYouKnowOptions[0],
  referredBy: "",
  selfEsteem: "5",
  consent: false,
  formDate: "",
  signature: "",
  habits: { ...initialHabitsQuestions },
  habitsAdditional: { ...initialHabitsAdditional },
  medical: { ...initialMedicalQuestions },
  medicalAdditional: { ...initialMedicalAdditional }
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toYesNo = (value: unknown): YesNo => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized.startsWith("s") ? "Sim" : "Não";
};

const buildPayloadFromForm = (state: ClientForm) => {
  const responses: Record<string, unknown> = {
    "Como nos conheceu?": state.howDidYouKnow,
    "Recomendação de": state.referredBy,
    "Autoestima (0-10)": state.selfEsteem
  };

  Object.entries(state.habits).forEach(([question, answer]) => {
    responses[question] = answer;
  });

  Object.entries(state.habitsAdditional).forEach(([question, answer]) => {
    if (answer) {
      responses[question] = answer;
    }
  });

  Object.entries(state.medical).forEach(([question, answer]) => {
    responses[question] = answer;
  });

  Object.entries(state.medicalAdditional).forEach(([question, answer]) => {
    if (answer) {
      responses[question] = answer;
    }
  });

  responses["Data do preenchimento"] = state.formDate;
  responses["Assinatura"] = state.signature;
  responses["Concordância com uso de dados"] = state.consent ? "Sim" : "Não";

  return responses;
};

const HABITS_KEYS = Object.keys(initialHabitsQuestions);
const HABITS_ADDITIONAL_KEYS = Object.keys(initialHabitsAdditional);
const MEDICAL_KEYS = Object.keys(initialMedicalQuestions);
const MEDICAL_ADDITIONAL_KEYS = Object.keys(initialMedicalAdditional);

export default function ClientAnamnesisEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    const loadClient = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<Client>(`/clients/${id}`);
        const data = response.data;
        setClient(data);

        const responses = new Map<string, unknown>(
          Object.entries((data.anamnesisResponses as Record<string, unknown>) ?? {}).map(
            ([key, value]) => [normalizeKey(key), value]
          )
        );

        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          contact: data.phone ?? "",
          age:
            data.age !== null && data.age !== undefined
              ? String(data.age)
              : "",
          country: data.country ?? "",
          birthDate: data.birthDate ? data.birthDate.slice(0, 10) : "",
          language: data.language ?? "",
          howDidYouKnow:
            String(responses.get(normalizeKey("Como nos conheceu?")) ?? howDidYouKnowOptions[0]),
          referredBy: String(responses.get(normalizeKey("Recomendação de")) ?? ""),
          selfEsteem: String(responses.get(normalizeKey("Autoestima (0-10)")) ?? "5"),
          consent: String(responses.get(normalizeKey("Concordância com uso de dados")) ?? "")
            .toLowerCase()
            .startsWith("s"),
          formDate: String(responses.get(normalizeKey("Data do preenchimento")) ?? ""),
          signature: String(responses.get(normalizeKey("Assinatura")) ?? ""),
          habits: HABITS_KEYS.reduce((acc, key) => {
            acc[key] = toYesNo(responses.get(normalizeKey(key)));
            return acc;
          }, { ...initialHabitsQuestions } as Record<string, YesNo>),
          habitsAdditional: HABITS_ADDITIONAL_KEYS.reduce((acc, key) => {
            acc[key] = String(responses.get(normalizeKey(key)) ?? "");
            return acc;
          }, { ...initialHabitsAdditional }),
          medical: MEDICAL_KEYS.reduce((acc, key) => {
            acc[key] = toYesNo(responses.get(normalizeKey(key)));
            return acc;
          }, { ...initialMedicalQuestions } as Record<string, YesNo>),
          medicalAdditional: MEDICAL_ADDITIONAL_KEYS.reduce((acc, key) => {
            acc[key] = String(responses.get(normalizeKey(key)) ?? "");
            return acc;
          }, { ...initialMedicalAdditional })
        });
      } catch (error) {
        console.error(error);
        setFeedback({ type: "error", message: "Não foi possível carregar a ficha deste cliente." });
      } finally {
        setIsLoading(false);
      }
    };

    void loadClient();
  }, [params?.id]);

  const updateField = (key: keyof ClientForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRadioChange = (group: 'habits' | 'medical', question: string, value: YesNo) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [question]: value
      }
    }));
  };

  const handleAdditionalChange = (
    group: 'habitsAdditional' | 'medicalAdditional',
    question: string,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [question]: value
      }
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!params?.id) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await api.patch(`/clients/${params.id}`, {
        name: form.name,
        email: form.email || undefined,
        phone: form.contact || undefined,
        age: form.age ? Number(form.age) : undefined,
        country: form.country || undefined,
        birthDate: form.birthDate || undefined,
        language: form.language || undefined,
        anamnesisResponses: buildPayloadFromForm(form)
      });

      setFeedback({ type: "success", message: "Ficha atualizada com sucesso." });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a ficha. Tente novamente."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="mx-auto max-w-5xl space-y-8 px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Carregando ficha do cliente...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Ficha de anamnese</h1>
            <p className="mt-1 text-sm text-gray-500">
              Preencha as respostas com o paciente. As informações serão salvas automaticamente na ficha do cliente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Voltar
            </button>
            {client && (
              <Link
                href={`/clients/${client.id}`}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Ver ficha completa
              </Link>
            )}
          </div>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Dados do cliente */}
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Dados do cliente</h2>
            <p className="mb-6 text-sm text-gray-500">
              Informe os dados pessoais do cliente. Essas informações podem ser atualizadas posteriormente.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-600">
                Nome
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Nome completo"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                E-mail
                <input
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="email"
                  placeholder="nome@exemplo.com"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Telefone
                <input
                  value={form.contact}
                  onChange={(event) => updateField('contact', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Idade
                <input
                  value={form.age}
                  onChange={(event) => updateField('age', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="number"
                  min={0}
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                País
                <input
                  value={form.country}
                  onChange={(event) => updateField('country', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Ex.: Brasil"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Data de nascimento
                <input
                  value={form.birthDate}
                  onChange={(event) => updateField('birthDate', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="date"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Idioma
                <input
                  value={form.language}
                  onChange={(event) => updateField('language', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Idioma principal"
                />
              </label>
            </div>
          </section>

          {/* Conhecendo melhor */}
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Conhecendo melhor</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-600">
                Como nos conheceu?
                <input
                  value={form.howDidYouKnow}
                  onChange={(event) => updateField('howDidYouKnow', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Escolha ou descreva"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Recomendação de
                <input
                  value={form.referredBy}
                  onChange={(event) => updateField('referredBy', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Se houver, informe quem indicou"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Autoestima (0-10)
                <input
                  value={form.selfEsteem}
                  onChange={(event) => updateField('selfEsteem', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="number"
                  min={0}
                  max={10}
                />
              </label>
            </div>
          </section>

          {/* Hábitos */}
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Hábitos e estilo de vida</h2>
            <p className="mb-6 text-sm text-gray-500">
              Registre os hábitos do cliente para personalizar os tratamentos.
            </p>

            <div className="space-y-4">
              {HABITS_KEYS.map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          form.habits[question] === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.habits[question] === option}
                          onChange={() => handleRadioChange('habits', question, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {HABITS_ADDITIONAL_KEYS.map((question) => (
                <label key={question} className="block text-sm font-medium text-gray-600">
                  {question}
                  <input
                    value={form.habitsAdditional[question]}
                    onChange={(event) => handleAdditionalChange('habitsAdditional', question, event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                    placeholder="Descreva brevemente"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Condições médicas */}
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Condições médicas</h2>
            <p className="mb-6 text-sm text-gray-500">
              Informe se o cliente possui alguma condição relevante para a avaliação.
            </p>

            <div className="space-y-4">
              {MEDICAL_KEYS.map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          form.medical[question] === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.medical[question] === option}
                          onChange={() => handleRadioChange('medical', question, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {MEDICAL_ADDITIONAL_KEYS.map((question) => (
                <label key={question} className="block text-sm font-medium text-gray-600">
                  {question}
                  <input
                    value={form.medicalAdditional[question]}
                    onChange={(event) => handleAdditionalChange('medicalAdditional', question, event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                    placeholder="Detalhe se necessário"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Outras informações */}
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Outras informações</h2>
            <p className="mb-6 text-sm text-gray-500">
              Complete os campos finais para concluir a ficha.
            </p>

            <div className="space-y-6">
              {[
                'Prótese metálica ou implante dental?',
                'Cirurgia plástica ou reparadora?',
                'Uso de PMMA (preenchimento)?'
              ].map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          form.medical[question] === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.medical[question] === option}
                          onChange={() => handleRadioChange('medical', question, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(event) => updateField('consent', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  required
                />
                Autorizo o uso de meus dados e imagem conforme a política da clínica.
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Data
                <input
                  type="date"
                  value={form.formDate}
                  onChange={(event) => updateField('formDate', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Assinatura digital
                <textarea
                  value={form.signature}
                  onChange={(event) => updateField('signature', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  rows={3}
                  placeholder="Digite o nome completo para validar a assinatura digital."
                />
              </label>
            </div>
          </section>

          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar ficha'}
          </button>
        </form>
      </div>
    </div>
  );
}


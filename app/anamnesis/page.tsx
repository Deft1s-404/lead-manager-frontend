"use client";

import { FormEvent, useState } from 'react';

type YesNo = 'Sim' | 'Não';

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
  interest: string;
  consent: boolean;
  formDate: string;
  signature: string;
  habits: Record<string, YesNo>;
  habitsAdditional: Record<string, string>;
  medical: Record<string, YesNo>;
  medicalAdditional: Record<string, string>;
}

const yesNoOptions: YesNo[] = ['Sim', 'Não'];

const initialHabitsQuestions: Record<string, YesNo> = {
  'Já realizou tratamento estético anteriormente?': 'Não',
  'Usa cosméticos diariamente?': 'Não',
  'Usa protetor solar diariamente?': 'Não',
  'Está exposta ao sol?': 'Não',
  'Consome bebidas alcoólicas ou fuma?': 'Não',
  'Realiza atividade física?': 'Não',
  'Usa anticoncepcionais?': 'Não',
  'Está grávida ou amamentando?': 'Não',
  'Tem filhos?': 'Não',
  'Está sob tratamento médico?': 'Não',
  'Toma medicamentos ou anticoagulantes?': 'Não',
  'Tem alergias?': 'Não'
};

const initialHabitsAdditional: Record<string, string> = {
  'Passa mais tempo em pé ou sentada?': ''
};

const initialMedicalQuestions: Record<string, YesNo> = {
  'Reação alérgica a anestésicos?': 'Não',
  'Usa marcapasso?': 'Não',
  'Alterações cardíacas?': 'Não',
  'Epilepsia ou convulsões?': 'Não',
  'Alterações psicológicas ou psiquiátricas?': 'Não',
  'Pessoa estressada?': 'Não',
  'Hipo/hipertensão?': 'Não',
  'Diabetes?': 'Não',
  'Transtorno circulatório?': 'Não',
  'Transtorno renal?': 'Não',
  'Transtorno hormonal?': 'Não',
  'Transtorno gastrointestinal?': 'Não',
  'Antecedente oncológico?': 'Não',
  'Doença autoimune?': 'Não',
  'Herpes?': 'Não',
  'Portador(a) de HIV?': 'Não',
  'Prótese metálica ou implante dental?': 'Não',
  'Cirurgia plástica ou reparadora?': 'Não',
  'Uso de PMMA (preenchimento)?': 'Não'
};

const initialMedicalAdditional: Record<string, string> = {
  'Hipo/hipertensão? Usa medicação?': '',
  'Diabetes (Tipo)': '',
  'Uso de PMMA (Zona)': ''
};

const howDidYouKnowOptions = ['Instagram', 'Facebook', 'Outros'];

const initialForm: ClientForm = {
  name: '',
  email: '',
  contact: '',
  age: '',
  country: '',
  birthDate: '',
  language: '',
  howDidYouKnow: howDidYouKnowOptions[0],
  referredBy: '',
  selfEsteem: '5',
  interest: '',
  consent: false,
  formDate: '',
  signature: '',
  habits: { ...initialHabitsQuestions },
  habitsAdditional: { ...initialHabitsAdditional },
  medical: { ...initialMedicalQuestions },
  medicalAdditional: { ...initialMedicalAdditional }
};

const API_ENDPOINT =
  typeof window !== 'undefined'
    ? ((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api') + '/integrations/forms/google')
    : '/api/integrations/forms/google';

export default function AnamnesisPage() {
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const buildAnamnesisPayload = (state: ClientForm) => {
    const responses: Record<string, unknown> = {
      'Como nos conheceu?': state.howDidYouKnow,
      'Recomendação de': state.referredBy,
      'Autoestima (0-10)': state.selfEsteem
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

    responses['Data do preenchimento'] = form.formDate;
    responses['Assinatura'] = form.signature;
    responses['Concordância com uso de dados'] = form.consent ? 'Sim' : 'Não';

    return responses;
  };

  const resetForm = () => setForm(initialForm);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.contact || undefined,
        age: form.age ? Number(form.age) : undefined,
        country: form.country || undefined,
        birthDate: form.birthDate || undefined,
        language: form.language || undefined,
        source: 'WhatsApp',
        interest: form.interest || undefined,
        tags: form.interest ? [form.interest] : [],
        notes: undefined,
        anamnesisResponses: buildAnamnesisPayload(form)
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Erro ao enviar formulário.');
      }

      resetForm();
      setFeedback({ type: 'success', message: 'Formulário enviado com sucesso.' });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao enviar o formulário. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto max-w-5xl space-y-10 px-4">
        <header className="text-center">
          <h1 className="text-4xl font-semibold text-slate-900">Anamnese Geral</h1>
          <p className="mt-4 text-sm text-gray-500">
            Preencha cuidadosamente todas as informações para que possamos oferecer um atendimento mais seguro e
            personalizado.
          </p>
        </header>

        <form className="space-y-8" onSubmit={handleSubmit}>
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
                  onChange={(event) => updateField('name', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Nome completo"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                E-mail
                <input
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="email"
                  placeholder="nome@exemplo.com"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Telefone
                <input
                  value={form.contact}
                  onChange={(event) => updateField('contact', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Idade
                <input
                  value={form.age}
                  onChange={(event) => updateField('age', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="number"
                  min={0}
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                País
                <input
                  value={form.country}
                  onChange={(event) => updateField('country', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Ex.: Brasil"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Data de nascimento
                <input
                  value={form.birthDate}
                  onChange={(event) => updateField('birthDate', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="date"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Idioma
                <input
                  value={form.language}
                  onChange={(event) => updateField('language', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Idioma principal"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Conhecendo melhor</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-600">
                Como nos conheceu?
                <input
                  value={form.howDidYouKnow}
                  onChange={(event) => updateField('howDidYouKnow', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Escolha ou descreva"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Recomendação de
                <input
                  value={form.referredBy}
                  onChange={(event) => updateField('referredBy', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Se houver, informe quem indicou"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Autoestima (0-10)
                <input
                  value={form.selfEsteem}
                  onChange={(event) => updateField('selfEsteem', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  type="number"
                  min={0}
                max={10}
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Interesse
                <input
                  value={form.interest}
                  onChange={(event) => updateField('interest', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Ex.: botox, harmonizacao"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Hábitos e estilo de vida</h2>
            <p className="mb-6 text-sm text-gray-500">
              Registre os hábitos do cliente para personalizar os tratamentos.
            </p>

            <div className="space-y-4">
              {Object.keys(form.habits).map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => {
                      const selected = form.habits[question] === option;
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            className="hidden"
                            checked={selected}
                            onChange={() => handleRadioChange('habits', question, option)}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-600">
                Passa mais tempo em pé ou sentada?
                <input
                  value={form.habitsAdditional['Passa mais tempo em pé ou sentada?']}
                  onChange={(event) =>
                    handleAdditionalChange(
                      'habitsAdditional',
                      'Passa mais tempo em pé ou sentada?',
                      event.target.value as string
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Descreva brevemente"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Condições médicas</h2>
            <p className="mb-6 text-sm text-gray-500">
              Informe se o cliente possui alguma condição médica relevante.
            </p>

            <div className="space-y-4">
              {Object.keys(form.medical).map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => {
                      const selected = form.medical[question] === option;
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            className="hidden"
                            checked={selected}
                            onChange={() => handleRadioChange('medical', question, option)}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-600">
                Hipo/hipertensão? Usa medicação?
                <input
                  value={form.medicalAdditional['Hipo/hipertensão? Usa medicação?']}
                  onChange={(event) =>
                    handleAdditionalChange(
                      'medicalAdditional',
                      'Hipo/hipertensão? Usa medicação?',
                      event.target.value as string
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Detalhe a medicação e a frequência"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Diabetes (Tipo)
                <input
                  value={form.medicalAdditional['Diabetes (Tipo)']}
                  onChange={(event) =>
                    handleAdditionalChange('medicalAdditional', 'Diabetes (Tipo)', event.target.value as string)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Tipo 1, Tipo 2, gestacional, etc."
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Uso de PMMA (Zona)
                <input
                  value={form.medicalAdditional['Uso de PMMA (Zona)']}
                  onChange={(event) =>
                    handleAdditionalChange(
                      'medicalAdditional',
                      'Uso de PMMA (Zona)',
                      event.target.value as string
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  placeholder="Informe a região onde foi aplicado"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Outras informações</h2>
            <p className="mb-6 text-sm text-gray-500">
              Complete os dados finais para concluir o formulário.
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
                    {yesNoOptions.map((option) => {
                      const selected = form.medical[question] === option;
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            className="hidden"
                            checked={selected}
                            onChange={() => handleRadioChange('medical', question, option)}
                          />
                          {option}
                        </label>
                      );
                    })}
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
                  onChange={(event) => updateField('formDate', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Assinatura digital
                <textarea
                  value={form.signature}
                  onChange={(event) => updateField('signature', event.target.value as string)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none"
                  rows={3}
                  placeholder="Digite seu nome completo para validar a assinatura digital."
                />
              </label>
            </div>
          </section>

          {feedback && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !form.consent}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar formulário'}
          </button>
        </form>
      </div>
    </div>
  );
}














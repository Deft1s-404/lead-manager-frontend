export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  apiKey?: string;
}

export interface AuthenticatedSeller {
  id: string;
  name: string;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  source?: string | null;
  tags: string[];
  score: number;
  status: string;
  createdAt: string;
  notes?: string | null;
  age?: number | null;
  country?: string | null;
  birthDate?: string | null;
  language?: string | null;
  anamnesisResponses?: Record<string, unknown> | null;
}

export interface Aluno {
  id: string;
  nomeCompleto: string;
  telefone?: string | null;
  pais?: string | null;
  email?: string | null;
  profissao?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseLead {
  id: string;
  nomeCompleto: string;
  telefone?: string | null;
  pais?: string | null;
  email?: string | null;
  origem: string;
  nota?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name?: string | null;
  email?: string | null;
  contact?: string | null;
  source?: string | null;
  notes?: string | null;
  score: number;
  stage: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Seller {
  id: string;
  name: string;
  email?: string | null;
  contactNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerAvailabilitySlot {
  id: string;
  day: WeekDay;
  dayOfMonth?: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export type WeekDay =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

export interface Appointment {
  id: string;
  leadId: string;
  start: string;
  end: string;
  createdAt: string;
  status: string;
  meetLink?: string | null;
  googleEventId?: string | null;
  lead: {
    id: string;
    name?: string | null;
    email?: string | null;
    contact?: string | null;
    stage?: string | null;
  };
}

export interface CampaignLog {
  id: string;
  message: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  message: string;
  imageUrl?: string | null;
  status: string;
  scheduledAt?: string | null;
  logs?: CampaignLog[];
}

export interface FunnelReport {
  counts: Record<string, number>;
  conversionRate: number;
}

export interface TimeSeriesItem {
  label: string;
  total: number;
}

export interface AppointmentsReport {
  byStatus: Record<string, number>;
  byWeek: TimeSeriesItem[];
}

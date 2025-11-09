import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ngjnqasglqqwspybnets.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nam5xYXNnbHFxd3NweWJuZXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDU3NjksImV4cCI6MjA3ODIyMTc2OX0.PW1Z9QIFJwAHzP_EN-uyIPha5cmYe9SmWMT67rB7i8k';

console.log('🔧 Supabase Config:', {
  url: supabaseUrl ? '✅ Presente' : '❌ Ausente',
  key: supabaseAnonKey ? '✅ Presente' : '❌ Ausente',
  urlValue: supabaseUrl,
  source: import.meta.env.VITE_SUPABASE_URL ? 'env file' : 'fallback'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente ausentes:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'presente' : 'ausente',
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Profile = {
  id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
};

export type Expense = {
  id: string;
  title: string;
  total_amount: number;
  category_id: string;
  created_by: string;
  installments: number;
  is_fixed: boolean;
  start_date: string;
  notes?: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'active' | 'paid';
  is_recurring: boolean;
  recurrence_day?: number;
  parent_expense_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
  category?: ExpenseCategory;
  creator?: Profile;
};

export type ExpenseDeletionLog = {
  id: string;
  expense_id: string;
  expense_title: string;
  expense_amount: number;
  deleted_by: string;
  deletion_reason: string;
  deleted_at: string;
  expense_data: any;
  deleter?: Profile;
};

export type InstallmentPayment = {
  id: string;
  expense_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid';
  created_at: string;
  expense?: Expense;
};

export type PaymentContribution = {
  id: string;
  installment_id: string;
  user_id: string;
  amount: number;
  paid_at: string;
  notes?: string;
  created_at: string;
  user?: Profile;
  installment?: InstallmentPayment;
};

export type AuditLog = {
  id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  description: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
  user?: Profile;
};

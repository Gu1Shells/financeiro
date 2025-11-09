import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

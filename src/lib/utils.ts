import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Patient {
  id: number;
  nome: string;
  cpf: string;
  data_nascimento: string;
  codigo: string;
  role: 'patient';
}

export interface Admin {
  role: 'admin';
}

export type User = Patient | Admin | null;

export interface Exam {
  id: number;
  paciente_id: number;
  tipo_exame: string;
  data_coleta: string;
  data_liberacao: string | null;
  status: 'Liberado' | 'Em análise';
  arquivo_pdf: string | null;
  medico_responsavel: string | null;
  paciente_nome?: string;
}

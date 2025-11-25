// Este arquivo define os tipos de dados e as regras de negócio

// --- CONFIGURAÇÃO ---
export interface GenerationConfig {
  // ALTERADO (v9): Permite string (texto bruto) OU string[] (já processado)
  // Isso resolve a ambiguidade entre o contexto de UI e o Motor e corrige o erro do split
  students: string | string[]; 
  servicePosts: string[];
  slots: number[];
  month: number;
  year: number;
  ignoredDays: number[];
  responsible: string;
  responsiblePosition: string;
  
  isCycleEnabled: boolean; 
  cyclePostToRemove: string; 

  historicalMonth?: number; 
  historicalYear?: number;  

  // Modo de Grupos Manuais
  isGroupMode: boolean; 
  manualGroups: ManualGroup[]; 
}

export interface ManualGroup {
  id: string;
  name: string;
  students: string;
}

export interface HistoricalStats {
  studentId: string;
  accumulatedServices: number;
  accumulatedPostCounts: Record<string, number>;
}

export interface ScheduleCell {
  student: string | null;
  isWeekend: boolean;
  isIgnoredDay: boolean;
}

export interface ScheduleDay {
  day: number;
  dayOfWeek: number;
  dayOfWeekInitial: string;
  assignments: Record<string, number>;
}

export interface GenerationResult {
  scheduleData: Record<string, Record<number, ScheduleCell>>;
  scheduleTitle: string;
  daysInMonth: number;
  allDays: ScheduleDay[];
  postRows: string[];
  ignoredDays: Set<number>;
  studentQueues: any; 
  queueIndices: any;  
  warnings: string[];
}

export interface StudentStats {
  student: string;
  class: string; 
  totalShifts: number;
  totalDaysOff: number;
  postBreakdown: Record<string, number>;
  accumulatedServices: number;
  accumulatedPostCounts: Record<string, number>;
}

export interface AnalyticsResult {
  studentStats: StudentStats[];
  dailyClassDistribution: Record<string, Record<string, number>>;
  totalStudents: number;
  totalShiftsAssigned: number;
  averageShiftsPerStudent: number;
  postDistribution: Record<string, number>;
}

export interface ExportData {
  tipo: "configuracao_escala_pm";
  dataExportacao: string;
  escala_postos: string;
  escala_vagas: string;
  escala_responsavel: string;
  escala_cargo_responsavel: string;
  escala_ciclo_ativo: string;
  escala_ciclo_posto: string;
  escala_alunos: string;
  escala_alunos_count: string;
  escala_alunos_excluidos: string;
  escala_turmas_count: string;
  escala_alunas_pfem: string;
  escala_alunas_restricoes: string;
  escala_stats_compensacao?: StudentStats[];
  escala_mes_historico?: number;
  escala_ano_historico?: number;
  
  escala_modo_grupos?: string; 
  escala_grupos_manuais?: ManualGroup[];
}

export type LocalStorageData = {
  [K in keyof Omit<ExportData, 'tipo' | 'dataExportacao' | 'escala_stats_compensacao' | 'escala_mes_historico' | 'escala_ano_historico' | 'escala_grupos_manuais'>]: string | undefined;
} & {
  escala_dias_ignorar?: string;
  escala_stats_compensacao?: StudentStats[];
  escala_mes_historico?: number;
  escala_ano_historico?: number;
  escala_grupos_manuais?: ManualGroup[]; 
};

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const DAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function getStudentClass(studentId: string): string {
  const id = parseInt(studentId.trim(), 10);
  if (isNaN(id)) return 'N/A';
  if (id >= 1 && id <= 25) return 'A';
  if (id >= 26 && id <= 50) return 'B';
  if (id >= 51 && id <= 74) return 'C';
  return 'N/A';
}
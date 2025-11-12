import { z } from "zod";

// ============================================================================
// DOMAIN TYPES - Gerador de Escala Mensal
// ============================================================================

// --- Student & Class Management ---
export type StudentClass = 'A' | 'B' | 'C' | 'N/A';

export const studentSchema = z.object({
  number: z.string(),
  class: z.enum(['A', 'B', 'C', 'N/A']),
});

export type Student = z.infer<typeof studentSchema>;

// --- Service Posts Configuration ---
export const servicePostSchema = z.object({
  name: z.string(),
  slots: z.number().int().positive(),
});

export type ServicePost = z.infer<typeof servicePostSchema>;

// Expanded rows for display (e.g., "sentinelas (1/3)")
export const servicePostRowSchema = z.object({
  rowName: z.string(),
  baseName: z.string(), // Original post name
});

export type ServicePostRow = z.infer<typeof servicePostRowSchema>;

// --- Schedule Cell (one student assignment) ---
export const scheduleCellSchema = z.object({
  student: z.string().nullable(),
  isWeekend: z.boolean().optional(),
  isIgnoredDay: z.boolean().optional(),
});

export type ScheduleCell = z.infer<typeof scheduleCellSchema>;

// --- Schedule Day ---
export const scheduleDaySchema = z.object({
  day: z.number().int().positive(),
  dayOfWeek: z.number().int().min(0).max(6),
  dayOfWeekInitial: z.string(),
  assignments: z.record(z.string(), scheduleCellSchema), // Key: rowName, Value: ScheduleCell
});

export type ScheduleDay = z.infer<typeof scheduleDaySchema>;

// --- Generation Configuration ---
export const generationConfigSchema = z.object({
  students: z.array(z.string()).min(1, "Lista de alunos não pode estar vazia"),
  servicePosts: z.array(z.string()).min(1, "Lista de postos não pode estar vazia"),
  slots: z.array(z.number().int().positive()).min(1, "Lista de vagas não pode estar vazia"),
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
  ignoredDays: z.array(z.number().int().positive()).optional().default([]),
  responsible: z.string().optional().default(""),
  responsiblePosition: z.string().optional().default("Chefe do Corpo de Alunos"),
});

export type GenerationConfig = z.infer<typeof generationConfigSchema>;

// --- Generation Result ---
export const generationResultSchema = z.object({
  scheduleData: z.record(z.string(), z.record(z.number(), scheduleCellSchema)),
  scheduleTitle: z.string(),
  daysInMonth: z.number(),
  allDays: z.array(scheduleDaySchema),
  postRows: z.array(z.string()),
  ignoredDays: z.set(z.number()),
  studentQueues: z.object({
    A: z.array(z.string()),
    B: z.array(z.string()),
    C: z.array(z.string()),
  }),
  queueIndices: z.object({
    A: z.number(),
    B: z.number(),
    C: z.number(),
  }),
});

export type GenerationResult = z.infer<typeof generationResultSchema>;

// --- Analytics Result ---
export const studentStatsSchema = z.object({
  student: z.string(),
  class: z.string(),
  totalShifts: z.number(),
  totalDaysOff: z.number(),
  postBreakdown: z.record(z.string(), z.number()),
});

export type StudentStats = z.infer<typeof studentStatsSchema>;

export const analyticsResultSchema = z.object({
  studentStats: z.array(studentStatsSchema),
  totalStudents: z.number(),
  totalShiftsAssigned: z.number(),
  averageShiftsPerStudent: z.number(),
  postDistribution: z.record(z.string(), z.number()),
});

export type AnalyticsResult = z.infer<typeof analyticsResultSchema>;

// --- Persistence (Import/Export) ---
export const exportDataSchema = z.object({
  tipo: z.literal("configuracao_escala_pm"),
  dataExportacao: z.string(),
  alunosProximoMes: z.array(z.string()),
  postos: z.string(),
  vagas: z.string(),
  responsavel: z.string().optional(),
  cargo_responsavel: z.string().optional(),
});

export type ExportData = z.infer<typeof exportDataSchema>;

// --- Local Storage Data ---
export const localStorageDataSchema = z.object({
  escala_alunos: z.string().optional(),
  escala_postos: z.string().optional(),
  escala_vagas: z.string().optional(),
  escala_responsavel: z.string().optional(),
  escala_cargo_responsavel: z.string().optional(),
  escala_dias_ignorar: z.string().optional(),
});

export type LocalStorageData = z.infer<typeof localStorageDataSchema>;

// ============================================================================
// HELPERS
// ============================================================================

export function getStudentClass(studentNumber: string): StudentClass {
  const num = parseInt(studentNumber, 10);
  if (isNaN(num)) return 'N/A';
  
  if (num >= 1 && num <= 25) return 'A';
  if (num >= 26 && num <= 50) return 'B';
  if (num >= 51 && num <= 74) return 'C';
  return 'N/A';
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

// ============================================================================
// LEGACY TYPES (for storage.ts compatibility)
// ============================================================================

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export const insertUserSchema = userSchema.omit({ id: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

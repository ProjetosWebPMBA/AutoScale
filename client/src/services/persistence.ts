import type { ExportData, LocalStorageData } from "@shared/schema";

// ============================================================================
// LOCAL STORAGE OPERATIONS
// ============================================================================

const STORAGE_KEYS = {
  STUDENTS: 'escala_alunos',
  POSTS: 'escala_postos',
  SLOTS: 'escala_vagas',
  RESPONSIBLE: 'escala_responsavel',
  RESPONSIBLE_POSITION: 'escala_cargo_responsavel',
  IGNORED_DAYS: 'escala_dias_ignorar',
} as const;

/**
 * Load configuration from localStorage
 */
export function loadFromLocalStorage(): LocalStorageData {
  return {
    escala_alunos: localStorage.getItem(STORAGE_KEYS.STUDENTS) || undefined,
    escala_postos: localStorage.getItem(STORAGE_KEYS.POSTS) || undefined,
    escala_vagas: localStorage.getItem(STORAGE_KEYS.SLOTS) || undefined,
    escala_responsavel: localStorage.getItem(STORAGE_KEYS.RESPONSIBLE) || undefined,
    escala_cargo_responsavel: localStorage.getItem(STORAGE_KEYS.RESPONSIBLE_POSITION) || undefined,
    escala_dias_ignorar: localStorage.getItem(STORAGE_KEYS.IGNORED_DAYS) || undefined,
  };
}

/**
 * Save configuration to localStorage
 */
export function saveToLocalStorage(data: Partial<LocalStorageData>): void {
  if (data.escala_alunos !== undefined) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, data.escala_alunos);
  }
  if (data.escala_postos !== undefined) {
    localStorage.setItem(STORAGE_KEYS.POSTS, data.escala_postos);
  }
  if (data.escala_vagas !== undefined) {
    localStorage.setItem(STORAGE_KEYS.SLOTS, data.escala_vagas);
  }
  if (data.escala_responsavel !== undefined) {
    localStorage.setItem(STORAGE_KEYS.RESPONSIBLE, data.escala_responsavel);
  }
  if (data.escala_cargo_responsavel !== undefined) {
    localStorage.setItem(STORAGE_KEYS.RESPONSIBLE_POSITION, data.escala_cargo_responsavel);
  }
  if (data.escala_dias_ignorar !== undefined) {
    localStorage.setItem(STORAGE_KEYS.IGNORED_DAYS, data.escala_dias_ignorar);
  }
}

/**
 * Clear all data from localStorage
 */
export function clearLocalStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============================================================================
// EXPORT/IMPORT JSON OPERATIONS
// ============================================================================

/**
 * Generate export data with rotated student order for next month
 */
export function createExportData(
  studentQueues: { A: string[]; B: string[]; C: string[] },
  queueIndices: { A: number; B: number; C: number },
  postsText: string,
  slotsText: string,
  responsible: string,
  responsiblePosition: string,
  currentMonth: number,
  currentYear: number
): { data: ExportData; filename: string } {
  // Rotate queues to start from current indices
  const rotatedA = [
    ...studentQueues.A.slice(queueIndices.A),
    ...studentQueues.A.slice(0, queueIndices.A),
  ];
  const rotatedB = [
    ...studentQueues.B.slice(queueIndices.B),
    ...studentQueues.B.slice(0, queueIndices.B),
  ];
  const rotatedC = [
    ...studentQueues.C.slice(queueIndices.C),
    ...studentQueues.C.slice(0, queueIndices.C),
  ];

  const studentsNextMonth = [...rotatedA, ...rotatedB, ...rotatedC];

  const exportData: ExportData = {
    tipo: "configuracao_escala_pm",
    dataExportacao: new Date().toISOString(),
    alunosProximoMes: studentsNextMonth,
    postos: postsText,
    vagas: slotsText,
    responsavel: responsible,
    cargo_responsavel: responsiblePosition,
  };

  // Calculate next month for filename
  const nextDate = new Date(currentYear, currentMonth + 1, 1);
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
  const nextYear = nextDate.getFullYear();
  const filename = `config_escala_para_${nextYear}-${nextMonth}.json`;

  return { data: exportData, filename };
}

/**
 * Download JSON file
 */
export function downloadJSON(data: ExportData, filename: string): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse imported JSON file
 */
export function parseImportedJSON(content: string): ExportData {
  const importedData = JSON.parse(content);

  if (
    importedData.tipo !== "configuracao_escala_pm" ||
    !importedData.alunosProximoMes ||
    !importedData.postos ||
    !importedData.vagas
  ) {
    throw new Error('Arquivo inválido ou não é um arquivo de progressão.');
  }

  return importedData;
}

/**
 * Apply imported data to configuration
 */
export function applyImportedData(data: ExportData): LocalStorageData {
  return {
    escala_alunos: data.alunosProximoMes.join('\n'),
    escala_postos: data.postos,
    escala_vagas: data.vagas,
    escala_responsavel: data.responsavel || '',
    escala_cargo_responsavel: data.cargo_responsavel || '',
  };
}

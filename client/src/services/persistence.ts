import type { ExportData, LocalStorageData, StudentStats, ManualGroup } from "@shared/schema";

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
  STUDENT_COUNT: 'escala_alunos_count',
  EXCLUDED_STUDENTS: 'escala_alunos_excluidos',
  CLASS_COUNT: 'escala_turmas_count',
  CYCLE_ENABLED: 'escala_ciclo_ativo',
  CYCLE_POST: 'escala_ciclo_posto',
  HISTORICAL_MONTH: 'escala_mes_historico',
  HISTORICAL_YEAR: 'escala_ano_historico',
  FEMALE_STUDENTS: 'escala_alunas_pfem',
  FEMALE_RESTRICTIONS: 'escala_alunas_restricoes',
  // NOVO: Grupos Manuais
  IS_GROUP_MODE: 'escala_modo_grupos',
  MANUAL_GROUPS: 'escala_grupos_manuais',
} as const;

export function loadFromLocalStorage(): LocalStorageData {
  const data: LocalStorageData = {
    escala_alunos: localStorage.getItem(STORAGE_KEYS.STUDENTS) || undefined,
    escala_postos: localStorage.getItem(STORAGE_KEYS.POSTS) || undefined,
    escala_vagas: localStorage.getItem(STORAGE_KEYS.SLOTS) || undefined,
    escala_responsavel: localStorage.getItem(STORAGE_KEYS.RESPONSIBLE) || undefined,
    escala_cargo_responsavel: localStorage.getItem(STORAGE_KEYS.RESPONSIBLE_POSITION) || undefined,
    escala_dias_ignorar: localStorage.getItem(STORAGE_KEYS.IGNORED_DAYS) || undefined,
    
    escala_alunos_count: localStorage.getItem(STORAGE_KEYS.STUDENT_COUNT) || undefined,
    escala_alunos_excluidos: localStorage.getItem(STORAGE_KEYS.EXCLUDED_STUDENTS) || undefined,
    escala_turmas_count: localStorage.getItem(STORAGE_KEYS.CLASS_COUNT) || undefined,
    escala_ciclo_ativo: localStorage.getItem(STORAGE_KEYS.CYCLE_ENABLED) || undefined,
    escala_ciclo_posto: localStorage.getItem(STORAGE_KEYS.CYCLE_POST) || undefined,
    escala_alunas_pfem: localStorage.getItem(STORAGE_KEYS.FEMALE_STUDENTS) || undefined,
    escala_alunas_restricoes: localStorage.getItem(STORAGE_KEYS.FEMALE_RESTRICTIONS) || undefined,
    
    escala_modo_grupos: localStorage.getItem(STORAGE_KEYS.IS_GROUP_MODE) || undefined,
  };
  
  const histMonth = localStorage.getItem(STORAGE_KEYS.HISTORICAL_MONTH);
  const histYear = localStorage.getItem(STORAGE_KEYS.HISTORICAL_YEAR);
  if (histMonth !== null) data.escala_mes_historico = parseInt(histMonth, 10);
  if (histYear !== null) data.escala_ano_historico = parseInt(histYear, 10);

  const groupsJson = localStorage.getItem(STORAGE_KEYS.MANUAL_GROUPS);
  if (groupsJson) {
    try {
      data.escala_grupos_manuais = JSON.parse(groupsJson);
    } catch (e) {
      console.error("Erro ao ler grupos manuais do cache", e);
    }
  }
  
  return data;
}

export function saveToLocalStorage(data: Partial<LocalStorageData>): void {
  const dataToSave: Record<string, any> = { ...data };

  for (const key in dataToSave) {
    const k = key as keyof typeof dataToSave;
    if (dataToSave[k] !== undefined) {
      if (k === 'escala_stats_compensacao') continue;
      
      const value = dataToSave[k];
      const storageKey = key as keyof LocalStorageData; 

      if (key === 'escala_grupos_manuais') {
         localStorage.setItem(STORAGE_KEYS.MANUAL_GROUPS, JSON.stringify(value));
      } else if (typeof value === 'number') {
        localStorage.setItem(storageKey as string, String(value));
      } else if (typeof value === 'string') {
        localStorage.setItem(storageKey as string, value);
      } else if (value === null) {
        localStorage.removeItem(storageKey as string);
      }
    }
  }
}

export function clearLocalStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  localStorage.removeItem('escala_stats_compensacao');
}

export function createExportData(
  studentQueues: Record<string, string[]>, 
  queueIndices: Record<string, number>, 
  postsText: string,
  slotsText: string,
  responsible: string,
  responsiblePosition: string,
  currentMonth: number, 
  currentYear: number, 
  isCycleEnabled: boolean, 
  cyclePostToRemove: string,
  historicalMonth?: number,
  historicalYear?: number,
  isGroupMode?: boolean,
  manualGroups?: ManualGroup[],
  // NOVO: Recebe stats completos para garantir persistência do rodízio
  compensationStats?: StudentStats[] 
): Partial<ExportData> { 
  
  const exportData: Partial<ExportData> = {
    tipo: "configuracao_escala_pm",
    dataExportacao: new Date().toISOString(),
    escala_postos: postsText,
    escala_vagas: slotsText,
    escala_responsavel: responsible,
    escala_cargo_responsavel: responsiblePosition,
    escala_ciclo_ativo: String(isCycleEnabled),
    escala_ciclo_posto: cyclePostToRemove,
    // O histórico exportado é o mês ATUAL que acabou de ser gerado, 
    // para servir de base para o PRÓXIMO mês.
    escala_mes_historico: currentMonth,
    escala_ano_historico: currentYear,
    escala_modo_grupos: String(isGroupMode),
    escala_grupos_manuais: manualGroups,
    escala_stats_compensacao: compensationStats, // Dados vitais para o equilíbrio
  };

  return exportData;
}

export function downloadJSON(data: any, filename: string): void {
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

export function parseImportedJSON(content: string): ExportData {
  const importedData = JSON.parse(content);
  if (importedData.tipo !== "configuracao_escala_pm") {
    throw new Error('Arquivo inválido ou não é um arquivo de configuração de escala.');
  }
  return importedData;
}

export function applyImportedData(data: ExportData): LocalStorageData {
  return {
    escala_alunos: data.escala_alunos || undefined,
    escala_postos: data.escala_postos || undefined,
    escala_vagas: data.escala_vagas || undefined,
    escala_responsavel: data.escala_responsavel || undefined,
    escala_cargo_responsavel: data.escala_cargo_responsavel || undefined,
    escala_ciclo_ativo: data.escala_ciclo_ativo || undefined,
    escala_ciclo_posto: data.escala_ciclo_posto || undefined,
    escala_alunos_count: data.escala_alunos_count || undefined,
    escala_alunos_excluidos: data.escala_alunos_excluidos || undefined,
    escala_turmas_count: data.escala_turmas_count || undefined,
    // Importa o stats completo contendo accumulatedServices e accumulatedPostCounts
    escala_stats_compensacao: data.escala_stats_compensacao || undefined, 
    escala_alunas_pfem: data.escala_alunas_pfem || undefined,
    escala_alunas_restricoes: data.escala_alunas_restricoes || undefined,
    escala_mes_historico: data.escala_mes_historico,
    escala_ano_historico: data.escala_ano_historico,
    escala_modo_grupos: data.escala_modo_grupos,
    escala_grupos_manuais: data.escala_grupos_manuais,
  };
}
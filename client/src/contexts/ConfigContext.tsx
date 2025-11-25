import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { GenerationConfig, ManualGroup } from '@shared/schema'; 
import { loadFromLocalStorage } from '@/services/persistence';

const initialStudentCount = 74;
const initialStudents = Array.from({ length: initialStudentCount }, (_, i) => i + 1).join('\n');
const initialPosts = "Aluno de dia\nCmd da guarda\nsentinelas\nplantões masc\nplantões sala de meios\nserviço de rancho";
const initialSlots = "1\n1\n3\n3\n3\n5";

// Estendemos a config localmente
type LocalGenerationConfig = GenerationConfig & {
  studentCount: number;
  excludedStudents: string;
  classCount: number; 
  femaleStudents: string; 
  femaleRestrictedPosts: string[]; 
  historicalMonth?: number;
  historicalYear?: number;
  // NOVO: Manual Groups
  isGroupMode: boolean;
  manualGroups: ManualGroup[];
};

const getDefaultConfig = (): LocalGenerationConfig => {
  const now = new Date();
  return {
    students: initialStudents,
    studentCount: initialStudentCount,
    excludedStudents: "",
    classCount: 3,
    servicePosts: initialPosts,
    slots: initialSlots,
    month: now.getMonth(),
    year: now.getFullYear(),
    ignoredDays: [],
    responsible: "FULANO DE TAL - CAP PM",
    responsiblePosition: "Chefe do Corpo de Alunos",
    isCycleEnabled: false,
    cyclePostToRemove: "",
    femaleStudents: "", 
    femaleRestrictedPosts: [],
    historicalMonth: undefined,
    historicalYear: undefined,
    // Padrão
    isGroupMode: false,
    manualGroups: [],
  };
};

type ConfigContextType = {
  config: LocalGenerationConfig;
  updateConfig: (newConfig: Partial<LocalGenerationConfig>) => void;
  getStudentClass: (studentId: string) => string;
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<LocalGenerationConfig>(() => {
    const loaded = loadFromLocalStorage();
    const defaults = getDefaultConfig();

    const loadedStudentString = loaded.escala_alunos || defaults.students;
    const loadedStudentCount = loaded.escala_alunos_count
      ? parseInt(loaded.escala_alunos_count, 10)
      : loadedStudentString.split('\n').filter(Boolean).length;
    
    const loadedExcludedStudents = loaded.escala_alunos_excluidos || defaults.excludedStudents;
    const loadedClassCount = loaded.escala_turmas_count
      ? parseInt(loaded.escala_turmas_count, 10)
      : defaults.classCount;

    const loadedFemaleStudents = loaded.escala_alunas_pfem || "";
    const loadedFemaleRestrictedPosts = loaded.escala_alunas_restricoes 
      ? loaded.escala_alunas_restricoes.split(';').filter(Boolean)
      : [];

    const loadedHistoricalMonth = loaded.escala_mes_historico;
    const loadedHistoricalYear = loaded.escala_ano_historico;

    // NOVO: Carregamento de grupos
    const loadedIsGroupMode = loaded.escala_modo_grupos === 'true';
    const loadedManualGroups = loaded.escala_grupos_manuais || [];

    return {
      students: loadedStudentString,
      studentCount: loadedStudentCount,
      excludedStudents: loadedExcludedStudents,
      classCount: loadedClassCount,
      servicePosts: loaded.escala_postos || defaults.servicePosts,
      slots: loaded.escala_vagas || defaults.slots,
      month: defaults.month,
      year: defaults.year,
      ignoredDays: (loaded.escala_dias_ignorar || "")
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(n => !isNaN(n) && n > 0),
      responsible: loaded.escala_responsavel || defaults.responsible,
      responsiblePosition: loaded.escala_cargo_responsavel || defaults.responsiblePosition,
      isCycleEnabled: loaded.escala_ciclo_ativo === 'true' || false,
      cyclePostToRemove: loaded.escala_ciclo_posto || "",
      femaleStudents: loadedFemaleStudents,
      femaleRestrictedPosts: loadedFemaleRestrictedPosts,
      historicalMonth: loadedHistoricalMonth,
      historicalYear: loadedHistoricalYear,
      // NOVO
      isGroupMode: loadedIsGroupMode,
      manualGroups: loadedManualGroups,
    };
  });

  const updateConfig = (newConfig: Partial<LocalGenerationConfig>) => {
    if (newConfig.studentCount !== undefined) {
      const count = Math.max(0, newConfig.studentCount); 
      const newStudentsString = Array.from({ length: count }, (_, i) => i + 1).join('\n');
      setConfig(prev => ({
        ...prev,
        ...newConfig,
        students: newStudentsString, 
        studentCount: count
      }));
    } else {
      setConfig(prev => ({ ...prev, ...newConfig }));
    }
  };
  
  // CORREÇÃO: Lógica de detecção de grupo agora usa Match Exato
  const getStudentClassDynamic = (studentId: string): string => {
    const cleanId = studentId.trim();
    
    if (config.isGroupMode && config.manualGroups.length > 0) {
      for (const grp of config.manualGroups) {
        // Quebra por separadores e limpa espaços
        const members = grp.students.split(/[\n;,]+/).map(s => s.trim());
        // Busca exata (evita que "1" case com "10", "12", etc.)
        if (members.includes(cleanId)) {
          return grp.name;
        }
      }
      return 'Sem Grupo';
    }

    // Lógica antiga de classes (A, B, C...)
    const studentNum = parseInt(cleanId, 10);
    if (isNaN(studentNum) || studentNum <= 0) return '?';

    const { studentCount, classCount } = config;
    if (classCount <= 0 || studentCount <= 0) return '?';

    const numClasses = Math.min(classCount, studentCount);
    const baseSize = Math.floor(studentCount / numClasses);
    const remainder = studentCount % numClasses;

    const largeClassSize = baseSize + 1;
    const numLargeClasses = remainder;
    const largeClassesTotalStudents = largeClassSize * numLargeClasses;

    let classIndex: number;
    if (studentNum <= largeClassesTotalStudents) {
      classIndex = Math.floor((studentNum - 1) / largeClassSize);
    } else {
      const remainingStudents = studentNum - largeClassesTotalStudents;
      classIndex = Math.floor((remainingStudents - 1) / baseSize) + numLargeClasses;
    }

    if (classIndex < 0 || classIndex > 25) return '?'; 
    return String.fromCharCode(65 + classIndex);
  };

  const value = useMemo(() => ({
    config,
    updateConfig,
    getStudentClass: getStudentClassDynamic 
  }), [config]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
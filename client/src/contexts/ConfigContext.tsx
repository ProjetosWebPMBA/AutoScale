import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '@/services/persistence';

export interface ConfigState {
  students: string;
  servicePosts: string;
  slots: string;
  responsible: string;
  responsiblePosition: string;
  ignoredDays: string;
  month: number;
  year: number;
}

interface ConfigContextType {
  config: ConfigState;
  updateConfig: (updates: Partial<ConfigState>) => void;
  saveConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const DEFAULT_STUDENTS = Array.from({ length: 74 }, (_, i) => i + 1).join('\n');
const DEFAULT_POSTS = 'Aluno de dia\nCmd da guarda\nsentinelas\nplantões masc\nplantões sala de meios\nserviço de rancho';
const DEFAULT_SLOTS = '1\n1\n3\n3\n3\n5';

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(() => {
    const today = new Date();
    const saved = loadFromLocalStorage();

    return {
      students: saved.escala_alunos || DEFAULT_STUDENTS,
      servicePosts: saved.escala_postos || DEFAULT_POSTS,
      slots: saved.escala_vagas || DEFAULT_SLOTS,
      responsible: saved.escala_responsavel || '',
      responsiblePosition: saved.escala_cargo_responsavel || 'Chefe do Corpo de Alunos',
      ignoredDays: saved.escala_dias_ignorar || '',
      month: today.getMonth(),
      year: today.getFullYear(),
    };
  });

  const updateConfig = (updates: Partial<ConfigState>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const saveConfig = () => {
    saveToLocalStorage({
      escala_alunos: config.students,
      escala_postos: config.servicePosts,
      escala_vagas: config.slots,
      escala_responsavel: config.responsible,
      escala_cargo_responsavel: config.responsiblePosition,
      escala_dias_ignorar: config.ignoredDays,
    });
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, saveConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

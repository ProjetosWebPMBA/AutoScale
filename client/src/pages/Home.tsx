import { useState } from 'react';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { ScheduleView } from '@/components/ScheduleView';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { useConfig } from '@/contexts/ConfigContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule, computeAnalytics } from '@/services/scheduleEngine';

// --- (PDF-FIX) Importa a função (que agora tem a lógica NOVA e 'async') ---
import { exportToPDF } from '@/services/pdfExporter'; 

import {
  createExportData,
  downloadJSON,
  parseImportedJSON,
  applyImportedData,
  saveToLocalStorage,
  clearLocalStorage,
} from '@/services/persistence';

// CORREÇÃO AQUI: Separamos os Tipos dos Valores
import type { StudentStats } from '@shared/schema'; 
import { MONTH_NAMES } from '@shared/schema'; // Importado como valor agora

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; 
import { Power, History } from 'lucide-react'; 

export default function Home() {
  const { config, updateConfig, getStudentClass } = useConfig(); 
  const { state, dispatch } = useSchedule();
  const { toast } = useToast();

  const [importedStats, setImportedStats] = useState<StudentStats[] | null>(null);

  const handleGenerate = () => {
    try {
      dispatch({ type: 'START_GENERATION' });

      // --- FIX DE ERRO & SUPORTE A GRUPOS ---
      let students: string[] = [];
      
      // 1. Se estiver em Modo Grupo, compilamos a lista baseada nos grupos
      if (config.isGroupMode && config.manualGroups && config.manualGroups.length > 0) {
          const allMembers: string[] = [];
          config.manualGroups.forEach(g => {
             // Aceita separadores: quebra de linha ou ponto e vírgula
             const members = g.students.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
             allMembers.push(...members);
          });
          // Remove duplicados para passar uma lista limpa ao motor
          students = Array.from(new Set(allMembers));
      } 
      // 2. Se for Modo Padrão, pegamos do campo de texto
      else {
          const rawStudents = config.students; 
          if (Array.isArray(rawStudents)) {
             students = rawStudents;
          } else if (typeof rawStudents === 'string') {
             const allStudentsParsed = rawStudents.split('\n').filter(Boolean).map(s => s.trim());
             const excludedSet = new Set(
                config.excludedStudents
                  .split(';')
                  .map(s => s.trim())
                  .filter(Boolean)
             );
             students = allStudentsParsed.filter(student => !excludedSet.has(student));
          } else {
             students = [];
          }
      }

      const servicePosts = config.servicePosts.split('\n').filter(Boolean).map(s => s.trim());
      const slots = config.slots
        .split('\n')
        .filter(Boolean)
        .map(s => parseInt(s.trim(), 10));
      const ignoredDays = config.ignoredDays; 
      
      const femaleStudentsList = config.femaleStudents
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);

      // Monta o objeto de configuração para o motor
      const generationConfig = {
        students, // Agora passamos o array sanitizado
        servicePosts,
        slots,
        month: config.month,
        year: config.year,
        ignoredDays,
        responsible: config.responsible,
        responsiblePosition: config.responsiblePosition,
        isCycleEnabled: config.isCycleEnabled,
        cyclePostToRemove: config.cyclePostToRemove, 
        studentCount: config.studentCount,
        classCount: config.classCount,
        femaleStudentsList: femaleStudentsList,
        femaleRestrictedPostsList: config.femaleRestrictedPosts,
        historicalMonth: config.historicalMonth, 
        historicalYear: config.historicalYear,
        isGroupMode: config.isGroupMode,
        manualGroups: config.manualGroups
      };

      const result = generateSchedule(generationConfig, getStudentClass, importedStats); 
      
      if (result.warnings && result.warnings.length > 0) {
         result.warnings.forEach(warning => {
             toast({
                 variant: "default", // ou warning se tivesse
                 title: "Atenção na Geração",
                 description: warning,
                 duration: 6000
             });
         });
      }

      const analytics = computeAnalytics(result, generationConfig, getStudentClass, importedStats);
      
      dispatch({
        type: 'GENERATION_SUCCESS',
        payload: { result, analytics },
      });
      
      const successTitle = config.isGroupMode ? "Escala por Grupos Gerada!" : "Escala Gerada com Sucesso!";
      toast({
        title: successTitle,
        description: `${result.postRows.length} postos distribuídos por ${result.daysInMonth} dias.`,
        duration: 5000,
      });
      
      // Limpa estado temporário APÓS gerar, para não usar o mesmo histórico 2x sem querer
      setImportedStats(null);
      updateConfig({ historicalMonth: undefined, historicalYear: undefined });
      
      setTimeout(() => {
        document.getElementById('schedule-view')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      dispatch({
        type: 'GENERATION_ERROR',
        payload: message,
      });
      toast({
        variant: "destructive",
        title: "Erro ao gerar escala",
        description: message,
        duration: 7000,
      });
    }
  };

  const handleExportPDF = async () => {
    if (!state.result) {
      toast({
        variant: "destructive",
        title: "Nenhuma escala gerada",
        description: "Gere uma escala primeiro para exportar o PDF.",
      });
      return;
    }
    try {
      // Prepara lista de Pfems para passar ao exportador
      const femaleStudentsList = config.femaleStudents
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);

      await exportToPDF(
        state.result,
        config.responsible.trim(),
        config.responsiblePosition.trim(),
        config.month,
        config.year,
        femaleStudentsList // Passa a lista aqui
      );

      toast({
        title: "PDF gerado!",
        description: "O arquivo foi baixado com sucesso.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const handleExportJSON = () => {
    if (!state.result || !state.analytics) {
      toast({
        variant: "destructive",
        title: "Nenhuma escala/análise gerada",
        description: "Gere uma escala primeiro para exportar a compensação.",
      });
      return;
    }
    try {
      // Prepara os dados de stats para o próximo mês
      // O 'studentStats' do analytics JÁ CONTÉM a soma do histórico + mês atual
      // Esses campos (accumulatedServices, accumulatedPostCounts) serão a base do próximo mês.
      const statsForExport = state.analytics.studentStats.map(stat => ({
        ...stat,
        // Garante que os acumulados exportados reflitam o total final deste mês
        accumulatedServices: stat.totalShifts, 
        accumulatedPostCounts: stat.postBreakdown
      }));

      const hasProgression = state.result.queueIndices && 
                             Object.keys(state.result.queueIndices).length > 0;

      const data = createExportData(
        hasProgression ? state.result.studentQueues : {},
        hasProgression ? state.result.queueIndices : {},
        config.servicePosts ?? "",
        config.slots ?? "",
        config.responsible ?? "",
        config.responsiblePosition ?? "",
        config.month,
        config.year,
        config.isCycleEnabled,
        config.cyclePostToRemove ?? "",
        config.month, // O mês gerado vira o histórico
        config.year,  // O ano gerado vira o histórico
        config.isGroupMode,
        config.manualGroups,
        statsForExport // Passamos os stats atualizados
      );

      const dataToExport = {
        ...data,
        escala_alunos: config.students,
        escala_alunos_count: String(config.studentCount),
        escala_alunos_excluidos: config.excludedStudents,
        escala_turmas_count: String(config.classCount),
        escala_alunas_pfem: config.femaleStudents,
        escala_alunas_restricoes: config.femaleRestrictedPosts.join(';'),
      };

      const filename = `compensacao_${config.year}_${String(config.month + 1).padStart(2, '0')}.json`;
      
      downloadJSON(dataToExport, filename);
      toast({
        title: "Compensação exportada!",
        description: "O arquivo JSON (com contagens de postos atualizadas) foi salvo.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao exportar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = parseImportedJSON(content);
        
        const appliedData = applyImportedData(importedData);
        
        // Robustez na importação de alunos
        let importedStudents = appliedData.escala_alunos || config.students;
        if (Array.isArray(importedStudents)) {
            importedStudents = importedStudents.join('\n');
        }

        const importedCount = appliedData.escala_alunos_count
          ? parseInt(appliedData.escala_alunos_count, 10)
          : importedStudents.split('\n').filter(Boolean).length;
          
        const importedExcluded = appliedData.escala_alunos_excluidos || "";
        const importedClassCount = appliedData.escala_turmas_count
          ? parseInt(appliedData.escala_turmas_count, 10) 
          : (appliedData.escala_turmas_count ? parseInt(appliedData.escala_turmas_count, 10) : 3);

        const importedFemaleStudents = appliedData.escala_alunas_pfem || config.femaleStudents;
        const importedFemaleRestrictions = appliedData.escala_alunas_restricoes 
          ? appliedData.escala_alunas_restricoes.split(';').filter(Boolean) 
          : config.femaleRestrictedPosts;

        const importedHistMonth = appliedData.escala_mes_historico;
        const importedHistYear = appliedData.escala_ano_historico;

        const importedIsGroupMode = appliedData.escala_modo_grupos === 'true';
        const importedManualGroups = appliedData.escala_grupos_manuais || [];
        
        updateConfig({
          students: importedStudents,
          studentCount: importedCount, 
          excludedStudents: importedExcluded, 
          classCount: importedClassCount, 
          servicePosts: appliedData.escala_postos || config.servicePosts,
          slots: appliedData.escala_vagas || config.slots,
          responsible: appliedData.escala_responsavel || config.responsible,
          responsiblePosition: appliedData.escala_cargo_responsavel || config.responsiblePosition,
          isCycleEnabled: appliedData.escala_ciclo_ativo === 'true' || false,
          cyclePostToRemove: appliedData.escala_ciclo_posto || "",
          femaleStudents: importedFemaleStudents,
          femaleRestrictedPosts: importedFemaleRestrictions,
          historicalMonth: importedHistMonth, 
          historicalYear: importedHistYear,
          isGroupMode: importedIsGroupMode,
          manualGroups: importedManualGroups,
        });
        
        if (appliedData.escala_stats_compensacao) {
          setImportedStats(appliedData.escala_stats_compensacao as StudentStats[]);
          toast({
            title: "Compensação importada!",
            description: "As contagens de postos do mês anterior foram carregadas.",
            duration: 4000,
          });
        } else {
          setImportedStats(null);
          toast({
            title: "Configuração importada!",
            description: "Arquivo importado (sem dados de compensação).",
            duration: 3000,
          });
        }
        
        saveToLocalStorage({
          ...appliedData,
          escala_stats_compensacao: undefined, // Não salva no LS para não poluir, mantém na memória (state)
          escala_alunos_count: String(importedCount),
          escala_alunos_excluidos: importedExcluded,
          escala_turmas_count: String(importedClassCount), 
          escala_alunas_pfem: importedFemaleStudents,
          escala_alunas_restricoes: importedFemaleRestrictions.join(';'),
          escala_mes_historico: importedHistMonth, 
          escala_ano_historico: importedHistYear,
          escala_modo_grupos: String(importedIsGroupMode),
          escala_grupos_manuais: importedManualGroups,
        });
        
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao importar",
          description: error instanceof Error ? error.message : 'Arquivo inválido',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    const confirmation = prompt('Tem certeza que deseja limpar toda a memória? Esta ação não pode ser desfeita. Digite \'sim\' para confirmar.');
    if (confirmation === 'sim') {
      clearLocalStorage();
      toast({
        title: "Memória limpa",
        description: "Recarregando aplicação...",
        duration: 2000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleShutdown = async () => {
    const confirmation = prompt('Tem certeza que deseja encerrar o servidor e fechar o aplicativo? Digite \'sim\' para confirmar.');
    if (confirmation === 'sim') {
      try {
        await fetch('/quit');
        toast({
          title: "Servidor encerrado",
          description: "Fechando a janela...",
        });
        setTimeout(() => {
          window.close();
        }, 1000);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao encerrar',
          description: 'Não foi possível contactar o servidor para desligar.',
        });
      }
    }
  };
  
  const femaleStudentsForHighlight = config.femaleStudents
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  const historicalMonthName = config.historicalMonth !== undefined ? (MONTH_NAMES as string[])[config.historicalMonth] : null;
  const isHistoricalDataLoaded = importedStats !== null;

  return (
    <div className="min-h-screen relative overflow-hidden"> 
      
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src="/logo-pmba.png" 
          alt="Logo PMBA"
          className="w-[400px] h-auto opacity-10"
        />
      </div>

      <div className="relative z-10 max-w-full mx-auto px-4 py-8">
        
        <div className="header-glass text-center mb-4 p-4 rounded-lg shadow-lg">
          <p className="text-xs text-white text-shadow-strong">
            Produzido por: AL SD PM MAURO - 27; AL SD PM FAGNER - 34; AL SD PM BOTELHO - 72;
          </p>
          <p className="text-xs text-white text-shadow-strong">
            (2° CIA 2025 - 9° BEIC)
          </p>
        </div>

        <div className="header-glass flex flex-col sm:flex-row justify-between items-center mb-8 p-4 rounded-lg shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-white text-shadow-strong" data-testid="title-main">
              Gerador de Escala Mensal
            </h1>
            <p className="text-lg text-white text-shadow-strong">
              Polícia Militar da Bahia - 9º BEIC
            </p>
            {isHistoricalDataLoaded && historicalMonthName && config.historicalYear && (
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-yellow-300 bg-yellow-900/40 p-1.5 rounded-md shadow-md">
                <History className="w-4 h-4" />
                <span className="text-shadow-strong">
                  HISTÓRICO BASE ATIVO: {historicalMonthName.toUpperCase()} / {config.historicalYear}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <img 
              src="/logo-pmba.png" 
              alt="Logo PMBA" 
              className="w-64 h-auto"
            />
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={handleShutdown}
              title="Encerrar Servidor e Fechar App"
            >
              <Power className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <ConfigurationPanel
            onGenerate={handleGenerate}
            onExport={handleExportJSON}
            onImport={handleImportJSON}
            onClear={handleClear}
            isGenerating={state.isGenerating}
          />

          {state.result && (
            <div id="schedule-view" className="overflow-x-auto">
              <ScheduleView 
                result={state.result} 
                onExportPDF={handleExportPDF} 
                highlightedStudents={femaleStudentsForHighlight}
              />
            </div>
          )}

          {state.error && (
            <Card className="bg-destructive/10 border-destructive p-6">
              <h3 className="text-lg font-semibold text-destructive mb-2">Erro</h3>
              <p className="text-sm text-destructive/90">{state.error}</p>
            </Card>
          )}

          {!state.result && !state.error && (
            <Card className="header-glass p-8 text-center rounded-lg shadow-lg">
              <p className="text-base text-white text-shadow-strong">
                Configurações carregadas.
                {isHistoricalDataLoaded && historicalMonthName && config.historicalYear && (
                  <span className="block mt-2 font-semibold text-yellow-300 text-shadow-strong">
                    Base de Compensação ({historicalMonthName} / {config.historicalYear}) está carregada.
                  </span>
                )}
                <span className="block mt-2">
                  Clique em <span className="font-semibold">"Gerar Escala"</span> para começar.
                </span>
              </p>
            </Card>
          )}

          {state.analytics && (
            <AnalyticsPanel analytics={state.analytics} />
          )}
        </div>
      </div>
    </div>
  );
}
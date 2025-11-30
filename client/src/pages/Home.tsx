import { useState } from 'react';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { ScheduleView } from '@/components/ScheduleView';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { useConfig } from '@/contexts/ConfigContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule, computeAnalytics } from '@/services/scheduleEngine';
import { exportToPDF } from '@/services/pdfExporter'; 

import {
  createExportData,
  downloadJSON,
  parseImportedJSON,
  applyImportedData,
  saveToLocalStorage,
  clearLocalStorage,
} from '@/services/persistence';

import type { StudentStats } from '@shared/schema'; 
import { MONTH_NAMES } from '@shared/schema';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; 
import { Power, History } from 'lucide-react'; 

export default function Home() {
  const { config, updateConfig, getStudentClass } = useConfig(); 
  const { state, dispatch } = useSchedule();
  const { toast } = useToast();

  const [importedStats, setImportedStats] = useState<StudentStats[] | null>(null);

  const baseUrl = import.meta.env.BASE_URL;
  const logoSrc = `${baseUrl}logo-pmba.png`.replace(/\/\//g, '/');

  const handleGenerate = () => {
    try {
      dispatch({ type: 'START_GENERATION' });

      let students: string[] = [];
      
      if (config.isGroupMode && config.manualGroups && config.manualGroups.length > 0) {
          const allMembers: string[] = [];
          config.manualGroups.forEach(g => {
             const members = g.students.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
             allMembers.push(...members);
          });
          const uniqueMembers = Array.from(new Set(allMembers));
          students = uniqueMembers;
      } 
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

      const generationConfig = {
        students,
        servicePosts,
        postLegends: config.postLegends || [],
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
        manualGroups: config.manualGroups,
        studentRegistry: config.studentRegistry
      };

      const result = generateSchedule(generationConfig, getStudentClass, importedStats); 
      
      if (result.warnings && result.warnings.length > 0) {
         result.warnings.forEach(warning => {
             toast({
                 variant: "default",
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
      toast({ variant: "destructive", title: "Nenhuma escala gerada" });
      return;
    }

    const respWarMatch = config.responsible.match(/\/(.*?)\//);
    if (!respWarMatch || !respWarMatch[1].trim()) {
        toast({
            variant: "destructive",
            title: "Erro no Responsável",
            description: "Defina o Nome de Guerra entre barras duplas. Ex: 'Cap PM Fulano /Guerra/ Silva'.",
            duration: 6000
        });
        return;
    }

    const missingWarNames: string[] = [];
    const registry = config.studentRegistry || [];
    
    const activeStudentIds = new Set<string>();
    
    if (config.isGroupMode && config.manualGroups) {
        config.manualGroups.forEach(g => {
            g.students.split(/[\n;,]+/).forEach(s => {
                if (s.trim()) activeStudentIds.add(s.trim());
            });
        });
    } else {
        for(let i=1; i<=config.studentCount; i++) activeStudentIds.add(String(i));
    }

    activeStudentIds.forEach(id => {
        const normalizedId = String(parseInt(id, 10)); 
        const reg = registry.find(r => r.id === id || r.id === normalizedId);
        
        if (!reg || !reg.warName || reg.warName.trim() === '' || reg.warName === '?') {
            missingWarNames.push(id);
        }
    });

    if (missingWarNames.length > 0) {
        const displayList = missingWarNames.slice(0, 5).join(', ');
        const more = missingWarNames.length > 5 ? `...e mais ${missingWarNames.length - 5}` : '';
        
        toast({
            variant: "destructive",
            title: "Nomes de Guerra Pendentes!",
            description: `O PDF não pode ser gerado. Defina o nome entre barras (/Guerra/) para: ${displayList}${more}.`,
            duration: 7000
        });
        return;
    }

    try {
      const femaleStudentsList = config.femaleStudents
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);

      const servicePostsList = config.servicePosts.split('\n').filter(Boolean);

      await exportToPDF(
        state.result,
        config.responsible.trim(),
        config.responsiblePosition.trim(),
        config.month,
        config.year,
        femaleStudentsList,
        config.studentRegistry || [],
        config.manualGroups || [],
        config.isGroupMode,
        servicePostsList,
        config.postLegends || []
      );

      toast({
        title: "PDF Oficial Gerado!",
        description: "Documento pronto com layout oficial e nomes validados.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      console.error(error);
    }
  };

  const handleExportJSON = () => {
    if (!state.result || !state.analytics) {
      toast({ variant: "destructive", title: "Nenhuma escala/análise gerada" });
      return;
    }
    try {
      const statsForExport = state.analytics.studentStats.map(stat => ({
        ...stat,
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
        config.month,
        config.year,
        config.isGroupMode,
        config.manualGroups,
        statsForExport,
        config.postLegends.join('\n'), 
        config.studentRegistry,
        state.result, // Passa o resultado da escala atual para salvar
        state.analytics // Passa a análise atual
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

      const filename = `backup_escala_${config.year}_${String(config.month + 1).padStart(2, '0')}.json`;
      
      downloadJSON(dataToExport, filename);
      toast({
        title: "Backup Completo Salvo!",
        description: "Contém a escala gerada, estatísticas e configurações.",
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

  // Helper comum para importar
  const processImport = (file: File, isFullRestore: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = parseImportedJSON(content);
        const appliedData = applyImportedData(importedData);
        
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
        
        const importedLegends = appliedData.escala_legendas ? appliedData.escala_legendas.split('\n') : config.postLegends;
        const importedRegistry = appliedData.escala_dados_alunos || [];

        // Atualiza configurações globais
        updateConfig({
          students: importedStudents,
          studentCount: importedCount, 
          excludedStudents: importedExcluded, 
          classCount: importedClassCount, 
          servicePosts: appliedData.escala_postos || config.servicePosts,
          postLegends: importedLegends,
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
          studentRegistry: importedRegistry,
        });
        
        // Logica Diferenciada: RESTAURAÇÃO TOTAL vs HISTÓRICO
        if (isFullRestore && importedData.snapshot_resultado) {
            // Restaura o resultado visual e a análise para permitir re-exportar PDF
            // Recupera o Set de ignoredDays que foi serializado como Array
            const restoredResult = {
                ...importedData.snapshot_resultado,
                ignoredDays: new Set(importedData.snapshot_resultado.ignoredDays)
            };

            dispatch({
                type: 'GENERATION_SUCCESS',
                payload: { 
                    result: restoredResult, 
                    analytics: importedData.snapshot_analise || { studentStats: [], dailyClassDistribution: {}, totalStudents: 0, totalShiftsAssigned: 0, averageShiftsPerStudent: 0, postDistribution: {} } 
                },
            });
            
            toast({ 
                title: "Escala Restaurada!", 
                description: "Visualização carregada com sucesso. Você pode gerar o PDF.",
                duration: 4000
            });
            setImportedStats(null); // Não precisamos de histórico se estamos vendo o passado
        } else {
            // Importação Padrão (Histórico para o próximo mês)
            if (appliedData.escala_stats_compensacao) {
              setImportedStats(appliedData.escala_stats_compensacao as StudentStats[]);
              toast({ title: "Histórico Importado!", description: "Dados prontos para gerar o PRÓXIMO mês." });
            } else {
              setImportedStats(null);
              toast({ title: "Configuração Importada!", description: "Apenas configurações carregadas." });
            }
            // Limpa resultado anterior para evitar confusão
            dispatch({ type: 'CLEAR_SCHEDULE' });
        }
        
        // Salva estado
        saveToLocalStorage({
          ...appliedData,
          escala_stats_compensacao: undefined, 
          escala_alunos_count: String(importedCount),
          escala_alunos_excluidos: importedExcluded,
          escala_turmas_count: String(importedClassCount), 
          escala_alunas_pfem: importedFemaleStudents,
          escala_alunas_restricoes: importedFemaleRestrictions.join(';'),
          escala_mes_historico: importedHistMonth, 
          escala_ano_historico: importedHistYear,
          escala_modo_grupos: String(importedIsGroupMode),
          escala_grupos_manuais: importedManualGroups,
          escala_legendas: importedLegends.join('\n'),
          escala_dados_alunos: importedRegistry,
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

  const handleImportHistory = (file: File) => processImport(file, false);
  const handleImportFull = (file: File) => processImport(file, true);

  const handleClear = () => {
    if (confirm('Tem certeza que deseja limpar tudo?')) {
      clearLocalStorage();
      window.location.reload();
    }
  };

  const handleShutdown = async () => {
    if (confirm('Encerrar servidor?')) {
      try {
        await fetch('/quit');
        window.close();
      } catch (error) {
        console.error(error);
      }
    }
  };
  
  const femaleStudentsForHighlight = config.femaleStudents.split(';').map(s => s.trim()).filter(Boolean);
  const historicalMonthName = config.historicalMonth !== undefined ? (MONTH_NAMES as string[])[config.historicalMonth] : null;
  const isHistoricalDataLoaded = importedStats !== null;

  return (
    <div className="min-h-screen relative overflow-hidden"> 
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img src={logoSrc} alt="Logo PMBA" className="w-[400px] h-auto opacity-10" />
      </div>

      <div className="relative z-10 max-w-full mx-auto px-4 py-8">
        <div className="header-glass text-center mb-4 p-4 rounded-lg shadow-lg">
          <p className="text-xs text-white text-shadow-strong">
            Produzido por: AL SD PM MAURO - 27; AL SD PM FAGNER - 34; AL SD PM BOTELHO - 72;
          </p>
          <p className="text-xs text-white text-shadow-strong">(2° CIA 2025 - 9° BEIC)</p>
        </div>

        <div className="header-glass flex flex-col sm:flex-row justify-between items-center mb-8 p-4 rounded-lg shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-white text-shadow-strong" data-testid="title-main">
              Gerador de Escala Mensal
            </h1>
            <p className="text-lg text-white text-shadow-strong">Polícia Militar da Bahia - 9º BEIC</p>
            {isHistoricalDataLoaded && historicalMonthName && config.historicalYear && (
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-yellow-300 bg-yellow-900/40 p-1.5 rounded-md shadow-md">
                <History className="w-4 h-4" />
                <span className="text-shadow-strong">HISTÓRICO BASE ATIVO: {historicalMonthName.toUpperCase()} / {config.historicalYear}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <img src={logoSrc} alt="Logo PMBA" className="w-64 h-auto" />
            <Button variant="destructive" size="icon" onClick={handleShutdown} title="Encerrar">
              <Power className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <ConfigurationPanel
            onGenerate={handleGenerate}
            onExport={handleExportJSON}
            onImportHistory={handleImportHistory}
            onImportFull={handleImportFull}
            onClear={handleClear}
            isGenerating={state.isGenerating}
          />

          {state.result && (
            <div id="schedule-view" className="overflow-x-auto">
              <ScheduleView result={state.result} onExportPDF={handleExportPDF} highlightedStudents={femaleStudentsForHighlight} />
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
                Configurações carregadas. Clique em <span className="font-semibold">"Gerar Escala"</span> para começar.
              </p>
            </Card>
          )}

          {/* ADICIONADO: Passando a lista de PFems para destacar */}
          {state.analytics && (
            <AnalyticsPanel 
              analytics={state.analytics} 
              highlightedStudents={femaleStudentsForHighlight}
            />
          )}
        </div>
      </div>
    </div>
  );
}
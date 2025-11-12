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
import type { GenerationConfig } from '@shared/schema';
import { Card } from '@/components/ui/card';

export default function Home() {
  const { config, updateConfig } = useConfig();
  const { state, dispatch } = useSchedule();
  const { toast } = useToast();

  const handleGenerate = () => {
    try {
      dispatch({ type: 'START_GENERATION' });

      // Parse configuration
      const students = config.students.split('\n').filter(Boolean).map(s => s.trim());
      const servicePosts = config.servicePosts.split('\n').filter(Boolean).map(s => s.trim());
      const slots = config.slots
        .split('\n')
        .filter(Boolean)
        .map(s => parseInt(s.trim(), 10));

      const ignoredDaysStr = config.ignoredDays.replace(/ /g, '');
      const ignoredDays = ignoredDaysStr
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => !isNaN(d) && d > 0 && d <= 31);

      const generationConfig: GenerationConfig = {
        students,
        servicePosts,
        slots,
        month: config.month,
        year: config.year,
        ignoredDays,
        responsible: config.responsible,
        responsiblePosition: config.responsiblePosition,
      };

      // Generate schedule
      const result = generateSchedule(generationConfig);
      const analytics = computeAnalytics(result, generationConfig);

      dispatch({
        type: 'GENERATION_SUCCESS',
        payload: { result, analytics },
      });

      toast({
        title: "Escala gerada com sucesso!",
        description: `${result.postRows.length} postos distribuídos por ${result.daysInMonth} dias.`,
        duration: 5000,
      });

      // Scroll to schedule view
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

  const handleExportPDF = () => {
    if (!state.result) {
      toast({
        variant: "destructive",
        title: "Nenhuma escala gerada",
        description: "Gere uma escala primeiro para exportar o PDF.",
      });
      return;
    }

    try {
      exportToPDF(
        state.result,
        config.responsible,
        config.responsiblePosition,
        config.month,
        config.year
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
    if (!state.result) {
      toast({
        variant: "destructive",
        title: "Nenhuma escala gerada",
        description: "Gere uma escala primeiro para exportar a progressão.",
      });
      return;
    }

    try {
      const { data, filename } = createExportData(
        state.result.studentQueues,
        state.result.queueIndices,
        config.servicePosts,
        config.slots,
        config.responsible,
        config.responsiblePosition,
        config.month,
        config.year
      );

      downloadJSON(data, filename);

      toast({
        title: "Progressão exportada!",
        description: "O arquivo JSON foi baixado com sucesso.",
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

        // Update config
        updateConfig({
          students: appliedData.escala_alunos || config.students,
          servicePosts: appliedData.escala_postos || config.servicePosts,
          slots: appliedData.escala_vagas || config.slots,
          responsible: appliedData.escala_responsavel || config.responsible,
          responsiblePosition: appliedData.escala_cargo_responsavel || config.responsiblePosition,
        });

        // Save to localStorage
        saveToLocalStorage(appliedData);

        toast({
          title: "Progressão importada!",
          description: "As configurações foram atualizadas e salvas.",
          duration: 3000,
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
    if (confirm('Tem certeza que deseja limpar toda a memória? Esta ação não pode ser desfeita.')) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="title-main">
            Gerador de Escala Mensal
          </h1>
        </div>

        <div className="flex flex-col gap-8">
          {/* Configuration Panel */}
          <ConfigurationPanel
            onGenerate={handleGenerate}
            onExport={handleExportJSON}
            onImport={handleImportJSON}
            onClear={handleClear}
            isGenerating={state.isGenerating}
          />

          {/* Schedule View */}
          {state.result && (
            <div id="schedule-view">
              <ScheduleView result={state.result} onExportPDF={handleExportPDF} />
            </div>
          )}

          {/* Error Display */}
          {state.error && (
            <Card className="bg-destructive/10 border-destructive p-6">
              <h3 className="text-lg font-semibold text-destructive mb-2">Erro</h3>
              <p className="text-sm text-destructive/90">{state.error}</p>
            </Card>
          )}

          {/* Empty State */}
          {!state.result && !state.error && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-base">
                Configurações carregadas. Clique em <span className="font-semibold">"Gerar Escala"</span> para começar.
              </p>
            </Card>
          )}

          {/* Analytics Panel */}
          {state.analytics && (
            <AnalyticsPanel analytics={state.analytics} />
          )}
        </div>
      </div>
    </div>
  );
}

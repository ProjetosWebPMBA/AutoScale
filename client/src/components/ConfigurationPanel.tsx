import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useConfig } from '@/contexts/ConfigContext';
import { useToast } from '@/hooks/use-toast';
import { MONTH_NAMES } from '@shared/schema';
import { Download, Upload, Trash2, Save, Zap } from 'lucide-react';

interface ConfigurationPanelProps {
  onGenerate: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  isGenerating: boolean;
}

export function ConfigurationPanel({
  onGenerate,
  onExport,
  onImport,
  onClear,
  isGenerating,
}: ConfigurationPanelProps) {
  const { config, updateConfig, saveConfig } = useConfig();
  const { toast } = useToast();

  const handleSave = () => {
    saveConfig();
    toast({
      title: "Configurações salvas",
      description: "Suas listas foram salvas no navegador com sucesso!",
      duration: 3000,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <Card className="w-full bg-card p-6">
      <h2 className="text-xl font-semibold mb-6 text-foreground">Configurações</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Column 1: Students */}
        <div>
          <Label htmlFor="students" className="text-sm font-medium mb-2 block">
            Alunos (Números)
          </Label>
          <Textarea
            id="students"
            data-testid="textarea-students"
            rows={12}
            value={config.students}
            onChange={(e) => updateConfig({ students: e.target.value })}
            className="font-mono text-sm"
            placeholder="1&#10;2&#10;3&#10;..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Classificação automática: 1-25 (Sala A), 26-50 (Sala B), 51-74 (Sala C)
          </p>
        </div>

        {/* Column 2: Service Posts & Slots */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="posts" className="text-sm font-medium mb-2 block">
              Postos de Serviço (um por linha)
            </Label>
            <Textarea
              id="posts"
              data-testid="textarea-posts"
              rows={6}
              value={config.servicePosts}
              onChange={(e) => updateConfig({ servicePosts: e.target.value })}
              className="text-sm"
              placeholder="Aluno de dia&#10;Cmd da guarda&#10;..."
            />
          </div>

          <div>
            <Label htmlFor="slots" className="text-sm font-medium mb-2 block">
              Vagas por Posto (um nº por linha)
            </Label>
            <Textarea
              id="slots"
              data-testid="textarea-slots"
              rows={6}
              value={config.slots}
              onChange={(e) => updateConfig({ slots: e.target.value })}
              className="font-mono text-sm"
              placeholder="1&#10;1&#10;3&#10;..."
            />
          </div>
        </div>

        {/* Column 3: Metadata & Actions */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="responsible" className="text-sm font-medium mb-2 block">
              Responsável (Nome e Graduação)
            </Label>
            <Input
              id="responsible"
              data-testid="input-responsible"
              value={config.responsible}
              onChange={(e) => updateConfig({ responsible: e.target.value })}
              placeholder="Ex: FULANO DE TAL - CAP PM"
            />
          </div>

          <div>
            <Label htmlFor="position" className="text-sm font-medium mb-2 block">
              Cargo do Responsável
            </Label>
            <Input
              id="position"
              data-testid="input-position"
              value={config.responsiblePosition}
              onChange={(e) => updateConfig({ responsiblePosition: e.target.value })}
              placeholder="Ex: Chefe do Corpo de Alunos"
            />
          </div>

          <div>
            <Label htmlFor="ignored-days" className="text-sm font-medium mb-2 block">
              Dias a Ignorar (ex: 1, 15, 21)
            </Label>
            <Input
              id="ignored-days"
              data-testid="input-ignored-days"
              value={config.ignoredDays}
              onChange={(e) => updateConfig({ ignoredDays: e.target.value })}
              placeholder="1, 15, 21, 25"
            />
          </div>

          <Button
            data-testid="button-save"
            onClick={handleSave}
            className="w-full"
            variant="default"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Listas
          </Button>
        </div>
      </div>

      {/* History & Generation Section */}
      <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* History */}
        <div>
          <h3 className="text-lg font-medium mb-3 text-foreground">Histórico de Progressão</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Exporte a ordem final dos alunos após gerar uma escala para importar no próximo mês,
            garantindo a rotação justa.
          </p>

          <div className="space-y-3">
            <Button
              data-testid="button-export"
              onClick={onExport}
              className="w-full"
              variant="secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Progressão (JSON)
            </Button>

            <div>
              <input
                type="file"
                id="import-file"
                data-testid="input-import-file"
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
              />
              <Button
                data-testid="button-import"
                onClick={() => document.getElementById('import-file')?.click()}
                className="w-full"
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Progressão (JSON)
              </Button>
            </div>

            <Button
              data-testid="button-clear"
              onClick={onClear}
              className="w-full"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Memória
            </Button>
          </div>
        </div>

        {/* Generation */}
        <div>
          <h3 className="text-lg font-medium mb-3 text-foreground">Gerar Escala</h3>
          
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="month" className="text-sm font-medium mb-2 block">
                Mês
              </Label>
              <Select
                value={config.month.toString()}
                onValueChange={(value) => updateConfig({ month: parseInt(value) })}
              >
                <SelectTrigger id="month" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="year" className="text-sm font-medium mb-2 block">
                Ano
              </Label>
              <Input
                id="year"
                data-testid="input-year"
                type="number"
                value={config.year}
                onChange={(e) => updateConfig({ year: parseInt(e.target.value) || new Date().getFullYear() })}
                min={2000}
                max={2100}
              />
            </div>
          </div>

          <Button
            data-testid="button-generate"
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isGenerating ? 'Gerando...' : 'Gerar Escala'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

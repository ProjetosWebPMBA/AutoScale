import React, { useMemo, useState, useEffect } from 'react'; 
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from '@/components/ui/scroll-area'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConfig } from '@/contexts/ConfigContext';
import { saveToLocalStorage, createExportData, downloadJSON } from '@/services/persistence';
import { useToast } from '@/hooks/use-toast';
import { MONTH_NAMES, ManualGroup } from '@shared/schema';
import {
  Save as LuSave,
  Upload as LuUpload,
  Download as LuDownload,
  Trash2 as LuTrash2,
  Loader2 as LuLoader2,
  CalendarCheck as LuCalendarCheck,
  Users as LuUsers,
  Plus as LuPlus,
  UserCheck as LuUserCheck,
  ArrowUp as LuArrowUp,
  ArrowDown as LuArrowDown
} from 'lucide-react';

interface ConfigurationPanelProps {
  onGenerate: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  isGenerating: boolean;
}

interface PostItem {
  id: string; // Para key do React
  post: string;
  slots: number;
  legend: string;
}

export function ConfigurationPanel({
  onGenerate,
  onExport,
  onImport,
  onClear,
  isGenerating,
}: ConfigurationPanelProps) {
  const { config, updateConfig } = useConfig();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState(""); 
  
  // Estado local para evitar perder foco ao digitar
  const [localPostItems, setLocalPostItems] = useState<PostItem[]>([]);

  // Sincroniza estado local quando a config global muda (ex: importação)
  useEffect(() => {
    const posts = config.servicePosts.split('\n').filter(Boolean).map(s => s.trim());
    const slots = config.slots.split('\n').filter(Boolean).map(s => parseInt(s.trim(), 10));
    const legends = config.postLegends || [];

    const mapped = posts.map((post, index) => ({
      id: `post-${index}`, // Usando index como base estável inicial
      post: post,
      slots: slots[index] || 1,
      legend: legends[index] || ""
    }));
    
    // Só atualiza se houver diferença real de tamanho para não resetar edições em andamento
    if (mapped.length !== localPostItems.length || mapped.some((m, i) => m.post !== localPostItems[i]?.post)) {
       setLocalPostItems(mapped);
    }
  }, [config.servicePosts, config.slots, config.postLegends]);


  const updateConfigFromItems = (items: PostItem[]) => {
    const newPosts = items.map(i => i.post).join('\n');
    const newSlots = items.map(i => i.slots).join('\n');
    const newLegends = items.map(i => i.legend).join('\n'); // Salva legendas como string separada por quebra de linha
    
    setLocalPostItems(items); // Atualiza local para UI instantânea
    updateConfig({ 
        servicePosts: newPosts, 
        slots: newSlots,
        postLegends: items.map(i => i.legend) // Salva no array de legendas
    });
  };

  const handleSave = () => {
    try {
      const dataToSave = {
        escala_alunos: config.students,
        escala_alunos_count: String(config.studentCount),
        escala_alunos_excluidos: config.excludedStudents, 
        escala_turmas_count: String(config.classCount),
        escala_postos: config.servicePosts,
        escala_legendas: config.postLegends.join('\n'), // Salva legendas
        escala_vagas: config.slots,
        escala_responsavel: config.responsible,
        escala_cargo_responsavel: config.responsiblePosition,
        escala_dias_ignorar: config.ignoredDays.join(','),
        escala_ciclo_ativo: String(config.isCycleEnabled),
        escala_ciclo_posto: config.cyclePostToRemove,
        escala_alunas_pfem: config.femaleStudents,
        escala_alunas_restricoes: config.femaleRestrictedPosts.join(';'),
        escala_mes_historico: config.historicalMonth,
        escala_ano_historico: config.historicalYear,
        escala_modo_grupos: String(config.isGroupMode),
        escala_grupos_manuais: config.manualGroups,
      };
      saveToLocalStorage(dataToSave);
      toast({
        title: 'Configuração Salva!',
        description: 'Suas listas e opções foram salvas no navegador.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar os dados no localStorage.',
      });
    }
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateConfig({ [e.target.id]: e.target.value });
  };
  
  const handleSelectNumberChange = (id: string, value: string) => {
     updateConfig({ [id]: parseInt(value, 10) });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  // --- Lógica para Postos e Vagas ---

  const handleAddNewPost = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPost.trim() !== "") {
      e.preventDefault();
      const newItems = [...localPostItems, { id: crypto.randomUUID(), post: newPost.trim(), slots: 1, legend: "" }];
      updateConfigFromItems(newItems);
      setNewPost(""); 
    }
  };

  const handleEditItem = (index: number, field: keyof PostItem, value: string | number) => {
    const newItems = [...localPostItems];
    newItems[index] = { ...newItems[index], [field]: value };
    updateConfigFromItems(newItems);
  };

  const handleMovePost = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localPostItems.length - 1) return;

    const newItems = [...localPostItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    updateConfigFromItems(newItems);
  };

  const handleRemovePost = (index: number) => {
    const item = localPostItems[index];
    const confirmation = prompt(`Tem certeza que deseja remover o posto "${item.post}"? Digite 'sim' para confirmar.`);
    if (confirmation === 'sim') {
      const newItems = localPostItems.filter((_, i) => i !== index);
      updateConfigFromItems(newItems);
      
      // Remove restrição se existir
      const postName = item.post.toUpperCase();
      const newRestrictions = config.femaleRestrictedPosts.filter(p => p !== postName);
      updateConfig({ femaleRestrictedPosts: newRestrictions });
    }
  };

  const togglePostRestriction = (postName: string) => {
    const upperName = postName.toUpperCase();
    const currentRestrictions = config.femaleRestrictedPosts;
    let newRestrictions;
    if (currentRestrictions.includes(upperName)) {
      newRestrictions = currentRestrictions.filter(p => p !== upperName);
    } else {
      newRestrictions = [...currentRestrictions, upperName];
    }
    updateConfig({ femaleRestrictedPosts: newRestrictions });
  };
  
  // Custom Export para incluir as legendas
  const handleCustomExport = () => {
    // Reutiliza a função de exportação, mas agora ela suporta legendas (atualizamos persistence.ts)
    onExport();
  };

  // --- Lógica de Grupos Manuais ---
  const handleAddGroup = () => {
    const nextNum = config.manualGroups.length + 1;
    const newGroup: ManualGroup = {
      id: crypto.randomUUID(),
      name: `Grupo ${nextNum}`,
      students: ""
    };
    updateConfig({ manualGroups: [...config.manualGroups, newGroup] });
  };

  const handleUpdateGroup = (id: string, field: keyof ManualGroup, value: string) => {
    const updated = config.manualGroups.map(g => 
      g.id === id ? { ...g, [field]: value } : g
    );
    updateConfig({ manualGroups: updated });
  };

  const handleRemoveGroup = (id: string) => {
    if (confirm('Remover este grupo?')) {
      const updated = config.manualGroups.filter(g => g.id !== id);
      updateConfig({ manualGroups: updated });
    }
  };

  return (
    <Card className="header-glass rounded-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Configurações
          {/* Toggle do Modo Grupo */}
          <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-lg border border-white/10">
            <Checkbox
              id="isGroupMode"
              checked={config.isGroupMode}
              onCheckedChange={(c) => updateConfig({ isGroupMode: c as boolean })}
              className="data-[state=checked]:bg-blue-500 border-white/50"
            />
            <Label htmlFor="isGroupMode" className="text-white cursor-pointer select-none flex items-center gap-2">
              <LuUserCheck className="w-4 h-4 text-blue-300" />
              Modo de Grupos Manuais
            </Label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Alunos e Grupos */}
          <div className="flex flex-col gap-4">
            
            {config.isGroupMode ? (
              // --- MODO GRUPOS MANUAIS ---
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-blue-200">Grupos Definidos</Label>
                  <Button size="sm" onClick={handleAddGroup} className="h-7 bg-blue-600 hover:bg-blue-500">
                    <LuPlus className="w-3 h-3 mr-1" /> Add Grupo
                  </Button>
                </div>
                <ScrollArea className="h-[200px] w-full rounded-md border border-blue-500/30 p-2 bg-black/20">
                  <div className="flex flex-col gap-3">
                    {config.manualGroups.length === 0 && (
                      <p className="text-center text-white/50 text-xs mt-10">Nenhum grupo criado.</p>
                    )}
                    {config.manualGroups.map((grp, idx) => (
                      <div key={grp.id} className="bg-black/30 p-2 rounded border border-white/10 space-y-2">
                        <div className="flex items-center gap-2">
                           <Input 
                             value={grp.name} 
                             onChange={(e) => handleUpdateGroup(grp.id, 'name', e.target.value)}
                             className="h-7 text-xs bg-transparent border-white/20 text-blue-100 font-bold"
                           />
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={() => handleRemoveGroup(grp.id)}>
                             <LuTrash2 className="w-3 h-3" />
                           </Button>
                        </div>
                        <div>
                           <Label className="text-[10px] text-white/60">Integrantes (ex: 01; 02; 03):</Label>
                           <textarea
                             className="w-full h-16 bg-black/20 text-white text-xs p-1 rounded border border-white/10 focus:border-blue-500/50 outline-none resize-none"
                             value={grp.students}
                             onChange={(e) => handleUpdateGroup(grp.id, 'students', e.target.value)}
                             placeholder="01; 02; 03..."
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              // --- MODO AUTOMÁTICO ---
              <div className="flex flex-col gap-2">
                <Label htmlFor="studentCount" className="text-white">Alunos</Label>
                <div className="flex items-center gap-2 bg-black/10 p-3 rounded-md border">
                  <span className="text-white text-sm">Total (01 ao...):</span>
                  <Input
                    id="studentCount"
                    type="number"
                    value={config.studentCount}
                    onChange={(e) => updateConfig({ studentCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-24"
                    min="1"
                  />
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Label htmlFor="classCount" className="text-white text-sm">Dividir em</Label>
                  <Input
                    id="classCount"
                    type="number"
                    value={config.classCount}
                    onChange={(e) => updateConfig({ classCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-20"
                    min="1"
                  />
                  <span className="text-white text-sm">turmas</span>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <Label htmlFor="excludedStudents" className="text-white">Fora da Escala (ex: 1; 37)</Label>
                  <Input
                    id="excludedStudents"
                    value={config.excludedStudents}
                    onChange={handleTextChange} 
                    placeholder="Separe com ;"
                  />
                </div>
              </div>
            )}

            {/* --- BLOCO COMUM: CONFIGURAÇÃO DE PFEM (AGORA VISÍVEL EM AMBOS OS MODOS) --- */}
            <div className="flex flex-col gap-2 mt-2 p-3 border rounded-md bg-pink-900/20 border-pink-500/30">
              <div className="flex items-center gap-2 mb-1">
                <LuUsers className="text-pink-400 w-4 h-4" />
                <Label htmlFor="femaleStudents" className="text-pink-100 font-semibold">Alunas (PFem)</Label>
              </div>
              <Input
                id="femaleStudents"
                value={config.femaleStudents}
                onChange={(e) => updateConfig({ femaleStudents: e.target.value })}
                placeholder="Ex: 02; 23; 25; 40"
                className="border-pink-500/30 focus:border-pink-500"
              />
              
              <Label className="text-pink-100 text-xs mt-2 mb-1">Restringir PFem nos postos:</Label>
              <ScrollArea className="h-[120px] w-full rounded-md border border-pink-500/30 p-2 bg-black/20">
                <div className="flex flex-col gap-2">
                  {localPostItems.length === 0 && <p className="text-xs text-white/50">Adicione postos primeiro.</p>}
                  {localPostItems.map((item, index) => {
                    const upperName = item.post.toUpperCase();
                    const isRestricted = config.femaleRestrictedPosts.includes(upperName);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Checkbox 
                            id={`rest-${index}`} 
                            checked={isRestricted}
                            onCheckedChange={() => togglePostRestriction(upperName)}
                            className="data-[state=checked]:bg-pink-500 border-pink-400"
                        />
                        <label 
                            htmlFor={`rest-${index}`} 
                            className="text-xs text-white cursor-pointer select-none"
                          >
                            {item.post}
                          </label>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

          </div>

          {/* Coluna 2: Postos e Vagas */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPost" className="text-white">Adicionar Posto (Enter)</Label>
              <Input
                id="newPost"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                onKeyDown={handleAddNewPost}
                placeholder="Nome do posto..."
              />
            </div>
            
            <div className="flex justify-between items-center">
                <Label className="text-white">Gerenciar Postos & Vagas</Label>
                <span className="text-[10px] text-white/50 uppercase">Ordem | Nome | Sigla | Vagas</span>
            </div>
            
            <ScrollArea className="h-[300px] md:h-[500px] w-full rounded-md border p-2 bg-black/10">
              <div className="flex flex-col gap-2">
                {localPostItems.length === 0 && (
                  <p className="text-xs text-white/70 text-center mt-10">Nenhum posto adicionado.</p>
                )}
                {localPostItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 p-1 rounded hover:bg-black/20 group">
                    
                    {/* Controles de Ordem */}
                    <div className="flex flex-col">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 text-white/50 hover:text-white"
                            onClick={() => handleMovePost(index, 'up')}
                            disabled={index === 0}
                        >
                            <LuArrowUp className="w-3 h-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 text-white/50 hover:text-white"
                            onClick={() => handleMovePost(index, 'down')}
                            disabled={index === localPostItems.length - 1}
                        >
                            <LuArrowDown className="w-3 h-3" />
                        </Button>
                    </div>

                    {/* Nome do Posto (Editável) */}
                    <Input 
                        value={item.post}
                        onChange={(e) => handleEditItem(index, 'post', e.target.value)}
                        className="flex-1 h-8 text-xs bg-transparent border-transparent hover:border-white/20 focus:border-white/50 text-white px-1"
                        placeholder="Nome"
                    />

                    {/* Sigla/Legenda (Nova funcionalidade) */}
                    <Input 
                        value={item.legend}
                        onChange={(e) => handleEditItem(index, 'legend', e.target.value)}
                        className="w-12 h-8 text-xs bg-white/5 border-transparent hover:border-white/20 focus:border-white/50 text-yellow-200 px-1 text-center"
                        placeholder="Sigla"
                        maxLength={5}
                        title="Sigla para PDF (Legenda)"
                    />

                    {/* Vagas */}
                    <Input
                      type="number"
                      value={item.slots}
                      onChange={(e) => handleEditItem(index, 'slots', parseInt(e.target.value, 10))}
                      className="w-10 h-8 text-center text-xs px-0 bg-transparent border-white/10 text-white"
                      min="0"
                    />

                    {/* Excluir */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePost(index)}
                    >
                      <LuTrash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Coluna 3: Responsáveis, Datas e Ciclo */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsible" className="text-white">Responsável</Label>
              <Input
                id="responsible"
                value={config.responsible}
                onChange={handleTextChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsiblePosition" className="text-white">Cargo</Label>
              <Input
                id="responsiblePosition"
                value={config.responsiblePosition}
                onChange={handleTextChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ignoredDays" className="text-white">Dias Ignorados</Label>
              <Input
                id="ignoredDays"
                value={config.ignoredDays.join(', ')}
                onChange={(e) => updateConfig({ ignoredDays: e.target.value.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n) && n > 0) })}
                placeholder="ex: 1, 15, 21"
              />
            </div>

            {/* Controles do Ciclo 3-2 */}
            <div className="p-4 border rounded-md bg-black/10 backdrop-blur-sm flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCycleEnabled"
                  checked={config.isCycleEnabled}
                  onCheckedChange={(checked) => updateConfig({ isCycleEnabled: checked as boolean })}
                />
                <Label htmlFor="isCycleEnabled" className="font-semibold text-white cursor-pointer">
                  Ciclo 3-2 Ativo
                </Label>
              </div>
              <p className="text-[10px] text-gray-300 leading-tight">
                Quando ativo: 3 dias normais, 2 reduzidos.
                {config.isGroupMode && " No modo Grupos, reduzirá as vagas deste posto se necessário."}
              </p>

              {config.isCycleEnabled && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="cyclePostToRemove" className="text-white text-xs">Posto a FECHAR/REDUZIR:</Label>
                  <Select
                    value={config.cyclePostToRemove}
                    onValueChange={(v) => updateConfig({ cyclePostToRemove: v })}
                  >
                    <SelectTrigger id="cyclePostToRemove">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {localPostItems.map(item => (
                        <SelectItem key={item.post} value={item.post.toUpperCase()}>
                          {item.post}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <Button onClick={handleSave} className="text-white mt-auto">
              <LuSave className="mr-2 h-4 w-4" />
              Salvar Listas
            </Button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-lg text-white">Histórico</CardTitle>
          <CardDescription className="text-xs text-white">
            Exporte o relatório de compensação para o próximo mês.
          </CardDescription>
          <div className="flex gap-2">
            <Button onClick={onExport} variant="secondary" className="flex-1">
              <LuDownload className="mr-2 h-4 w-4" />
              Exportar Compensação
            </Button>
            
            <Input
              type="file"
              id="import-file-input"
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
            />
            <Button
              onClick={() => document.getElementById('import-file-input')?.click()}
              className="flex-1"
            >
              <LuUpload className="mr-2 h-4 w-4" />
              Importar Histórico
            </Button>
          </div>
          <Button onClick={onClear} variant="destructive" size="sm">
            <LuTrash2 className="mr-2 h-4 w-4" />
            Resetar App
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <CardTitle className="text-lg text-white">Gerar</CardTitle>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="month" className="text-white">Mês</Label>
              <Select
                value={String(config.month)}
                onValueChange={(v) => handleSelectNumberChange('month', v)}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="year" className="text-white">Ano</Label>
              <Input
                id="year"
                type="number"
                value={config.year}
                onChange={(e) => handleSelectNumberChange('year', e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LuCalendarCheck className="mr-2 h-4 w-4" />
            )}
            Gerar Escala
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
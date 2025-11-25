import React, { useMemo, useState } from 'react'; 
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
import { saveToLocalStorage }
  from '@/services/persistence';
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
  UserCheck as LuUserCheck
} from 'lucide-react';

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
  const { config, updateConfig } = useConfig();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState(""); 

  const handleSave = () => {
    try {
      const dataToSave = {
        escala_alunos: config.students,
        escala_alunos_count: String(config.studentCount),
        escala_alunos_excluidos: config.excludedStudents, 
        escala_turmas_count: String(config.classCount),
        escala_postos: config.servicePosts,
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
  const postItems = useMemo(() => {
    const posts = config.servicePosts.split('\n').filter(Boolean).map(s => s.trim());
    const slots = config.slots.split('\n').filter(Boolean).map(s => parseInt(s.trim(), 10));
    return posts.map((post, index) => ({
      id: `${post}-${index}-${Math.random()}`, 
      post: post,
      slots: slots[index] || 1,
    }));
  }, [config.servicePosts, config.slots]);

  const updateConfigFromItems = (items: { post: string, slots: number }[]) => {
    const newPosts = items.map(i => i.post).join('\n');
    const newSlots = items.map(i => i.slots).join('\n');
    updateConfig({ servicePosts: newPosts, slots: newSlots });
  };

  const handleAddNewPost = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newPost.trim() !== "") {
      e.preventDefault();
      const newItems = [...postItems, { id: crypto.randomUUID(), post: newPost.trim(), slots: 1 }];
      updateConfigFromItems(newItems);
      setNewPost(""); 
    }
  };

  const handleSlotChange = (id: string, newSlots: number) => {
    const newItems = postItems.map(item =>
      item.id === id ? { ...item, slots: Math.max(0, newSlots) } : item 
    );
    updateConfigFromItems(newItems);
  };

  const handleRemovePost = (id: string) => {
    const confirmation = prompt(`Tem certeza que deseja remover o posto "${postItems.find(i => i.id === id)?.post}"? Digite 'sim' para confirmar.`);
    if (confirmation === 'sim') {
      const newItems = postItems.filter(item => item.id !== id);
      updateConfigFromItems(newItems);
      const postName = postItems.find(i => i.id === id)?.post.toUpperCase();
      if (postName) {
        const newRestrictions = config.femaleRestrictedPosts.filter(p => p !== postName);
        updateConfig({ femaleRestrictedPosts: newRestrictions });
      }
    }
  };

  const servicePostsList = useMemo(() =>
    postItems.map(item => item.post.trim().toUpperCase()),
    [postItems]
  );

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
                  {postItems.length === 0 && <p className="text-xs text-white/50">Adicione postos primeiro.</p>}
                  {postItems.map((item) => {
                    const upperName = item.post.toUpperCase();
                    const isRestricted = config.femaleRestrictedPosts.includes(upperName);
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox 
                            id={`rest-${item.id}`} 
                            checked={isRestricted}
                            onCheckedChange={() => togglePostRestriction(upperName)}
                            className="data-[state=checked]:bg-pink-500 border-pink-400"
                        />
                        <label 
                            htmlFor={`rest-${item.id}`} 
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
            
            <Label className="text-white">Gerenciar Vagas</Label>
            <ScrollArea className="h-[300px] md:h-[500px] w-full rounded-md border p-4 bg-black/10">
              <div className="flex flex-col gap-3">
                {postItems.length === 0 && (
                  <p className="text-xs text-white/70 text-center">Nenhum posto adicionado.</p>
                )}
                {postItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-black/20">
                    <span className="text-white text-sm flex-1 truncate" title={item.post}>{item.post}</span>
                    <Input
                      type="number"
                      value={item.slots}
                      onChange={(e) => handleSlotChange(item.id, parseInt(e.target.value, 10))}
                      className="w-16 h-8 text-center"
                      min="0"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemovePost(item.id)}
                    >
                      <LuTrash2 className="h-4 w-4" />
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
                      {servicePostsList.map(post => (
                        <SelectItem key={post} value={post.toUpperCase()}>
                          {post}
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
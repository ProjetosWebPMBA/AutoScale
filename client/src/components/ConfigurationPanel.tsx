import React, { useMemo, useState, useEffect } from 'react'; 
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { useConfig } from '@/contexts/ConfigContext';
import { saveToLocalStorage } from '@/services/persistence';
import { useToast } from '@/hooks/use-toast';
import { MONTH_NAMES, ManualGroup, StudentData } from '@shared/schema';
import {
  Save as LuSave,
  Upload as LuUpload,
  Trash2 as LuTrash2,
  Loader2 as LuLoader2,
  CalendarCheck as LuCalendarCheck,
  Users as LuUsers,
  Plus as LuPlus,
  UserCheck as LuUserCheck,
  ArrowUp as LuArrowUp,
  ArrowDown as LuArrowDown,
  FileSpreadsheet as LuFileSpreadsheet,
  Edit3 as LuEdit3,
  Search as LuSearch,
  Eye as LuEye
} from 'lucide-react';

interface ConfigurationPanelProps {
  onGenerate: () => void;
  onExport: () => void;
  onImportHistory: (file: File) => void;
  onImportFull: (file: File) => void;
  onClear: () => void;
  isGenerating: boolean;
}

interface PostItem {
  id: string; 
  post: string;
  slots: number;
  legend: string;
}

export function ConfigurationPanel({
  onGenerate,
  onExport,
  onImportHistory,
  onImportFull,
  onClear,
  isGenerating,
}: ConfigurationPanelProps) {
  const { config, updateConfig } = useConfig();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState(""); 
  
  const [localPostItems, setLocalPostItems] = useState<PostItem[]>([]);
  const [studentImportText, setStudentImportText] = useState("");

  // ESTADO NOVO: Controla o texto dos dias ignorados localmente
  const [localIgnoredDays, setLocalIgnoredDays] = useState("");

  // Mantém estado local sincronizado com a config global (ex: ao importar arquivo)
  useEffect(() => {
    // Sincroniza Postos
    const posts = config.servicePosts.split('\n').filter(Boolean); 
    const slots = config.slots.split('\n').filter(Boolean).map(s => parseInt(s.trim(), 10));
    const legends = config.postLegends || [];

    const mapped = posts.map((post, index) => ({
      id: `post-${index}`, 
      post: post,
      slots: slots[index] || 1,
      legend: legends[index] || ""
    }));
    
    if (mapped.length !== localPostItems.length || mapped.some((m, i) => m.post !== localPostItems[i]?.post)) {
       setLocalPostItems(mapped);
    }

    // Sincroniza Dias Ignorados (CORREÇÃO DO BUG DA VÍRGULA)
    // Só atualizamos o texto local se a config mudar externamente (ex: importação)
    // Para evitar loops, comparamos se a representação numérica é diferente
    const currentConfigStr = config.ignoredDays.join(', ');
    setLocalIgnoredDays(currentConfigStr);

  }, [config.servicePosts, config.slots, config.postLegends, config.ignoredDays]);

  const updateConfigFromItems = (items: PostItem[]) => {
    const newPosts = items.map(i => i.post).join('\n');
    const newSlots = items.map(i => i.slots).join('\n');
    
    setLocalPostItems(items); 
    updateConfig({ 
        servicePosts: newPosts, 
        slots: newSlots,
        postLegends: items.map(i => i.legend) 
    });
  };

  const handleSave = () => {
    try {
      // Garante que os dias ignorados atuais no input sejam salvos, caso o usuário não tenha clicado fora
      handleIgnoredDaysBlur();

      const dataToSave = {
        escala_alunos: config.students,
        escala_alunos_count: String(config.studentCount),
        escala_alunos_excluidos: config.excludedStudents, 
        escala_turmas_count: String(config.classCount),
        escala_postos: config.servicePosts,
        escala_legendas: config.postLegends.join('\n'), 
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
        escala_dados_alunos: config.studentRegistry,
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateConfig({ [e.target.id]: e.target.value });
  };
  
  // Lógica corrigida para Dias Ignorados
  const handleIgnoredDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite digitar qualquer coisa (vírgula, espaço) sem validar imediatamente
    setLocalIgnoredDays(e.target.value);
  };

  const handleIgnoredDaysBlur = () => {
    // Só processa e envia para a config global quando sair do campo
    const parsed = localIgnoredDays
      .split(',')
      .map(d => parseInt(d.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
      
    // Remove duplicatas e ordena para ficar bonito
    const uniqueSorted = Array.from(new Set(parsed)).sort((a, b) => a - b);
    
    updateConfig({ ignoredDays: uniqueSorted });
    
    // Opcional: Reformatar o texto visualmente para ficar padrão "1, 2, 3"
    // setLocalIgnoredDays(uniqueSorted.join(', ')); // (O useEffect já fará isso quando a config atualizar)
  };
  
  const handleSelectNumberChange = (id: string, value: string) => {
     updateConfig({ [id]: parseInt(value, 10) });
  };

  const handleFileHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportHistory(e.target.files[0]);
      e.target.value = ''; 
    }
  };

  const handleFileFull = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportFull(e.target.files[0]);
      e.target.value = ''; 
    }
  };

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
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    updateConfigFromItems(newItems);
  };

  const handleRemovePost = (index: number) => {
    const item = localPostItems[index];
    const confirmation = prompt(`Tem certeza que deseja remover o posto "${item.post}"? Digite 'sim' para confirmar.`);
    if (confirmation === 'sim') {
      const newItems = localPostItems.filter((_, i) => i !== index);
      updateConfigFromItems(newItems);
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

  const parseName = (input: string) => {
      let warName = "";
      let cleanName = input;
      const warMatch = input.match(/\/(.*?)\//);
      
      if (warMatch && warMatch[1]) {
          warName = warMatch[1].trim();
          cleanName = input.replace(/\/.*?\//, warName).replace(/\s+/g, ' ');
      } else {
          warName = ""; 
      }
      return { cleanName, warName };
  };

  const handleProcessStudents = () => {
    if (!studentImportText.trim()) return;
    const lines = studentImportText.split('\n');
    const parsedData: StudentData[] = [];
    
    const ghRegex = /^(Al|Sd|Cb|Sgt|Sub|Asp|Ten|Cap|Maj|Cel)/i;
    const matRegex = /\d{7,}/;

    lines.forEach(line => {
       if (!line.trim()) return;
       const cleanLine = line.replace(/"/g, '').trim();
       
       let parts = cleanLine.split(/\t/); 
       if (parts.length < 2) parts = cleanLine.split(';'); 
       if (parts.length < 2) parts = cleanLine.split(','); 

       parts = parts.map(p => p.trim()).filter(Boolean);

       let id = "", gh = "Al Sd PM", rawName = "", mat = "";
       
       if (parts.length >= 4) {
           id = parts[0];
           gh = parts[1];
           rawName = parts[2];
           mat = parts[3];
       } else if (parts.length === 3) {
           id = parts[0];
           const part2 = parts[1];
           const part3 = parts[2];

           if (ghRegex.test(part2)) {
               gh = part2;
               rawName = part3;
           } else if (matRegex.test(part3)) {
               rawName = part2;
               mat = part3;
           } else {
               rawName = part2;
               mat = part3;
           }
       } else if (parts.length === 2) {
           id = parts[0];
           rawName = parts[1];
       } else {
           const matchId = cleanLine.match(/^(\d+)\s+(.*)/);
           if (matchId) {
               id = matchId[1];
               rawName = matchId[2];
           } else {
               rawName = cleanLine;
               id = (parsedData.length + 1).toString();
           }
       }

       const { cleanName, warName } = parseName(rawName);

       if (rawName && id) {
           const parsedId = parseInt(id, 10);
           const cleanId = !isNaN(parsedId) ? String(parsedId) : id;

           parsedData.push({
               id: cleanId,
               gh,
               name: cleanName,
               warName,
               matricula: mat,
               originalInput: rawName 
           });
       }
    });

    if (parsedData.length > 0) {
        parsedData.sort((a,b) => parseInt(a.id) - parseInt(b.id));

        const simpleIds = parsedData.map(d => d.id).join('\n');
        
        updateConfig({ 
            studentRegistry: parsedData,
            students: simpleIds,
            studentCount: parsedData.length
        });
        
        toast({ 
            title: "Dados Importados para a Tabela", 
            description: `${parsedData.length} alunos carregados.`,
            duration: 4000 
        });
        
        setStudentImportText("");
    } else {
        toast({ 
            variant: "destructive", 
            title: "Erro na Importação", 
            description: "Não foi possível identificar dados válidos." 
        });
    }
  };

  const expectedIds = useMemo(() => {
    if (config.isGroupMode && config.manualGroups.length > 0) {
        const all: string[] = [];
        config.manualGroups.forEach(g => {
             const members = g.students.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
             const normalizedMembers = members.map(m => {
                 const parsed = parseInt(m, 10);
                 return isNaN(parsed) ? m : String(parsed);
             });
             all.push(...normalizedMembers);
        });
        return Array.from(new Set(all)).sort((a,b) => parseInt(a) - parseInt(b));
    } else {
        return Array.from({length: config.studentCount}, (_, i) => String(i+1));
    }
  }, [config.isGroupMode, config.manualGroups, config.studentCount]);

  const handleRegistryEdit = (targetId: string, field: keyof StudentData, value: string) => {
      const currentRegistry = [...(config.studentRegistry || [])];
      
      let index = currentRegistry.findIndex(s => s.id === targetId);
      
      if (index === -1) {
          const targetNum = parseInt(targetId, 10);
          if (!isNaN(targetNum)) {
              const cleanTarget = String(targetNum);
              index = currentRegistry.findIndex(s => s.id === cleanTarget);
          }
      }
      
      let newData: StudentData;

      if (index > -1) {
          newData = { ...currentRegistry[index], [field]: value };
      } else {
          const parsed = parseInt(targetId, 10);
          const saveId = !isNaN(parsed) ? String(parsed) : targetId;
          
          newData = { id: saveId, gh: "Al Sd PM", name: "", warName: "", matricula: "", originalInput: "", [field]: value };
      }

      if (field === 'originalInput') {
          const { cleanName, warName } = parseName(value);
          newData.name = cleanName;
          newData.warName = warName;
      }

      if (index > -1) currentRegistry[index] = newData;
      else currentRegistry.push(newData);

      updateConfig({ studentRegistry: currentRegistry });
  };

  const getStudentDataForTable = (targetId: string) => {
      let reg = config.studentRegistry?.find(s => s.id === targetId);
      if (!reg) {
          const pid = parseInt(targetId, 10);
          if (!isNaN(pid)) {
              reg = config.studentRegistry?.find(s => s.id === String(pid));
          }
      }
      return reg || { gh: "Al Sd PM", originalInput: "", matricula: "", warName: "" };
  };

  return (
    <Card className="header-glass rounded-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Configurações
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
          
          {/* COLUNA 1 - ALUNOS */}
          <div className="flex flex-col gap-4">
            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-black/20">
                    <TabsTrigger value="list">Lista / Grupos</TabsTrigger>
                    <TabsTrigger value="import">Cadastro Detalhado</TabsTrigger>
                </TabsList>
                
                <TabsContent value="list" className="mt-2">
                    {config.isGroupMode ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-blue-200">Grupos Definidos</Label>
                          <Button size="sm" onClick={handleAddGroup} className="h-7 bg-blue-600 hover:bg-blue-500">
                            <LuPlus className="w-3 h-3 mr-1" /> Add Grupo
                          </Button>
                        </div>
                        <ScrollArea className="h-[200px] w-full rounded-md border border-blue-500/30 p-2 bg-black/20">
                          <div className="flex flex-col gap-3">
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
                                <textarea
                                     className="w-full h-16 bg-black/20 text-white text-xs p-1 rounded border border-white/10 focus:border-blue-500/50 outline-none resize-none"
                                     value={grp.students}
                                     onChange={(e) => handleUpdateGroup(grp.id, 'students', e.target.value)}
                                     placeholder="01; 02; 03..."
                                   />
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="studentCount" className="text-white">Alunos (IDs numéricos)</Label>
                        <div className="flex items-center gap-2 bg-black/10 p-3 rounded-md border">
                          <span className="text-white text-sm">Total:</span>
                          <Input
                            id="studentCount"
                            type="number"
                            value={config.studentCount}
                            onChange={(e) => updateConfig({ studentCount: parseInt(e.target.value, 10) || 0 })}
                            className="w-24"
                            min="1"
                          />
                        </div>
                        <p className="text-[10px] text-white/50">
                            Defina a quantidade para gerar os IDs (1 ao 74).
                        </p>
                        
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
                          <Label htmlFor="excludedStudents" className="text-white">Fora da Escala</Label>
                          <Input
                            id="excludedStudents"
                            value={config.excludedStudents}
                            onChange={handleTextChange} 
                            placeholder="Ex: 1; 37"
                          />
                        </div>
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="import" className="mt-2 space-y-4">
                    <div className="flex flex-col gap-2 bg-black/30 p-2 rounded border border-white/10">
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                            <LuFileSpreadsheet className="w-4 h-4 text-green-400" />
                            <span>Opção A: Colar (Detecção Automática)</span>
                        </div>
                        <textarea
                             className="w-full h-20 bg-black/20 text-white text-[10px] p-2 rounded border border-white/10 focus:border-green-500/50 outline-none resize-none font-mono"
                             value={studentImportText}
                             onChange={(e) => setStudentImportText(e.target.value)}
                             placeholder={`01  Al Sd PM  Ângelo /Mauro/ Miranda  920...\n02  Lucas /Silva/`}
                        />
                        <Button size="sm" variant="secondary" onClick={handleProcessStudents} disabled={!studentImportText.trim()}>
                            <LuSearch className="w-3 h-3 mr-2" />
                            Processar e Jogar para Tabela
                        </Button>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-white/80 text-xs mt-2">
                            <LuEdit3 className="w-4 h-4 text-blue-400" />
                            <span>Opção B: Tabela de Edição Individual</span>
                        </div>
                        <ScrollArea className="h-[300px] w-full rounded-md border border-white/10 bg-black/20">
                            <div className="min-w-[400px]">
                                <div className="flex bg-black/40 text-[10px] text-white/70 p-2 font-bold sticky top-0 z-10">
                                    <div className="w-8 text-center">Nº</div>
                                    <div className="w-16">GH</div>
                                    <div className="flex-1 px-1">Nome (Use barras: /Guerra/)</div>
                                    <div className="w-20 px-1">Matrícula</div>
                                </div>
                                {expectedIds.length === 0 && <p className="text-xs text-white/50 p-4">Defina alunos na aba "Lista" primeiro.</p>}
                                {expectedIds.map(id => {
                                    const reg = getStudentDataForTable(id);
                                    const hasWarError = !reg.warName;

                                    return (
                                        <div key={id} className="flex items-center border-b border-white/5 p-1 hover:bg-white/5 text-xs">
                                            <div className="w-8 text-center text-white font-bold">{id}</div>
                                            <Input 
                                                className="w-16 h-6 text-[10px] px-1 bg-transparent border-white/10 focus:bg-black/40 text-white" 
                                                value={reg.gh} 
                                                onChange={e => handleRegistryEdit(id, 'gh', e.target.value)}
                                            />
                                            <div className="flex-1 px-1 flex flex-col justify-center">
                                                <Input 
                                                    className={`w-full h-6 text-[10px] px-1 bg-transparent border-white/10 focus:bg-black/40 text-white ${hasWarError ? 'border-red-500/50 text-red-200' : ''}`}
                                                    value={reg.originalInput} 
                                                    placeholder="Ex: João /Silva/ Souza"
                                                    onChange={e => handleRegistryEdit(id, 'originalInput', e.target.value)}
                                                />
                                                {reg.originalInput && (
                                                    <span className={`text-[9px] ml-1 ${hasWarError ? 'text-red-400 font-bold' : 'text-green-300/70'}`}>
                                                        Guerra: <b>{reg.warName || "MISSING!"}</b>
                                                    </span>
                                                )}
                                            </div>
                                            <Input 
                                                className="w-20 h-6 text-[10px] px-1 bg-transparent border-white/10 focus:bg-black/40 text-white" 
                                                value={reg.matricula} 
                                                onChange={e => handleRegistryEdit(id, 'matricula', e.target.value)}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </TabsContent>
            </Tabs>

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
                        <label htmlFor={`rest-${index}`} className="text-xs text-white cursor-pointer select-none">
                            {item.post}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* COLUNA 2 - POSTOS */}
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
                {localPostItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 p-1 rounded hover:bg-black/20 group">
                    <div className="flex flex-col">
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-white" onClick={() => handleMovePost(index, 'up')} disabled={index === 0}>
                            <LuArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-white/50 hover:text-white" onClick={() => handleMovePost(index, 'down')} disabled={index === localPostItems.length - 1}>
                            <LuArrowDown className="w-3 h-3" />
                        </Button>
                    </div>
                    <Input value={item.post} onChange={(e) => handleEditItem(index, 'post', e.target.value)} className="flex-1 h-8 text-xs bg-transparent border-transparent hover:border-white/20 focus:border-white/50 text-white px-1" />
                    <Input value={item.legend} onChange={(e) => handleEditItem(index, 'legend', e.target.value)} className="w-12 h-8 text-xs bg-white/5 border-transparent hover:border-white/20 focus:border-white/50 text-yellow-200 px-1 text-center" placeholder="Sigla" maxLength={5} />
                    <Input type="number" value={item.slots} onChange={(e) => handleEditItem(index, 'slots', parseInt(e.target.value, 10))} className="w-10 h-8 text-center text-xs px-0 bg-transparent border-white/10 text-white" min="0" />
                    <Button variant="destructive" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => handleRemovePost(index)}>
                      <LuTrash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* COLUNA 3 - GERAIS */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsible" className="text-white">Responsável (Use /Guerra/)</Label>
              <Input id="responsible" value={config.responsible} onChange={handleTextChange} placeholder="Ex: Cap PM Fulano /Silva/ Souza" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsiblePosition" className="text-white">Cargo</Label>
              <Input id="responsiblePosition" value={config.responsiblePosition} onChange={handleTextChange} />
            </div>
            
            {/* INPUT DE DIAS IGNORADOS CORRIGIDO */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="ignoredDays" className="text-white">Dias Ignorados (Enter ou Tab para salvar)</Label>
              <Input 
                id="ignoredDays" 
                value={localIgnoredDays} 
                onChange={handleIgnoredDaysChange}
                onBlur={handleIgnoredDaysBlur}
                onKeyDown={(e) => { if(e.key === 'Enter') handleIgnoredDaysBlur() }}
                placeholder="ex: 1, 15, 21" 
              />
            </div>

            <div className="p-4 border rounded-md bg-black/10 backdrop-blur-sm flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="isCycleEnabled" checked={config.isCycleEnabled} onCheckedChange={(checked) => updateConfig({ isCycleEnabled: checked as boolean })} />
                <Label htmlFor="isCycleEnabled" className="font-semibold text-white cursor-pointer">Ciclo 3-2 Ativo</Label>
              </div>
              <p className="text-[10px] text-gray-300 leading-tight">Quando ativo: 3 dias normais, 2 reduzidos.</p>
              {config.isCycleEnabled && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="cyclePostToRemove" className="text-white text-xs">Posto a FECHAR/REDUZIR:</Label>
                  <Select value={config.cyclePostToRemove} onValueChange={(v) => updateConfig({ cyclePostToRemove: v })}>
                    <SelectTrigger id="cyclePostToRemove"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {localPostItems.map(item => (<SelectItem key={item.post} value={item.post.toUpperCase()}>{item.post}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button onClick={handleSave} className="text-white mt-auto">
              <LuSave className="mr-2 h-4 w-4" /> Salvar Listas
            </Button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-lg text-white">Histórico</CardTitle>
          <div className="flex gap-2">
            <Input type="file" id="import-history-input" className="hidden" accept=".json" onChange={handleFileHistory} />
            <Input type="file" id="import-full-input" className="hidden" accept=".json" onChange={handleFileFull} />
            
            <Button onClick={() => document.getElementById('import-history-input')?.click()} variant="secondary" className="flex-1 text-[10px] md:text-xs">
              <LuUpload className="mr-1 h-3 w-3" /> Importar Histórico (Prox. Mês)
            </Button>
            
            <Button onClick={() => document.getElementById('import-full-input')?.click()} className="flex-1 text-[10px] md:text-xs bg-green-600 hover:bg-green-500">
              <LuEye className="mr-1 h-3 w-3" /> Importar Escala Pronta (PDF)
            </Button>
          </div>
          <div className="flex gap-2">
             <Button onClick={onExport} className="flex-1 bg-blue-600 hover:bg-blue-500">
                <LuSave className="mr-2 h-4 w-4" /> Salvar Backup (JSON)
             </Button>
             <Button onClick={onClear} variant="destructive" size="icon">
                <LuTrash2 className="h-4 w-4" />
             </Button>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <CardTitle className="text-lg text-white">Gerar</CardTitle>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="month" className="text-white">Mês</Label>
              <Select value={String(config.month)} onValueChange={(v) => handleSelectNumberChange('month', v)}>
                <SelectTrigger id="month"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTH_NAMES.map((name, index) => (<SelectItem key={index} value={String(index)}>{name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="year" className="text-white">Ano</Label>
              <Input id="year" type="number" value={config.year} onChange={(e) => handleSelectNumberChange('year', e.target.value)} />
            </div>
          </div>
          <Button onClick={onGenerate} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? (<LuLoader2 className="mr-2 h-4 w-4 animate-spin" />) : (<LuCalendarCheck className="mr-2 h-4 w-4" />)} Gerar Escala
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
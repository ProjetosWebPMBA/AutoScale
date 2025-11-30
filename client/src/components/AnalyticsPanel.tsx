import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AnalyticsResult } from '@shared/schema';
import { BarChart3, Users, TrendingUp, ArrowUpDown, Layers } from 'lucide-react';

interface AnalyticsPanelProps {
  analytics: AnalyticsResult;
  highlightedStudents?: string[]; // Recebe a lista de PFems
}

type SortMode = 'numeric' | 'group';

export function AnalyticsPanel({ analytics, highlightedStudents = [] }: AnalyticsPanelProps) {
  const { studentStats, totalStudents, totalShiftsAssigned, averageShiftsPerStudent, postDistribution } = analytics;
  const [sortMode, setSortMode] = useState<SortMode>('group'); 

  // Função auxiliar para verificar se é PFem (CORRIGIDA)
  const isHighlighted = (studentName: string) => {
    if (!studentName || highlightedStudents.length === 0) return false;
    
    const sStr = studentName.trim();
    const sNum = parseInt(sStr, 10);
    const isSNumeric = !isNaN(sNum);

    return highlightedStudents.some(id => {
       const hStr = id.trim();
       if (!hStr) return false;
       const hNum = parseInt(hStr, 10);
       const isHNumeric = !isNaN(hNum);

       if (isSNumeric && isHNumeric) {
           return sNum === hNum;
       }
       return sStr === hStr; // Comparação exata de string
    });
  };

  // Lógica de Ordenação Dinâmica
  const sortedStats = [...studentStats].sort((a, b) => {
    const numA = parseInt(a.student.replace(/\D/g, ''), 10);
    const numB = parseInt(b.student.replace(/\D/g, ''), 10);
    const hasNum = !isNaN(numA) && !isNaN(numB);

    if (sortMode === 'group') {
      if (a.class !== b.class) {
        return a.class.localeCompare(b.class);
      }
      if (hasNum) return numA - numB;
      return a.student.localeCompare(b.student);
    } else {
      if (hasNum) return numA - numB;
      return a.student.localeCompare(b.student);
    }
  });

  const getBadgeStyle = (name: string) => {
    if (name === 'A') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (name === 'B') return 'bg-green-100 text-green-800 border-green-200';
    if (name === 'C') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (name === 'N/A' || name === 'Sem Grupo' || name === '?') return 'bg-gray-100 text-gray-800 border-gray-200';

    const palettes = [
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-rose-100 text-rose-800 border-rose-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-lime-100 text-lime-800 border-lime-200',
      'bg-violet-100 text-violet-800 border-violet-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  return (
    <Card className="w-full bg-card p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Análise da Escala
        </h2>
        
        <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
          <Button
            variant={sortMode === 'numeric' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortMode('numeric')}
            className="text-xs h-7 gap-2"
          >
            <ArrowUpDown className="w-3 h-3" />
            Por Numérica
          </Button>
          <Button
            variant={sortMode === 'group' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortMode('group')}
            className="text-xs h-7 gap-2"
          >
            <Layers className="w-3 h-3" />
            Por Grupo
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de Alunos</p>
          </div>
          <p className="text-2xl font-bold text-foreground" data-testid="stat-total-students">{totalStudents}</p>
        </div>

        <div className="bg-background border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Turnos Atribuídos</p>
          </div>
          <p className="text-2xl font-bold text-foreground" data-testid="stat-total-shifts">{totalShiftsAssigned}</p>
        </div>

        <div className="bg-background border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Média por Aluno</p>
          </div>
          <p className="text-2xl font-bold text-foreground" data-testid="stat-average-shifts">{averageShiftsPerStudent}</p>
        </div>

        <div className="bg-background border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Postos</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{Object.keys(postDistribution).length}</p>
        </div>
      </div>

      {/* Post Distribution */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 text-foreground">Distribuição por Posto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(postDistribution).map(([post, count]) => (
            <div key={post} className="bg-background border border-border rounded-md p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{post}</p>
              <p className="text-lg font-semibold text-foreground">{count} turnos</p>
            </div>
          ))}
        </div>
      </div>

      {/* Student Stats Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Estatísticas por Aluno</h3>
          {highlightedStudents.length > 0 && (
            <div className="text-xs flex items-center gap-2 bg-pink-100 px-2 py-1 rounded border border-pink-300 text-pink-800">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              PFem (Destaque)
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">Aluno</th>
                <th className="border border-border px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide">Sala / Grupo</th>
                <th className="border border-border px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide">Turnos</th>
                <th className="border border-border px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide">Folgas</th>
                {Object.keys(postDistribution).map(post => (
                  <th key={post} className="border border-border px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide">
                    {post.substring(0, 12)}...
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((stats) => {
                const isPfem = isHighlighted(stats.student);
                return (
                  <tr 
                    key={stats.student} 
                    data-testid={`stats-row-${stats.student}`} 
                    className={`hover:bg-muted/50 transition-colors ${isPfem ? 'bg-pink-100 dark:bg-pink-900/40' : ''}`}
                  >
                    <td className="border border-border px-3 py-2 font-medium">
                      {stats.student}
                      {/* ESTRELA VERMELHA */}
                      {isPfem && <span className="ml-1.5 text-[10px] text-red-500 font-bold">★</span>}
                    </td>
                    <td className="border border-border px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold border ${getBadgeStyle(stats.class)}`}>
                        {stats.class}
                      </span>
                    </td>
                    <td className="border border-border px-3 py-2 text-center font-semibold">{stats.totalShifts}</td>
                    <td className="border border-border px-3 py-2 text-center text-muted-foreground">{stats.totalDaysOff}</td>
                    {Object.keys(postDistribution).map(post => (
                      <td key={post} className="border border-border px-3 py-2 text-center text-xs">
                        {stats.postBreakdown[post] || 0}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
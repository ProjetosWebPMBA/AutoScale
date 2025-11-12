import { Card } from '@/components/ui/card';
import type { AnalyticsResult } from '@shared/schema';
import { BarChart3, Users, TrendingUp } from 'lucide-react';

interface AnalyticsPanelProps {
  analytics: AnalyticsResult;
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const { studentStats, totalStudents, totalShiftsAssigned, averageShiftsPerStudent, postDistribution } = analytics;

  // Sort students by class and number
  const sortedStats = [...studentStats].sort((a, b) => {
    if (a.class !== b.class) {
      return a.class.localeCompare(b.class);
    }
    return parseInt(a.student) - parseInt(b.student);
  });

  return (
    <Card className="w-full bg-card p-6">
      <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Análise da Escala
      </h2>

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
        <h3 className="text-lg font-medium mb-4 text-foreground">Estatísticas por Aluno</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">Aluno</th>
                <th className="border border-border px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide">Sala</th>
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
              {sortedStats.map((stats) => (
                <tr key={stats.student} data-testid={`stats-row-${stats.student}`} className="hover:bg-muted/30">
                  <td className="border border-border px-3 py-2 font-medium">{stats.student}</td>
                  <td className="border border-border px-3 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-medium ${
                      stats.class === 'A' ? 'bg-blue-100 text-blue-800' :
                      stats.class === 'B' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

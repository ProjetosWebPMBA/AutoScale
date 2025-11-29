import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { GenerationResult } from '@shared/schema';
import { FileDown } from 'lucide-react';

interface ScheduleViewProps {
  result: GenerationResult;
  onExportPDF: () => void;
  highlightedStudents?: string[]; // (NOVO) Lista de IDs para destacar (PFems)
}

export function ScheduleView({ result, onExportPDF, highlightedStudents = [] }: ScheduleViewProps) {
  const { scheduleData, scheduleTitle, postRows, allDays, ignoredDays } = result;

  // Função auxiliar para checar se deve destacar (LÓGICA CORRIGIDA)
  const shouldHighlight = (studentValue: string | null) => {
    if (!studentValue || highlightedStudents.length === 0) return false;
    
    // Normaliza o valor da célula (aluno na escala)
    const studentStr = studentValue.trim();
    const studentNum = parseInt(studentStr, 10);
    const isStudentNumeric = !isNaN(studentNum);

    return highlightedStudents.some(highlightId => {
       const hStr = highlightId.trim();
       if (!hStr) return false;

       const hNum = parseInt(hStr, 10);
       const isHNumeric = !isNaN(hNum);

       // Se ambos forem numéricos (ex: "02" e "2"), compara pelo valor numérico
       // Isso resolve "02" não achando "2" e impede "2" de achar "12"
       if (isStudentNumeric && isHNumeric) {
           return studentNum === hNum;
       }
       
       // Se não forem números (ex: nomes), compara strings exatas
       return studentStr === hStr;
    });
  };

  return (
    <Card className="w-full bg-card p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-foreground">{scheduleTitle}</h2>
        <div className="flex items-center gap-4">
          {/* Legenda Opcional */}
          {highlightedStudents.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 bg-red-100 border border-red-500 rounded-sm block"></span>
              <span className="text-red-600 font-semibold">PFem (Destaque)</span>
            </div>
          )}
          <Button
            data-testid="button-export-pdf"
            onClick={onExportPDF}
            className="bg-primary hover:bg-primary/90"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Gerar PDF da Escala
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border bg-background px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide sticky left-0 z-10">
                  Posto/Dia
                </th>
                {allDays.map((dayInfo) => {
                  const isWeekend = dayInfo.dayOfWeek === 0 || dayInfo.dayOfWeek === 6;
                  const isIgnored = ignoredDays.has(dayInfo.day);
                  
                  return (
                    <th
                      key={dayInfo.day}
                      data-testid={`header-day-${dayInfo.day}`}
                      className={`border border-border px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide min-w-[60px] ${
                        isWeekend ? 'bg-muted/70' : 'bg-muted'
                      } ${isIgnored ? 'bg-muted/50 text-muted-foreground' : ''}`}
                    >
                      <div>{dayInfo.day}</div>
                      <div className="text-[10px] font-normal mt-0.5">
                        {dayInfo.dayOfWeekInitial}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {postRows.map((rowName, rowIndex) => (
                <tr key={rowName} data-testid={`row-post-${rowIndex}`}>
                  <td className="border border-border bg-background px-3 py-2 font-medium text-xs sticky left-0 z-10">
                    {rowName}
                  </td>
                  {allDays.map((dayInfo) => {
                    const cell = scheduleData[rowName][dayInfo.day];
                    const isWeekend = cell.isWeekend;
                    const isIgnored = cell.isIgnoredDay;
                    const isHighlighted = shouldHighlight(cell.student); // Lógica nova aplicada aqui

                    return (
                      <td
                        key={dayInfo.day}
                        data-testid={`cell-${rowIndex}-${dayInfo.day}`}
                        className={`border border-border px-3 py-2 text-center text-xs ${
                          isWeekend ? 'bg-secondary/30' : 'bg-background' 
                        } ${isIgnored ? 'bg-muted/30 text-muted-foreground' : ''} ${
                          isHighlighted ? 'bg-red-50 text-red-600 font-bold border-red-200' : '' 
                        }`}
                      >
                        {cell.student || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ignoredDays.size > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          <span className="font-medium">Dias ignorados:</span> {Array.from(ignoredDays).sort((a, b) => a - b).join(', ')}
        </p>
      )}
    </Card>
  );
}
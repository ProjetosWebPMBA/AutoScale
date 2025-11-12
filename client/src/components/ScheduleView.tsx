import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GenerationResult } from '@shared/schema';
import { FileDown } from 'lucide-react';

interface ScheduleViewProps {
  result: GenerationResult;
  onExportPDF: () => void;
}

export function ScheduleView({ result, onExportPDF }: ScheduleViewProps) {
  const { scheduleData, scheduleTitle, postRows, allDays, ignoredDays } = result;

  return (
    <Card className="w-full bg-card p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-foreground">{scheduleTitle}</h2>
        <Button
          data-testid="button-export-pdf"
          onClick={onExportPDF}
          className="bg-primary hover:bg-primary/90"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Gerar PDF da Escala
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-max">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border bg-muted px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide sticky left-0 z-10">
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
                  <td className="border border-border bg-card px-3 py-2 font-medium text-xs sticky left-0 z-10">
                    {rowName}
                  </td>
                  {allDays.map((dayInfo) => {
                    const cell = scheduleData[rowName][dayInfo.day];
                    const isWeekend = cell.isWeekend;
                    const isIgnored = cell.isIgnoredDay;

                    return (
                      <td
                        key={dayInfo.day}
                        data-testid={`cell-${rowIndex}-${dayInfo.day}`}
                        className={`border border-border px-3 py-2 text-center text-xs ${
                          isWeekend ? 'bg-secondary/30' : 'bg-background'
                        } ${isIgnored ? 'bg-muted/30 text-muted-foreground' : ''}`}
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
      </ScrollArea>

      {ignoredDays.size > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          <span className="font-medium">Dias ignorados:</span> {Array.from(ignoredDays).sort((a, b) => a - b).join(', ')}
        </p>
      )}
    </Card>
  );
}

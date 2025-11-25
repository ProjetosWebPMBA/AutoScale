import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// Importações necessárias do @shared/schema (como no arquivo antigo)
import { MONTH_NAMES, DAY_INITIALS } from "@shared/schema";

// --- DEFINIÇÕES DE TIPO (Mantidas para compatibilidade da função) ---
interface DayInfo {
  day: number;
  dayOfWeek: number;
  dayOfWeekInitial: string;
  assignments: object;
}
interface ScheduleCell {
  student: string | null;
  isWeekend: boolean;
  isIgnoredDay: boolean;
}
interface PDFData {
  responsavel: string;
  cargoResponsavel: string;
  postoVagasRows: string[];
  allDays: DayInfo[]; 
  scheduleTitle: string; // Nota: este título não será usado, vamos gerar o antigo
  diasNoMes: number;
  scheduleData: { [posto: string]: { [dia: number]: ScheduleCell } }; 
  ignoredDays: Set<number>;
  basePostos: string[]; // Nota: Não usado na lógica antiga
  mes: number; // 0-11
  ano: number;
}
// --------------------------------------------------------

// REMOVIDO: const logoBase64 = "data:image/png;base64,iVBORw0KG..."
// REMOVIDO: const diasDaSemanaIniciais = [...]

export const generateSchedulePDF = (data: PDFData) => {
  const {
    responsavel, cargoResponsavel, postoVagasRows,
    diasNoMes, scheduleData, ignoredDays,
    mes, ano
  } = data;

  // 1. Validação (Adaptada para console, pois 'alert' não existe no 'antigo')
  if (postoVagasRows.length === 0) {
    console.error("Por favor, gere uma escala primeiro.");
    return;
  }
  if (!responsavel) {
    console.error("Por favor, preencha o campo 'Responsável (Nome e Graduação)' antes de gerar o PDF.");
    return;
  }
  if (!cargoResponsavel) {
    console.error("Por favor, preencha o campo 'Cargo do Responsável' antes de gerar o PDF.");
    return;
  }

  // Configuração do Documento (Como no arquivo antigo)
  const doc = new jsPDF({ 
    orientation: 'landscape',
    unit: 'mm', // Alterado de 'pt' para 'mm' (como no pdfExporter antigo)
    format: 'a4'
  });

  // Title (Estilo antigo)
  const title = `ESCALA DE SERVIÇO - ${MONTH_NAMES[mes].toUpperCase()} / ${ano}`;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });

  // REMOVIDO: Lógica do "VISTO"
  // REMOVIDO: Lógica do Logo
  // REMOVIDO: Cabeçalho timbrado e título em vermelho

  // Prepare table data (Estilo antigo)
  const headers: string[] = ['POSTO/DIA'];

  // Create day headers with day of week initials
  for (let day = 1; day <= diasNoMes; day++) {
    const date = new Date(ano, mes, day);
    const dayOfWeek = date.getDay();
    const initial = DAY_INITIALS[dayOfWeek];
    headers.push(`${day}\n${initial}`);
  }

  // Prepare rows (Estilo antigo)
  const rows: string[][] = [];

  // Usamos 'postoVagasRows' que é o equivalente a 'postRows' do outro arquivo
  for (const rowName of postoVagasRows) {
    const rowData: string[] = [rowName];

    for (let day = 1; day <= diasNoMes; day++) {
      // Adaptado para a estrutura de dados de 'PDFData'
      const cellData = scheduleData[rowName]?.[day];
      rowData.push(cellData?.student || '-');
    }

    rows.push(rowData);
  }

  // Generate table (Configurações antigas)
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 15,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6,
    },
    columnStyles: {
      0: { 
        cellWidth: 40, 
        halign: 'left',
        fontStyle: 'bold',
      },
    },
    didDrawCell: (data) => {
      // Lógica de desenho antiga (separada)
      if (data.section === 'body' && data.column.index > 0) {
        const day = data.column.index;
        const date = new Date(ano, mes, day); // Adaptado de 'year' e 'month'
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        // 'ignoredDays' vem do objeto 'data'
        const isIgnored = ignoredDays.has(day);

        // Bloco para Fim de Semana
        if (isWeekend) {
          doc.setFillColor(229, 229, 229);
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            'F'
          );
          
          // Redraw text
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
          const text = data.cell.raw as string;
          doc.text(
            text,
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2,
            { align: 'center', baseline: 'middle' }
          );
        }

        // Bloco para Dias Ignorados
        if (isIgnored) {
          doc.setFillColor(240, 240, 240);
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            'F'
          );
          
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(7);
          const text = data.cell.raw as string;
          doc.text(
            text,
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2,
            { align: 'center', baseline: 'middle' }
          );
        }
      }
    },
    margin: { top: 15, left: 10, right: 10 },
    tableWidth: 'auto',
  });

  // REMOVIDO: Lógica de renderização de corpo complexa (basePostos)

  // Add footer with responsible information (Estilo antigo)
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (responsavel || cargoResponsavel) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Lógica antiga de posicionamento do rodapé
    const footerY = Math.max(finalY + 15, pageHeight - 30);
    
    if (responsavel) {
      doc.text(responsavel, doc.internal.pageSize.getWidth() / 2, footerY, { align: 'center' });
    }
    if (cargoResponsavel) {
      doc.text(cargoResponsavel, doc.internal.pageSize.getWidth() / 2, footerY + 5, { align: 'center' });
    }
  }

  // Save the PDF
  const filename = `escala_${MONTH_NAMES[mes].toLowerCase()}_${ano}.pdf`;
  doc.save(filename);
};
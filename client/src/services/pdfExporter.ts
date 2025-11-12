import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerationResult } from "@shared/schema";
import { MONTH_NAMES, DAY_INITIALS } from "@shared/schema";

/**
 * Export schedule to PDF in landscape format
 */
export function exportToPDF(
  result: GenerationResult,
  responsible: string,
  responsiblePosition: string,
  month: number,
  year: number
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const { scheduleData, postRows, daysInMonth, ignoredDays } = result;

  // Title
  const title = `ESCALA DE SERVIÇO - ${MONTH_NAMES[month].toUpperCase()} / ${year}`;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });

  // Prepare table data
  const headers: string[] = ['POSTO/DIA'];
  const dayHeaders: string[] = [];

  // Create day headers with day of week initials
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const initial = DAY_INITIALS[dayOfWeek];
    dayHeaders.push(`${day}\n${initial}`);
    headers.push(`${day}\n${initial}`);
  }

  // Prepare rows
  const rows: string[][] = [];

  for (const rowName of postRows) {
    const rowData: string[] = [rowName];

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = scheduleData[rowName][day];
      rowData.push(cell.student || '-');
    }

    rows.push(rowData);
  }

  // Generate table
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
      // Highlight weekends
      if (data.section === 'body' && data.column.index > 0) {
        const day = data.column.index;
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isIgnored = ignoredDays.has(day);

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

  // Add footer with responsible information
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (responsible || responsiblePosition) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const footerY = Math.max(finalY + 15, pageHeight - 30);
    
    if (responsible) {
      doc.text(responsible, doc.internal.pageSize.getWidth() / 2, footerY, { align: 'center' });
    }
    if (responsiblePosition) {
      doc.text(responsiblePosition, doc.internal.pageSize.getWidth() / 2, footerY + 5, { align: 'center' });
    }
  }

  // Save the PDF
  const filename = `escala_${MONTH_NAMES[month].toLowerCase()}_${year}.pdf`;
  doc.save(filename);
}

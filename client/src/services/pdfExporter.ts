import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerationResult } from "@shared/schema";
import { MONTH_NAMES, DAY_INITIALS } from "@shared/schema";

/**
 * Helper para carregar a imagem e obter suas dimensões originais
 */
const loadImage = (src: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({ 
            dataUrl: canvas.toDataURL('image/png'),
            width: img.width,
            height: img.height
        });
      } else {
        reject(new Error("Não foi possível criar o contexto do canvas"));
      }
    };
    img.onerror = (e) => reject(e);
  });
};

function getBasePostName(rowName: string): string {
  return rowName.replace(/\s*\d+$/, '').trim().toUpperCase();
}

export async function exportToPDF(
  result: GenerationResult,
  responsible: string,
  responsiblePosition: string,
  month: number,
  year: number,
  femaleStudents: string[] 
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- 1. CABEÇALHO ---
  
  try {
    const logoInfo = await loadImage('/logo-pmba.png');
    
    // LÓGICA DE PROPORÇÃO (ASPECT RATIO)
    const targetWidth = 32; 
    const aspectRatio = logoInfo.height / logoInfo.width;
    const targetHeight = targetWidth * aspectRatio;

    doc.addImage(logoInfo.dataUrl, 'PNG', pageWidth - 40, 5, targetWidth, targetHeight); 
  } catch (e) {
    console.warn("Logo não carregada", e);
  }

  doc.setDrawColor(0); 
  doc.setLineWidth(0.2);
  doc.rect(10, 8, 35, 22); 

  doc.setFontSize(8);
  doc.setFont('times', 'normal'); 
  doc.text("VISTO", 27.5, 12, { align: 'center' });
  doc.text("Em _____/_____/_____.", 27.5, 18, { align: 'center' });
  doc.line(12, 24, 43, 24); 
  doc.setFontSize(7);
  doc.text("Cmt da OPM", 27.5, 28, { align: 'center' });

  doc.setFont('times', 'bold'); 
  doc.setFontSize(11);
  doc.text("POLÍCIA MILITAR DA BAHIA", pageWidth / 2, 10, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text("CENTRO DE FORMAÇÃO E APERFEIÇOAMENTO DE PRAÇAS", pageWidth / 2, 15, { align: 'center' });
  doc.text("9º BATALHÃO DE ENSINO, INSTRUÇÃO E CAPACITAÇÃO", pageWidth / 2, 19, { align: 'center' });
  
  doc.setFontSize(12);
  const title = "ESCALA GERAL";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line((pageWidth / 2) - (titleWidth / 2), 26, (pageWidth / 2) + (titleWidth / 2), 26);

  doc.setTextColor(200, 0, 0); 
  doc.text(`${MONTH_NAMES[month].toUpperCase()} ${year}`, pageWidth / 2, 32, { align: 'center' });
  doc.setTextColor(0, 0, 0); 

  // --- 2. PREPARAÇÃO DOS DADOS ---
  const { scheduleData, postRows, daysInMonth, ignoredDays } = result;

  const rowInitials = ['DIA']; 
  const rowNumbers = ['DATA']; 
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    rowInitials.push(DAY_INITIALS[dayOfWeek]);
    rowNumbers.push(String(day).padStart(2, '0'));
  }

  const head = [
    [
      { content: 'LOCAL', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [190, 190, 190] } },
      { content: 'DIA', styles: { halign: 'center', fillColor: [220, 220, 220] } },
      ...rowInitials.slice(1)
    ],
    [
      { content: 'DATA', styles: { halign: 'center', fillColor: [220, 220, 220] } },
      ...rowNumbers.slice(1)
    ]
  ];

  // --- CONSTRUÇÃO DO CORPO COM LINHAS ESPAÇADORAS ---
  const body: string[][] = [];
  let lastBaseName = "";

  postRows.forEach((rowName, index) => {
    const currentBaseName = getBasePostName(rowName);

    if (index > 0 && currentBaseName !== lastBaseName) {
      const spacerRow = new Array(daysInMonth + 2).fill('');
      spacerRow[0] = '__SPACER__'; 
      body.push(spacerRow);
    }

    const row = [rowName];
    row.push(''); 
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = scheduleData[rowName][day];
      row.push(cell?.student || '-');
    }
    body.push(row);

    lastBaseName = currentBaseName;
  });

  // --- 3. GERAÇÃO DA TABELA ---
  
  let isBlueBackground = false; 
  let currentBlockBaseName = "";

  autoTable(doc, {
    startY: 36,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      // -- AJUSTES DE ALTURA AQUI --
      cellPadding: 1.5, // Aumentado de 0.8 para 1.5 para dar respiro interno
      minCellHeight: 5.5, // Altura mínima forçada em mm para cada linha
      // ----------------------------
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.3, // Mantém bordas grossas para definição
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.3,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { 
        cellWidth: 45, 
        halign: 'left',
        fontStyle: 'bold',
      },
      1: {
        cellWidth: 12, 
        halign: 'center',
        fillColor: [245, 245, 245] 
      }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rawRow = data.row.raw as string[];
        const firstCell = rawRow[0];

        // CASO 1: LINHA ESPAÇADORA
        if (firstCell === '__SPACER__') {
            data.cell.styles.minCellHeight = 1.5;
            data.cell.styles.cellPadding = 0;
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = 0; // Sem bordas na spacer
            data.cell.text = [];
            return; 
        }

        // CASO 2: LINHA DE DADOS NORMAL
        if (data.column.index === 0) {
           const baseName = getBasePostName(firstCell);
           if (baseName !== currentBlockBaseName) {
               if (currentBlockBaseName !== "") {
                   isBlueBackground = !isBlueBackground;
               }
               currentBlockBaseName = baseName;
           }
        }

        let baseColor: [number, number, number] = isBlueBackground ? [230, 240, 255] : [255, 255, 255];

        if (data.column.index > 1) {
            const day = data.column.index - 1; 
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isIgnored = ignoredDays.has(day);

            if (isIgnored) {
                baseColor = [240, 240, 240];
                data.cell.styles.textColor = [180, 180, 180];
            } else if (isWeekend) {
                baseColor = [230, 230, 230];
            }
            
            const cellText = data.cell.raw as string;
            const isPfem = femaleStudents.some(f => cellText.trim() === f || cellText.includes(f));

            if (isPfem && !isIgnored) {
                baseColor = [255, 240, 245];
                data.cell.styles.textColor = [200, 0, 0];
                data.cell.styles.fontStyle = 'bold';
            }
        }

        data.cell.styles.fillColor = baseColor;
      }

      if (data.section === 'head' && data.row.index === 0 && data.column.index > 1) {
          data.cell.styles.fillColor = [220, 220, 220];
      }
    },
    didDrawCell: (data) => {
        // Desenho manual de bordas grossas nos blocos
        if (data.section === 'body') {
            const rawRow = data.row.raw as string[];
            
            if (rawRow[0] === '__SPACER__') return;

            const nextRow = data.table.body[data.row.index + 1];
            const prevRow = data.table.body[data.row.index - 1];
            
            const isNextSpacer = nextRow && (nextRow.raw as string[])[0] === '__SPACER__';
            const isPrevSpacer = prevRow && (prevRow.raw as string[])[0] === '__SPACER__';
            const isFirstRow = data.row.index === 0;
            const isLastRow = !nextRow;

            const borderThickness = 0.4; 
            
            data.doc.setDrawColor(0);
            data.doc.setLineWidth(borderThickness);

            if (isLastRow || isNextSpacer) {
                data.doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }

            if (isFirstRow || isPrevSpacer) {
                data.doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
            }
        }
    },
    margin: { top: 10, left: 10, right: 10, bottom: 20 },
  });

  // --- 4. RODAPÉ ---
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  
  let footerY = finalY + 15;
  if (footerY > pageHeight - 20) {
      doc.addPage();
      footerY = 20;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text(responsible.toUpperCase(), pageWidth / 2, footerY, { align: 'center' });
  
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.text(responsiblePosition, pageWidth / 2, footerY + 5, { align: 'center' });

  const filename = `escala_${MONTH_NAMES[month].toLowerCase()}_${year}.pdf`;
  doc.save(filename);
}
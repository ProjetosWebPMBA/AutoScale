import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerationResult, StudentData, ManualGroup } from "@shared/schema";
import { MONTH_NAMES, DAY_INITIALS } from "@shared/schema";

// Helper para carregar logo
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

export async function exportToPDF(
  result: GenerationResult,
  responsible: string,
  responsiblePosition: string,
  month: number,
  year: number,
  femaleStudents: string[],
  studentRegistry: StudentData[],
  manualGroups: ManualGroup[],
  isGroupMode: boolean,
  servicePosts: string[],
  postLegends: string[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const daysInMonth = result.daysInMonth;

  // Margem esquerda padrão para alinhar VISTO e Tabela
  const marginLeft = 10;

  // --- 1. PREPARAÇÃO DOS DADOS (INVERSÃO DA MATRIZ) ---
  const studentSchedule: Record<string, Record<number, string>> = {};
  
  const slotsCountMap: Record<string, number> = {};
  result.postRows.forEach(row => {
      const base = row.replace(/\s*\d+$/, '').trim().toUpperCase();
      slotsCountMap[base] = (slotsCountMap[base] || 0) + 1;
  });

  const getLegend = (rowName: string) => {
      const baseName = rowName.replace(/\s*\d+$/, '').trim();
      const baseNameUpper = baseName.toUpperCase();
      
      const index = servicePosts.findIndex(p => p.trim().toUpperCase() === baseNameUpper);
      // Pega a legenda configurada ou gera as iniciais
      const rawLegend = (index >= 0 && postLegends[index]) ? postLegends[index] : baseName.substring(0, 2).toUpperCase();
      
      // 1. LÓGICA DE LISTA CUSTOMIZADA (Ex: "PS1, PS2, PSE")
      if (rawLegend.includes(',') || rawLegend.includes(';')) {
          const customLegends = rawLegend.split(/[;,]+/).map(s => s.trim());
          
          // Extrai o número da vaga do nome da linha (Ex: "Guarda 3" -> 3)
          // Se não tiver número (vaga única), assume 1
          const numMatch = rowName.match(/(\d+)$/);
          const slotNum = numMatch ? parseInt(numMatch[1], 10) : 1;
          const arrayIndex = slotNum - 1; // Array base 0

          // Se houver legenda definida para essa posição específica, usa ela
          if (arrayIndex < customLegends.length) {
              return customLegends[arrayIndex];
          }
          // Fallback seguro: usa a primeira legenda + numero
          return `${customLegends[0]}${slotNum}`;
      }

      // 2. LÓGICA PADRÃO (Automática: Sigla + Número se > 1 vaga)
      if (slotsCountMap[baseNameUpper] > 1) {
          const numMatch = rowName.match(/(\d+)$/);
          const num = numMatch ? numMatch[1] : '1';
          return `${rawLegend}${num}`;
      }
      
      // 3. VAGA ÚNICA (Retorna a sigla pura, ex: "AD")
      return rawLegend;
  };

  result.postRows.forEach(rowName => {
      const legend = getLegend(rowName);
      
      for (let day = 1; day <= daysInMonth; day++) {
          const cell = result.scheduleData[rowName]?.[day];
          if (cell && cell.student) {
              const studentId = cell.student.trim();
              const normalizedId = String(parseInt(studentId, 10));
              
              if (!studentSchedule[normalizedId]) studentSchedule[normalizedId] = {};
              studentSchedule[normalizedId][day] = legend;
              
              if (studentId !== normalizedId) {
                  if (!studentSchedule[studentId]) studentSchedule[studentId] = {};
                  studentSchedule[studentId][day] = legend;
              }
          }
      }
  });

  // --- 2. CABEÇALHO OFICIAL ---
  
  // Caixa VISTO (Maximizada)
  const vistoWidth = 40;
  const vistoHeight = 22;
  const vistoY = 8;

  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.rect(marginLeft, vistoY, vistoWidth, vistoHeight); 
  
  // Textos do Visto
  const vistoCenterX = marginLeft + (vistoWidth / 2);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text("VISTO", vistoCenterX, vistoY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text("Em _____/_____/_____.", vistoCenterX, vistoY + 9, { align: 'center' });
  
  const lineY = vistoY + 15;
  doc.line(marginLeft, lineY, marginLeft + vistoWidth, lineY);
  
  doc.setFontSize(6);
  doc.text("Cmt da OPM", vistoCenterX, lineY + 4, { align: 'center' });

  // --- LOGOS ---
  const baseUrl = import.meta.env.BASE_URL;
  const logoHeight = 22; 
  const logoY = 6; 
  
  // LOGO 1: PMBA (Esquerda)
  try {
    const logoPath = `${baseUrl}logo-pmba.png`.replace(/\/\//g, '/');
    const logoInfo = await loadImage(logoPath);
    
    const ratio = logoInfo.width / logoInfo.height;
    const targetWidth = logoHeight * ratio; 

    const logoX = marginLeft + vistoWidth + 2; 
    doc.addImage(logoInfo.dataUrl, 'PNG', logoX, logoY, targetWidth, logoHeight); 
  } catch (e) { console.warn("Logo PMBA fail"); }

  // LOGO 2: 9º BEIC (Direita)
  try {
    const logo2Path = `${baseUrl}logo-9beic.png`.replace(/\/\//g, '/');
    const logo2Info = await loadImage(logo2Path);
    
    const ratio2 = logo2Info.width / logo2Info.height;
    const targetWidth2 = logoHeight * ratio2; 

    const logo2X = pageWidth - (marginLeft + vistoWidth + 2) - targetWidth2;
    doc.addImage(logo2Info.dataUrl, 'PNG', logo2X, logoY, targetWidth2, logoHeight); 
  } catch (e) { console.warn("Logo 9BEIC fail"); }


  // Textos Centrais do Cabeçalho
  doc.setFont('times', 'bold');
  const centerX = pageWidth / 2;
  
  doc.setFontSize(11);
  doc.text("POLÍCIA MILITAR DA BAHIA", centerX, 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text("CENTRO DE FORMAÇÃO E APERFEIÇOAMENTO DE PRAÇAS", centerX, 16, { align: 'center' });
  doc.text("9º BATALHÃO DE ENSINO, INSTRUÇÃO E CAPACITAÇÃO", centerX, 20, { align: 'center' });
  doc.text("CORPO DE ALUNOS", centerX, 24, { align: 'center' });

  // Título (PRETO e SUBLINHADO)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0); 
  const title = `ESCALA DE SERVIÇO CFSD ${year} - ${MONTH_NAMES[month].toUpperCase()}/${year}`;
  doc.text(title, centerX, 33, { align: 'center' });
  
  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(0.5);
  doc.line(centerX - (titleWidth / 2), 34, centerX + (titleWidth / 2), 34);
  doc.setLineWidth(0.1); 

  // --- 3. CONSTRUÇÃO DAS LINHAS ---
  const columns = [
    { header: 'Nº', dataKey: 'num' },
    { header: 'GH', dataKey: 'gh' },
    { header: 'NOME COMPLETO', dataKey: 'nome' }, // Alterado cabeçalho
    { header: 'MAT', dataKey: 'mat' },
  ];

  for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayInitial = DAY_INITIALS[date.getDay()];
      columns.push({ header: `${d}\n${dayInitial}`, dataKey: `day_${d}` });
  }

  const body: any[] = [];

  const createStudentRow = (studentId: string) => {
      const normalizedId = String(parseInt(studentId, 10));
      const reg = studentRegistry.find(s => s.id === studentId) || studentRegistry.find(s => s.id === normalizedId);
      
      const row: any = {
          num: reg ? reg.id : studentId,
          gh: reg ? reg.gh : '',
          // AQUI: Usamos o Nome COMPLETO, mas salvamos o WarName separado
          nome: reg && reg.name ? reg.name.toUpperCase() : "ERRO: S/ NOME",
          warName: reg && reg.warName && reg.warName !== '?' ? reg.warName.toUpperCase() : "",
          mat: reg ? reg.matricula : '',
      };

      const userSched = studentSchedule[normalizedId] || studentSchedule[studentId] || {};
      for (let d = 1; d <= daysInMonth; d++) {
          row[`day_${d}`] = userSched[d] || '';
      }
      return row;
  };

  if (isGroupMode && manualGroups.length > 0) {
      manualGroups.forEach(group => {
          body.push({ 
              num: group.name.toUpperCase(), 
              gh: '', nome: '', mat: '', 
              isGroupHeader: true 
          });

          let memberIds = group.students.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
          memberIds.sort((a, b) => {
              const numA = parseInt(a, 10);
              const numB = parseInt(b, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return a.localeCompare(b);
          });

          memberIds.forEach(id => {
              body.push(createStudentRow(id));
          });
      });
  } else {
      const sortedRegistry = [...studentRegistry].sort((a, b) => parseInt(a.id) - parseInt(b.id));
      sortedRegistry.forEach(reg => {
          body.push(createStudentRow(reg.id));
      });
  }

  // --- 4. GERAÇÃO DA TABELA ---
  autoTable(doc, {
    startY: 38, 
    margin: { left: marginLeft },
    columns: columns,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 0.8,
      valign: 'middle',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.1,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 8, fontStyle: 'bold' }, 
      1: { cellWidth: 14 }, 
      // Aumentei a largura da coluna de nome para 50mm para caber o nome completo
      2: { cellWidth: 50, halign: 'left' }, 
      3: { cellWidth: 16 }, 
    },
    didParseCell: (data) => {
        const { row, column, cell } = data;

        if (row.raw && (row.raw as any).isGroupHeader) {
            if (column.dataKey === 'num') {
                cell.colSpan = columns.length;
                cell.styles.fillColor = [220, 220, 220];
                cell.styles.halign = 'left';
                cell.styles.fontStyle = 'bold';
            } else {
                cell.styles.display = 'none';
            }
        }

        if (column.dataKey.toString().startsWith('day_')) {
            const dayIndex = parseInt(column.dataKey.toString().replace('day_', ''), 10);
            const date = new Date(year, month, dayIndex);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            if (isWeekend) {
                const grayLevel = data.section === 'head' ? 200 : 230;
                cell.styles.fillColor = [grayLevel, grayLevel, grayLevel];
            }
        }
        
        // TRUQUE: Tornar o texto padrão da coluna 'nome' invisível para desenharmos manualmente depois
        if (data.section === 'body' && column.dataKey === 'nome' && !(row.raw as any).isGroupHeader) {
            cell.styles.textColor = [255, 255, 255];
        }
    },
    didDrawCell: (data) => {
        // Desenho manual da célula de NOME para suportar Negrito parcial
        if (data.section === 'body' && data.column.dataKey === 'nome' && !(data.row.raw as any).isGroupHeader) {
            const cell = data.cell;
            const warName = (data.row.raw as any).warName;
            const textLines = cell.text; // O AutoTable já quebrou o texto em linhas se necessário

            const fontSize = cell.styles.fontSize;
            doc.setFontSize(fontSize);
            
            // Cálculo aproximado para centralizar verticalmente bloco de texto
            const lineHeight = fontSize * 0.3527 * 1.15; // conversão pt->mm + entrelinha
            const totalTextHeight = textLines.length * lineHeight;
            let currentY = cell.y + (cell.height / 2) - (totalTextHeight / 2) + (lineHeight * 0.75);

            const cursorX = cell.x + cell.padding('left');

            textLines.forEach(line => {
                const cleanLine = String(line);
                
                if (warName && cleanLine.includes(warName)) {
                    // Divide a linha: [Antes] [Guerra] [Depois]
                    const parts = cleanLine.split(warName);
                    const pre = parts[0];
                    const post = parts.slice(1).join(warName); // Junta resto caso o nome apareça 2x (raro)

                    let tempX = cursorX;
                    
                    // Desenha parte ANTES (Normal)
                    if (pre) {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(0, 0, 0);
                        doc.text(pre, tempX, currentY);
                        tempX += doc.getTextWidth(pre);
                    }

                    // Desenha GUERRA (Negrito)
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(warName, tempX, currentY);
                    tempX += doc.getTextWidth(warName);

                    // Desenha parte DEPOIS (Normal)
                    if (post) {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(0, 0, 0);
                        doc.text(post, tempX, currentY);
                    }
                } else {
                    // Se o nome de guerra não estiver nessa linha (quebra de linha), desenha normal
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    doc.text(cleanLine, cursorX, currentY);
                }
                currentY += lineHeight;
            });
        }
    }
  });

  // --- 5. LEGENDA ---
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  let currentY = finalY + 5;

  if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("LEGENDA:", marginLeft, currentY); 
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  let legendX = marginLeft;
  const legendYStart = currentY;
  const maxLegendHeight = pageHeight - 40;

  // Lógica alterada: Iterar sobre as Linhas geradas (result.postRows)
  // Isso garante que "Serviço de Rancho 1", "Serviço de Rancho 2" apareçam separados
  result.postRows.forEach((rowName) => {
      const sigla = getLegend(rowName);
      
      if (currentY > maxLegendHeight) {
          currentY = legendYStart;
          legendX += 70; 
          // Se estourar a largura da página, cria nova
          if (legendX > pageWidth - 50) {
             doc.addPage();
             currentY = 20;
             legendX = marginLeft;
          }
      }

      doc.setFont('helvetica', 'bold');
      doc.text(sigla, legendX, currentY);
      
      doc.setFont('helvetica', 'normal');
      // Usando "=" conforme solicitado no exemplo: "PA1 = Plantão..."
      doc.text(`= ${rowName}`, legendX + 12, currentY);
      
      currentY += 3.5;
  });

  // --- 6. ASSINATURA (NOME COMPLETO COM GUERRA EM NEGRITO) ---
  let signY = Math.max(currentY + 15, pageHeight - 35);
  if (signY > pageHeight - 25) {
      doc.addPage();
      signY = pageHeight - 35;
  }

  doc.setLineWidth(0.2);
  doc.line(centerX - 50, signY, centerX + 50, signY);
  
  const fullRespName = responsible.replace(/\//g, '').toUpperCase(); 
  const respWarMatch = responsible.match(/\/(.*?)\//); 
  const warNameOnly = respWarMatch ? respWarMatch[1].toUpperCase().trim() : null;

  doc.setFontSize(10);
  const signTextY = signY + 5;

  if (warNameOnly && fullRespName.includes(warNameOnly)) {
      const parts = fullRespName.split(warNameOnly);
      const preText = parts[0] || "";
      const postText = parts.slice(1).join(warNameOnly) || ""; 

      doc.setFont('helvetica', 'normal');
      const preWidth = doc.getTextWidth(preText);
      const postWidth = doc.getTextWidth(postText);
      
      doc.setFont('helvetica', 'bold');
      const warWidth = doc.getTextWidth(warNameOnly);
      
      const totalWidth = preWidth + warWidth + postWidth;
      let cursorX = centerX - (totalWidth / 2);

      if (preText) {
        doc.setFont('helvetica', 'normal');
        doc.text(preText, cursorX, signTextY);
        cursorX += preWidth;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(warNameOnly, cursorX, signTextY);
      cursorX += warWidth;

      if (postText) {
        doc.setFont('helvetica', 'normal');
        doc.text(postText, cursorX, signTextY);
      }
  } else {
      doc.setFont('helvetica', 'bold');
      doc.text(fullRespName, centerX, signTextY, { align: 'center' });
  }
  
  doc.setFont('times', 'italic'); 
  doc.setFontSize(10);
  doc.text(responsiblePosition, centerX, signY + 10, { align: 'center' });

  const filename = `escala_oficial_${MONTH_NAMES[month].toLowerCase()}_${year}.pdf`;
  doc.save(filename);
}
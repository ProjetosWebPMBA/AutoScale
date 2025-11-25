import {
  type GenerationConfig,
  type GenerationResult,
  type AnalyticsResult,
  type StudentStats,
  type ScheduleDay,
  type ScheduleCell,
  type ManualGroup,
  MONTH_NAMES,
  DAY_INITIALS,
} from "@shared/schema";

type ExtendedConfig = GenerationConfig & {
  studentCount?: number;
  classCount?: number;
  femaleStudentsList?: string[]; 
  femaleRestrictedPostsList?: string[]; 
  manualGroups?: ManualGroup[];
  isGroupMode?: boolean;
};

// Função Wrapper que decide qual motor usar
export function generateSchedule(
  config: ExtendedConfig, 
  getStudentClass: (studentId: string) => string,
  initialStats: StudentStats[] | null 
): GenerationResult {
  
  if (config.isGroupMode && config.manualGroups && config.manualGroups.length > 0) {
    return generateGroupSchedule(config, getStudentClass, initialStats);
  } else {
    return generateStandardSchedule(config, getStudentClass, initialStats);
  }
}

/**
 * MOTOR NOVO (v4): Modo de Grupos Manuais com Balanceamento Interno Justo e Intercalação
 */
function generateGroupSchedule(
  config: ExtendedConfig, 
  getStudentClass: (studentId: string) => string,
  initialStats: StudentStats[] | null 
): GenerationResult {
  
  console.log("--- EXECUTANDO MOTOR (MODO GRUPOS v4 - BALANCEAMENTO JUSTO) ---");

  const { 
    servicePosts, slots, month, year, ignoredDays = [],
    isCycleEnabled, cyclePostToRemove,
    manualGroups = [],
    femaleStudentsList = [],
    femaleRestrictedPostsList = []
  } = config;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const ignoredDaysSet = new Set(ignoredDays);
  const warnings: string[] = [];
  const scheduleTitle = `${MONTH_NAMES[month].toUpperCase()} / ${year}`;

  // --- 1. PREPARAÇÃO DE DADOS ---
  
  const scheduleData: Record<string, Record<number, ScheduleCell>> = {};
  const postRows: string[] = [];
  
  // Estrutura para o "Map" de contagem de postos por aluno (Justiça)
  // studentId -> { "SENTINELA": 2, "RANCHO": 0 }
  const postCountMap = new Map<string, Record<string, number>>();
  
  // Inicializa contadores com dados históricos ou zero
  const allStudentsInGroups = new Set<string>();
  manualGroups.forEach(g => {
      g.students.split(/[\n;,]+/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed) allStudentsInGroups.add(trimmed);
      });
  });

  allStudentsInGroups.forEach(student => {
      const imported = initialStats?.find(s => s.student === student);
      const counts: Record<string, number> = {};
      servicePosts.forEach(p => {
          counts[p.toUpperCase()] = imported?.accumulatedPostCounts?.[p.toUpperCase()] || 0;
      });
      postCountMap.set(student, counts);
  });

  // --- 2. INTERCALAÇÃO DE POSTOS (MIXING) ---
  // Objetivo: Criar uma lista "F5, A1, F1, E1..." para distanciar funções iguais
  
  const cycleTargetBase = cyclePostToRemove?.toUpperCase().trim();
  let largestPostBase = "";
  let maxSlotsFound = -1;

  // Agrupamos as vagas por tipo de posto para poder intercalar
  const postsByType: Record<string, Array<{ rowName: string, baseName: string, isRestricted: boolean }>> = {};
  const basePostNamesOrder: string[] = []; // Para manter a ordem de prioridade de criação

  for (let i = 0; i < servicePosts.length; i++) {
    const postName = servicePosts[i].toUpperCase();
    const numSlots = slots[i];
    const isRestricted = femaleRestrictedPostsList.includes(postName);

    if (numSlots > maxSlotsFound) {
      maxSlotsFound = numSlots;
      largestPostBase = postName;
    }
    
    basePostNamesOrder.push(postName);
    postsByType[postName] = [];

    if (numSlots === 1) {
      postRows.push(postName);
      postsByType[postName].push({ rowName: postName, baseName: postName, isRestricted });
    } else {
      for (let j = 1; j <= numSlots; j++) {
        const rowName = `${postName} ${j}`;
        postRows.push(rowName);
        postsByType[postName].push({ rowName, baseName: postName, isRestricted });
      }
    }
    
    // Init matriz
    if(numSlots > 1) {
        for(let k=1; k<=numSlots; k++) scheduleData[`${postName} ${k}`] = {};
    } else {
        scheduleData[postName] = {};
    }
  }

  const cutTargetBase = (isCycleEnabled && cycleTargetBase) ? cycleTargetBase : largestPostBase;

  // Algoritmo de Intercalação (Round Robin)
  // Pega 1 vaga do Posto A, 1 do Posto B, 1 do C... depois 2ª do A, 2ª do B...
  const interleavedPosts: { rowName: string, baseName: string, isRestricted: boolean }[] = [];
  let hasMore = true;
  let round = 0;
  
  while (hasMore) {
      hasMore = false;
      for (const baseName of basePostNamesOrder) {
          const slotsOfThisPost = postsByType[baseName];
          if (round < slotsOfThisPost.length) {
              interleavedPosts.push(slotsOfThisPost[round]);
              hasMore = true;
          }
      }
      round++;
  }

  // --- 3. ORDENAÇÃO CONDICIONAL (FINAL) ---
  // O Intercalado é bom, mas a regra do "Corte" e "Restrição" tem precedência.
  // Então reordenamos o 'interleavedPosts' apenas para garantir segurança.
  
  // Função helper para reordenar dinamicamente a cada dia
  const getDailyFillOrder = (hasEnoughPeople: boolean) => {
      // Copia a lista intercalada para preservar a mistura natural
      const list = [...interleavedPosts];
      
      return list.sort((a, b) => {
          if (hasEnoughPeople) {
             // Prioridade: Restritos no TOPO (para garantir homens)
             // O resto mantém a ordem intercalada (estável)
             if (a.isRestricted && !b.isRestricted) return -1;
             if (!a.isRestricted && b.isRestricted) return 1;
             return 0; 
          } else {
             // Falta gente: Alvo de Corte no FUNDO
             const aIsCutTarget = a.baseName === cutTargetBase;
             const bIsCutTarget = b.baseName === cutTargetBase;
             if (aIsCutTarget && !bIsCutTarget) return 1; 
             if (!aIsCutTarget && bIsCutTarget) return -1;
             
             // Restritos no TOPO (do que sobrou)
             if (a.isRestricted && !b.isRestricted) return -1;
             if (!a.isRestricted && b.isRestricted) return 1;
             return 0;
          }
      });
  };

  // --- 4. LOOP DOS DIAS ---
  const allDays: ScheduleDay[] = [];
  const studentLastPost: Map<string, string> = new Map(); 
  let groupIndex = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    allDays.push({ day, dayOfWeek: date.getDay(), dayOfWeekInitial: DAY_INITIALS[date.getDay()], assignments: {} });

    if (ignoredDaysSet.has(day)) {
      postRows.forEach(row => scheduleData[row][day] = { student: null, isWeekend, isIgnoredDay: true });
      continue;
    }

    const currentGroup = manualGroups[groupIndex % manualGroups.length];
    groupIndex++;

    // Lista de alunos do dia (sem duplicatas)
    const rawMembers = currentGroup.students.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
    const studentsInGroup = Array.from(new Set(rawMembers));

    if (studentsInGroup.length === 0) {
      warnings.push(`Dia ${day}: ${currentGroup.name} está vazio.`);
    }

    // --- PREPARAÇÃO DA LISTA DE CANDIDATOS (Com "Shuffle" suave inicial) ---
    // Não usamos shuffle puro mais. A ordem será decidida vaga a vaga baseada no histórico.
    const availableStudents = [...studentsInGroup];
    
    // Verificação de quantidade
    const totalSlotsNeeded = interleavedPosts.length;
    const hasEnoughPeople = studentsInGroup.length >= totalSlotsNeeded;

    if (!hasEnoughPeople) {
      const msg = `Dia ${day}: ${currentGroup.name} (${studentsInGroup.length}) < Vagas. Corte em: ${cutTargetBase}.`;
      if (!warnings.includes(msg)) warnings.push(msg);
    }

    const fillOrder = getDailyFillOrder(hasEnoughPeople);

    // --- PREENCHIMENTO VAGA A VAGA ---
    for (const postSlot of fillOrder) {
      const { rowName, baseName, isRestricted } = postSlot;

      if (availableStudents.length === 0) {
        scheduleData[rowName][day] = { student: null, isWeekend, isIgnoredDay: false };
        continue;
      }

      // 1. Filtra elegíveis (gênero)
      let candidates = availableStudents;
      if (isRestricted) {
         candidates = availableStudents.filter(s => !femaleStudentsList.some(f => s.includes(f)));
      }

      if (candidates.length === 0) {
         scheduleData[rowName][day] = { student: null, isWeekend, isIgnoredDay: false };
         continue;
      }

      // 2. ORDENAÇÃO POR JUSTIÇA (Quem tirou menos esse posto?)
      // Critérios:
      // A. Menor contagem acumulada deste posto específico.
      // B. Não ter tirado esse posto ontem (evita dobra de função).
      // C. Aleatório (para desempatar quem tem contagem igual).
      candidates.sort((a, b) => {
          // A
          const countA = postCountMap.get(a)?.[baseName] || 0;
          const countB = postCountMap.get(b)?.[baseName] || 0;
          if (countA !== countB) return countA - countB;

          // B
          const lastA = studentLastPost.get(a) === baseName ? 1 : 0;
          const lastB = studentLastPost.get(b) === baseName ? 1 : 0;
          if (lastA !== lastB) return lastA - lastB; // Quem não tirou vem primeiro (0 < 1)

          // C
          return 0.5 - Math.random();
      });

      // O vencedor é o primeiro da lista
      const selectedStudent = candidates[0];

      // Atualiza contadores e histórico
      const currentCounts = postCountMap.get(selectedStudent) || {};
      currentCounts[baseName] = (currentCounts[baseName] || 0) + 1;
      postCountMap.set(selectedStudent, currentCounts);
      
      studentLastPost.set(selectedStudent, baseName);

      // Remove da lista de disponíveis do dia
      const indexInAvailable = availableStudents.indexOf(selectedStudent);
      if (indexInAvailable > -1) {
        availableStudents.splice(indexInAvailable, 1);
      }

      // Grava na escala
      scheduleData[rowName][day] = { student: selectedStudent, isWeekend, isIgnoredDay: false };
    }
  }

  return {
    scheduleData,
    scheduleTitle,
    daysInMonth,
    allDays,
    postRows,
    ignoredDays: ignoredDaysSet,
    studentQueues: { A:[], B:[], C:[] }, 
    queueIndices: { A:0, B:0, C:0 }, 
    warnings
  };
}

/**
 * MOTOR PADRÃO (Variância Zero)
 */
function generateStandardSchedule(
  config: ExtendedConfig, 
  getStudentClass: (studentId: string) => string,
  initialStats: StudentStats[] | null 
): GenerationResult {
  
  console.log("--- EXECUTANDO MOTOR v45 (Variância Zero + Anti-Dobra + Degradação Suave) ---");
  
  const { 
    students, servicePosts, slots, month, year, ignoredDays = [],
    isCycleEnabled, cyclePostToRemove,
    classCount = 3,
    femaleStudentsList = [], 
    femaleRestrictedPostsList = [] 
  } = config;

  validateConfig(config, getStudentClass);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const ignoredDaysSet = new Set(ignoredDays);
  const workingDaysCount = daysInMonth - ignoredDaysSet.size;
  
  const postRows: string[] = [];
  const postRowsMap: Array<{ rowName: string; baseName: string; slots: number }> = [];
  const basePostNames = servicePosts.map(p => p.toUpperCase());

  for (let i = 0; i < servicePosts.length; i++) {
    const postName = servicePosts[i].toUpperCase();
    const numSlots = slots[i];
    if (numSlots === 1) {
      postRows.push(postName);
      postRowsMap.push({ rowName: postName, baseName: postName, slots: numSlots });
    } else {
      for (let j = 1; j <= numSlots; j++) {
        const rowName = `${postName} ${j}`;
        postRows.push(rowName);
        postRowsMap.push({ rowName: rowName, baseName: postName, slots: numSlots });
      }
    }
  }

  let totalSlotsInMonth = 0;
  let tempCycleCounter = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (ignoredDaysSet.has(day)) continue;
    tempCycleCounter++;
    let isReducedDay = false;
    if (isCycleEnabled) {
      const cycleDay = tempCycleCounter % 5;
      isReducedDay = (cycleDay === 3 || cycleDay === 4);
    }
    for (const post of postRowsMap) {
      const basePostoName = post.baseName;
      if (isCycleEnabled && isReducedDay && basePostoName === cyclePostToRemove?.toUpperCase()) {
        continue;
      }
      totalSlotsInMonth++;
    }
  }

  const averageShifts = students.length > 0 ? totalSlotsInMonth / students.length : 0;
  const TARGET_MAX_SHIFTS = Math.ceil(averageShifts);
  const STRICT_TARGET = Math.floor(averageShifts);
  const ABSOLUTE_MAX_SHIFTS = Math.max(31, TARGET_MAX_SHIFTS + 2); 

  let MIN_DAYS_OFF_BASE = 4; 
  if (totalSlotsInMonth > 0 && students.length > 0) {
    const dailySlotsAvg = totalSlotsInMonth / Math.max(1, workingDaysCount);
    const rawRatio = students.length / Math.max(1, dailySlotsAvg);
    MIN_DAYS_OFF_BASE = Math.floor(rawRatio); 
    MIN_DAYS_OFF_BASE = Math.max(3, MIN_DAYS_OFF_BASE); 
  }
  
  const totalPfemShiftsNeeded = femaleStudentsList.length * averageShifts;
  const dailyPfemTarget = Math.ceil(totalPfemShiftsNeeded / Math.max(1, workingDaysCount));
  const MAX_PFEMS_PER_DAY = dailyPfemTarget + 1; 

  // Inicialização
  const queues: Record<string, string[]> = {};
  const classNames: string[] = [];
  const totalShiftCountMap = new Map<string, number>();
  const postCountMap = new Map<string, Record<string, number>>();
  const currentMonthTotalShiftsMap = new Map<string, number>(); 
  const lastPostMap = new Map<string, string | null>(); 
  const consecutiveDaysOffMap = new Map<string, number>(); 
  const restBalanceMap = new Map<string, number>(); 

  for (let i = 0; i < classCount; i++) {
    const className = String.fromCharCode(65 + i);
    classNames.push(className);
    queues[className] = [];
  }

  for (const student of students) {
    const className = getStudentClass(student);
    if (queues[className]) {
      queues[className].push(student);
    }
    
    const importedStats = initialStats?.find(s => s.student === student);
    const initialTotalServices = importedStats?.accumulatedServices || 0;
    
    totalShiftCountMap.set(student, initialTotalServices); 
    currentMonthTotalShiftsMap.set(student, 0); 
    
    const studentPostRecord: Record<string, number> = {};
    for (const postName of basePostNames) {
      const initialPostCount = (importedStats?.accumulatedPostCounts?.[postName] || 0);
      studentPostRecord[postName] = initialPostCount;
    }
    postCountMap.set(student, studentPostRecord);
    consecutiveDaysOffMap.set(student, MIN_DAYS_OFF_BASE + 5); 
    lastPostMap.set(student, null);
    restBalanceMap.set(student, 0);
  }

  const scheduleData: Record<string, Record<number, ScheduleCell>> = {};
  postRows.forEach(rowName => {
    scheduleData[rowName] = {};
  });

  const allDays: ScheduleDay[] = [];
  let classStartIndex = 0; 
  let dayCycleCounter = 0;
  const scheduleTitle = `${MONTH_NAMES[month].toUpperCase()} / ${year}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    allDays.push({ day, dayOfWeek: date.getDay(), dayOfWeekInitial: DAY_INITIALS[date.getDay()], assignments: {} });
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isIgnoredDay = ignoredDaysSet.has(day);
    const date = new Date(year, month, day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const assignedToday = new Set<string>();
    const classCountsToday = new Map<string, number>(); 
    classNames.forEach(c => classCountsToday.set(c, 0));

    let pfemsAssignedToday = 0;
    const classOrder = getRotatedClassOrder(classStartIndex, classNames);
    const isFinalDays = daysInMonth - day < 5; 
    const minDaysOffRef = MIN_DAYS_OFF_BASE; 
    const progressRatio = day / daysInMonth;
    const expectedShiftsByNow = progressRatio * averageShifts;

    let isReducedDay = false; 
    if (isIgnoredDay) {
      postRows.forEach(rowName => scheduleData[rowName][day] = { student: null, isWeekend, isIgnoredDay: true });
      continue; 
    }
    dayCycleCounter++;
    if (isCycleEnabled) {
        const cycleDay = dayCycleCounter % 5;
        isReducedDay = (cycleDay === 3 || cycleDay === 4);
    }

    const activePostRows: typeof postRowsMap = [];
    for(const post of postRowsMap) {
        if (isCycleEnabled && isReducedDay && post.baseName === cyclePostToRemove?.toUpperCase()) {
             scheduleData[post.rowName][day] = { student: null, isWeekend, isIgnoredDay: false };
        } else {
            activePostRows.push(post);
        }
    }

    const pfemEligibleRows = activePostRows.filter(p => !femaleRestrictedPostsList.includes(p.baseName.toUpperCase()));
    shuffleArray(pfemEligibleRows);

    for (const post of pfemEligibleRows) {
        const isPfemLimitReached = (pfemsAssignedToday >= MAX_PFEMS_PER_DAY && !isFinalDays);

        const pfemCandidate = tryFindStudentForPost(
            classOrder, queues, assignedToday, totalShiftCountMap, postCountMap,
            post.baseName, consecutiveDaysOffMap, minDaysOffRef, lastPostMap,
            post.slots >= 3, TARGET_MAX_SHIFTS, STRICT_TARGET, ABSOLUTE_MAX_SHIFTS,
            isFinalDays, isWeekend, currentMonthTotalShiftsMap,
            femaleStudentsList, femaleRestrictedPostsList, 'FEMALE', true,
            restBalanceMap, classCountsToday, getStudentClass,
            isPfemLimitReached, expectedShiftsByNow
        );

        if (pfemCandidate) {
            registerAssignment(
                pfemCandidate, post.rowName, post.baseName, day, isWeekend, post.slots >= 3,
                assignedToday, scheduleData, lastPostMap, currentMonthTotalShiftsMap,
                totalShiftCountMap, postCountMap, consecutiveDaysOffMap, 
                restBalanceMap, minDaysOffRef, classCountsToday, pfemsAssignedToday, getStudentClass
            );
            pfemsAssignedToday++;
        }
    }
    
    const remainingRows = activePostRows.filter(p => !scheduleData[p.rowName][day] || !scheduleData[p.rowName][day].student);
    shuffleArray(remainingRows);

    for (const post of remainingRows) {
        const generalCandidate = tryFindStudentForPost(
            classOrder, queues, assignedToday, totalShiftCountMap, postCountMap,
            post.baseName, consecutiveDaysOffMap, minDaysOffRef, lastPostMap,
            post.slots >= 3, TARGET_MAX_SHIFTS, STRICT_TARGET, ABSOLUTE_MAX_SHIFTS,
            isFinalDays, isWeekend, currentMonthTotalShiftsMap,
            femaleStudentsList, femaleRestrictedPostsList, 'MALE', false,
            restBalanceMap, classCountsToday, getStudentClass,
            false, 0
        );

        if (generalCandidate) {
            registerAssignment(
                generalCandidate, post.rowName, post.baseName, day, isWeekend, post.slots >= 3,
                assignedToday, scheduleData, lastPostMap, currentMonthTotalShiftsMap,
                totalShiftCountMap, postCountMap, consecutiveDaysOffMap, 
                restBalanceMap, minDaysOffRef, classCountsToday, pfemsAssignedToday, getStudentClass
            );
            if (femaleStudentsList.includes(generalCandidate)) pfemsAssignedToday++;
        } else {
            if (!scheduleData[post.rowName][day]) {
                scheduleData[post.rowName][day] = { student: null, isWeekend, isIgnoredDay: false };
            }
        }
    }

    if (classNames.length > 0) {
      for (const student of students) {
        if (assignedToday.has(student)) {
          consecutiveDaysOffMap.set(student, 0); 
        } else {
          const currentOff = consecutiveDaysOffMap.get(student) || 0;
          consecutiveDaysOffMap.set(student, currentOff + 1); 
        }
      }
      classStartIndex = (classStartIndex + 1) % classNames.length;
    }
  } 
  
  const finalScheduleData: Record<string, Record<number, ScheduleCell>> = {};
  for(const rowName of postRows) {
      finalScheduleData[rowName] = scheduleData[rowName];
  }

  return {
    scheduleData: finalScheduleData,
    scheduleTitle,
    daysInMonth,
    allDays,
    postRows,
    ignoredDays: ignoredDaysSet,
    studentQueues: queues,
    queueIndices: {}, 
    warnings: []
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES (Mantidas)
// ============================================================================

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function tryFindStudentForPost(
    classOrder: string[],
    queues: Record<string, string[]>,
    assignedToday: Set<string>,
    totalShiftCountMap: Map<string, number>,
    postCountMap: Map<string, Record<string, number>>,
    basePostoName: string,
    consecutiveDaysOffMap: Map<string, number>,
    minDaysOffBase: number,
    lastPostMap: Map<string, string | null>,
    isPostFlexible: boolean,
    TARGET_MAX_SHIFTS: number,
    STRICT_TARGET: number,
    ABSOLUTE_MAX_SHIFTS: number,
    isFinalDays: boolean,
    isWeekend: boolean,
    currentMonthTotalShiftsMap: Map<string, number>,
    femaleStudentsList: string[],
    femaleRestrictedPostsList: string[],
    genderMode: 'FEMALE' | 'MALE',
    strictSearch: boolean,
    restBalanceMap: Map<string, number>,
    classCountsToday: Map<string, number>,
    getStudentClass: (id: string) => string,
    isPfemLimitReached: boolean,
    expectedShiftsByNow: number
): string | null {

    const searchLevels = [
        { reduceRestBy: 0, maxShifts: STRICT_TARGET, useCompensation: true },
        { reduceRestBy: 0, maxShifts: TARGET_MAX_SHIFTS, useCompensation: true },
        { reduceRestBy: 1, maxShifts: STRICT_TARGET, useCompensation: false },
        { reduceRestBy: 1, maxShifts: TARGET_MAX_SHIFTS, useCompensation: false },
        { reduceRestBy: 99, maxShifts: STRICT_TARGET, useCompensation: false },
        { reduceRestBy: 99, maxShifts: TARGET_MAX_SHIFTS, useCompensation: false },
        { reduceRestBy: 99, maxShifts: ABSOLUTE_MAX_SHIFTS, useCompensation: false }
    ];

    const limit = strictSearch ? 4 : searchLevels.length; 

    for (let i = 0; i < limit; i++) {
        const level = searchLevels[i];
        let candidate: string | null = null;
        let classPointer = 0;
        let attempts = 0;

        while (candidate === null && attempts < classOrder.length) {
            const currentClass = classOrder[classPointer % classOrder.length];
            const studentsInClass = queues[currentClass] || [];

            candidate = findBestStudent(
                studentsInClass, assignedToday, totalShiftCountMap, postCountMap, basePostoName,
                consecutiveDaysOffMap, minDaysOffBase, lastPostMap, isPostFlexible, 
                level.maxShifts, 
                isFinalDays, isWeekend, currentMonthTotalShiftsMap, 
                level.reduceRestBy, 
                femaleStudentsList, femaleRestrictedPostsList, genderMode,
                restBalanceMap, level.useCompensation, classCountsToday, getStudentClass,
                isPfemLimitReached, expectedShiftsByNow
            );

            if (candidate) return candidate;
            classPointer++;
            attempts++;
        }
    }
    return null;
}

function registerAssignment(
    student: string,
    rowName: string,
    basePostName: string,
    day: number,
    isWeekend: boolean,
    isPostFlexible: boolean,
    assignedToday: Set<string>,
    scheduleData: Record<string, Record<number, ScheduleCell>>,
    lastPostMap: Map<string, string | null>,
    currentMonthTotalShiftsMap: Map<string, number>,
    totalShiftCountMap: Map<string, number>,
    postCountMap: Map<string, Record<string, number>>,
    consecutiveDaysOffMap: Map<string, number>,
    restBalanceMap: Map<string, number>,
    minDaysOffBase: number,
    classCountsToday: Map<string, number>,
    pfemsAssignedToday: number, 
    getStudentClass: (id: string) => string
) {
    assignedToday.add(student);
    
    if (!isPostFlexible) lastPostMap.set(student, basePostName);
    currentMonthTotalShiftsMap.set(student, (currentMonthTotalShiftsMap.get(student) || 0) + 1);
    totalShiftCountMap.set(student, (totalShiftCountMap.get(student) || 0) + 1);
    
    const studentPostRecord = postCountMap.get(student)!;
    studentPostRecord[basePostName] = (studentPostRecord[basePostName] || 0) + 1;

    const daysOff = consecutiveDaysOffMap.get(student) || 0;
    const deviation = daysOff - minDaysOffBase;
    const clampedDeviation = Math.max(-3, Math.min(3, deviation)); 
    const currentBalance = restBalanceMap.get(student) || 0;
    restBalanceMap.set(student, currentBalance + clampedDeviation);

    const sClass = getStudentClass(student);
    classCountsToday.set(sClass, (classCountsToday.get(sClass) || 0) + 1);

    scheduleData[rowName][day] = { student: student, isWeekend, isIgnoredDay: false };
}

function findBestStudent(
  studentList: string[],
  assignedToday: Set<string>,
  totalShiftCountMap: Map<string, number>,
  postCountMap: Map<string, Record<string, number>>,
  basePostName: string,
  consecutiveDaysOffMap: Map<string, number>, 
  minDaysOffBase: number,
  lastPostMap: Map<string, string | null>,
  isPostFlexible: boolean,
  maxShiftsCap: number, 
  isFinalDays: boolean,
  isWeekend: boolean,
  currentMonthTotalShiftsMap: Map<string, number>, 
  reduceRestBy: number, 
  femaleStudentsList: string[] = [],
  femaleRestrictedPostsList: string[] = [],
  genderMode: 'FEMALE' | 'MALE',
  restBalanceMap: Map<string, number>,
  useCompensation: boolean,
  classCountsToday: Map<string, number>,
  getStudentClass: (id: string) => string,
  isPfemLimitReached: boolean,
  expectedShiftsByNow: number
): string | null {
  
  const isPostRestrictedForFemales = femaleRestrictedPostsList.includes(basePostName.toUpperCase());
  if (genderMode === 'FEMALE' && isPostRestrictedForFemales) return null; 

  const availableStudents = studentList
    .filter(s => {
        const isFemale = femaleStudentsList.some(f => s.includes(f));
        if (genderMode === 'FEMALE' && !isFemale) return false;
        if (genderMode === 'MALE' && isFemale) return false;
        return true;
    })
    .filter(s => !assignedToday.has(s)) 
    .filter(s => {
        const shifts = currentMonthTotalShiftsMap.get(s) || 0;
        return shifts < maxShiftsCap; 
    })
    .filter(s => {
      if (genderMode === 'FEMALE' && isPfemLimitReached) {
          const shifts = currentMonthTotalShiftsMap.get(s) || 0;
          if (shifts >= expectedShiftsByNow) {
              return false; 
          }
      }
      return true;
    })
    .filter(s => {
      const daysOff = consecutiveDaysOffMap.get(s) || 0;
      if (daysOff < 1) return false;
      if (reduceRestBy >= 99) return true;

      let requiredDaysOff = Math.max(1, minDaysOffBase - reduceRestBy);
      if (useCompensation) {
          const balance = restBalanceMap.get(s) || 0;
          if (balance < -1) {
              requiredDaysOff = requiredDaysOff + 1;
          } else if (balance > 2) {
              requiredDaysOff = Math.max(1, requiredDaysOff - 1);
          }
      }
      return daysOff >= requiredDaysOff;
    })
    .filter(s => {
      const lastPost = lastPostMap.get(s);
      const isEmergency = reduceRestBy > 0 || isFinalDays || isWeekend;
      
      if (!isPostFlexible && lastPost !== null && lastPost === basePostName) {
        if (isEmergency) return true;
        return false;
      }
      if (isPostRestrictedForFemales) {
        const isFemale = femaleStudentsList.some(f => s.includes(f));
        if (isFemale) return false;
      }
      return true;
    });

  if (availableStudents.length === 0) return null; 

  availableStudents.sort((a, b) => {
    const lastA = lastPostMap.get(a);
    const lastB = lastPostMap.get(b);
    const isRepeatA = (lastA === basePostName);
    const isRepeatB = (lastB === basePostName);
    if (isRepeatA && !isRepeatB) return 1; 
    if (!isRepeatA && isRepeatB) return -1;

    const postCountA = postCountMap.get(a)?.[basePostName] || 0;
    const postCountB = postCountMap.get(b)?.[basePostName] || 0;
    if (postCountA !== postCountB) return postCountA - postCountB; 

    const shiftsA = currentMonthTotalShiftsMap.get(a) || 0;
    const shiftsB = currentMonthTotalShiftsMap.get(b) || 0;
    if (shiftsA !== shiftsB) return shiftsA - shiftsB;

    const countA = classCountsToday.get(getStudentClass(a)) || 0;
    const countB = classCountsToday.get(getStudentClass(b)) || 0;
    if (countA !== countB) return countA - countB; 

    const totalA = totalShiftCountMap.get(a) || 0; 
    const totalB = totalShiftCountMap.get(b) || 0;
    const totalDiffAcumulado = totalA - totalB;
    if (totalDiffAcumulado !== 0) return totalDiffAcumulado; 
    
    return a.localeCompare(b);
  });

  return availableStudents[0];
}

// Helpers
export function computeAnalytics(result: GenerationResult, config: ExtendedConfig, getStudentClass: any, initialStats: any): AnalyticsResult {
    const { students, servicePosts, manualGroups, isGroupMode } = config;
    const { scheduleData, postRows, ignoredDays, allDays } = result;
  
    const statsMap = new Map<string, StudentStats>();
    
    // Popula statsMap: Se modo grupo, extrai de manualGroups. Se não, de students string.
    let allStudentsList: string[] = [];
    if (isGroupMode && manualGroups) {
       manualGroups.forEach(g => {
           const members = g.students.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
           allStudentsList.push(...members);
       });
       // Remove duplicados
       allStudentsList = Array.from(new Set(allStudentsList));
    } else {
       const rawStudents = config.students;
       if (Array.isArray(rawStudents)) {
          allStudentsList = rawStudents;
       } else if (typeof rawStudents === 'string') {
          allStudentsList = rawStudents.split('\n').filter(Boolean).map(s => s.trim());
       }
    }

    allStudentsList.forEach(student => {
      const importedStats = initialStats?.find((s:any) => s.student === student);
      const initialTotalServices = importedStats?.accumulatedServices || 0;
      const initialPostCounts: Record<string, number> = {};
      servicePosts.forEach(post => {
        initialPostCounts[post.toUpperCase()] = importedStats?.accumulatedPostCounts?.[post.toUpperCase()] || 0;
      });
  
      statsMap.set(student, {
        student,
        class: getStudentClass(student),
        totalShifts: initialTotalServices,
        totalDaysOff: 0, 
        postBreakdown: initialPostCounts,
        accumulatedServices: initialTotalServices,
        accumulatedPostCounts: { ...initialPostCounts }, 
      });
    });
  
    let shiftsThisMonthAssigned = 0; 
    const postDistribution: Record<string, number> = {};
    servicePosts.forEach(post => {
      postDistribution[post.toUpperCase()] = 0;
    });
  
    const dailyClassDistribution: Record<string, Record<string, number>> = {};
    
    for (const dayInfo of allDays) {
      const day = dayInfo.day;
      const dayStr = String(day).padStart(2, '0');
      dailyClassDistribution[dayStr] = {};
      
      const isIgnoredDay = ignoredDays.has(day);
      if (isIgnoredDay) continue;
  
      for (const rowName of postRows) {
        const cell = scheduleData[rowName]?.[day];
        if (cell && cell.student) {
          const stats = statsMap.get(cell.student);
          if (stats) {
            stats.totalShifts++; 
            shiftsThisMonthAssigned++; 
            const basePost = findBasePostName(rowName, servicePosts);
            if (basePost && stats.postBreakdown[basePost] !== undefined) {
              stats.postBreakdown[basePost]++;
              const basePostUpper = basePost.toUpperCase();
              postDistribution[basePostUpper] = (postDistribution[basePostUpper] || 0) + 1;
            }
          }
          const studentClass = getStudentClass(cell.student);
          if (studentClass && studentClass !== '?') {
            if (!dailyClassDistribution[dayStr][studentClass]) dailyClassDistribution[dayStr][studentClass] = 0;
            dailyClassDistribution[dayStr][studentClass]++;
          }
        }
      }
    }
  
    const workingDays = result.daysInMonth - ignoredDays.size;
    statsMap.forEach(stats => {
      const shiftsThisMonth = stats.totalShifts - stats.accumulatedServices;
      stats.totalDaysOff = workingDays - shiftsThisMonth;
    });
  
    const studentStats = Array.from(statsMap.values());
    const shiftsThisMonth = studentStats.reduce((sum, stats) => sum + (stats.totalShifts - stats.accumulatedServices), 0);
    const averageShifts = allStudentsList.length > 0 ? shiftsThisMonth / allStudentsList.length : 0;
  
    return {
      studentStats, 
      dailyClassDistribution, 
      totalStudents: allStudentsList.length,
      totalShiftsAssigned: shiftsThisMonthAssigned,
      averageShiftsPerStudent: Math.round(averageShifts * 10) / 10,
      postDistribution,
    };
}

function validateConfig(config: ExtendedConfig, getStudentClass: (studentId: string) => string): void {
  // Validação apenas para modo automático
  if (config.isGroupMode) return;

  const { students, servicePosts, slots, isCycleEnabled, cyclePostToRemove } = config;
  if (students.length === 0) throw new Error('A lista de alunos não pode estar vazia');
  const totalSlots = slots.reduce((sum, current) => sum + current, 0);
  if (totalSlots > students.length) throw new Error(`Vagas (${totalSlots}) > Alunos (${students.length}).`);
  if (servicePosts.length === 0) throw new Error('Lista de postos vazia');
  if (servicePosts.length !== slots.length) throw new Error('Postos != Vagas');
  if (isCycleEnabled) {
    if (!cyclePostToRemove || cyclePostToRemove.trim() === '') throw new Error('Ciclo ativo sem posto definido.');
    if (!servicePosts.some(p => p.toUpperCase() === cyclePostToRemove.toUpperCase())) throw new Error('Posto ciclo não existe.');
  }
}

function getRotatedClassOrder(startIndex: number, classNames: string[]): string[] {
  const baseOrder = [...classNames];
  const len = baseOrder.length;
  if (len === 0) return [];
  const result: string[] = [];
  for (let i = 0; i < len; i++) result.push(baseOrder[(startIndex + i) % len]);
  return result;
}

function findBasePostName(rowName: string, servicePosts: string[]): string | null {
  const servicePostsSet = new Set(servicePosts.map(p => p.toUpperCase()));
  if (servicePostsSet.has(rowName.toUpperCase())) return rowName.toUpperCase();
  const match = rowName.match(/^(.*) \d+$/);
  if (match) {
    const baseName = match[1].trim().toUpperCase();
    if (servicePostsSet.has(baseName)) return baseName;
  }
  const parenthesisMatch = rowName.match(/^(.+?)\s*\(/);
  if (parenthesisMatch) {
    const baseName = parenthesisMatch[1].trim().toUpperCase();
     if (servicePostsSet.has(baseName)) return baseName;
  }
  return rowName.toUpperCase();
}
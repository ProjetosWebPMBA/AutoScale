import {
  type GenerationConfig,
  type GenerationResult,
  type AnalyticsResult,
  type StudentStats,
  type ScheduleDay,
  type ScheduleCell,
  getStudentClass,
  MONTH_NAMES,
  DAY_INITIALS,
} from "@shared/schema";

/**
 * Main schedule generation engine
 * Distributes students across service posts for the entire month
 * with fair rotation among classes A, B, C
 */
export function generateSchedule(config: GenerationConfig): GenerationResult {
  const { students, servicePosts, slots, month, year, ignoredDays = [] } = config;

  // Validate configuration
  validateConfig(config);

  // Create expanded post rows (e.g., "sentinelas (1/3)", "sentinelas (2/3)")
  const postRows: string[] = [];
  const postRowsMap: Array<{ rowName: string; baseName: string }> = [];

  for (let i = 0; i < servicePosts.length; i++) {
    const postName = servicePosts[i].toUpperCase();
    const numSlots = slots[i];

    if (numSlots === 1) {
      postRows.push(postName);
      postRowsMap.push({ rowName: postName, baseName: postName });
    } else {
      for (let j = 1; j <= numSlots; j++) {
        const rowName = `${postName} (${j}/${numSlots})`;
        postRows.push(rowName);
        postRowsMap.push({ rowName, baseName: postName });
      }
    }
  }

  // Separate students by class
  const queueA = students.filter(s => getStudentClass(s) === 'A');
  const queueB = students.filter(s => getStudentClass(s) === 'B');
  const queueC = students.filter(s => getStudentClass(s) === 'C');

  if (queueA.length === 0 || queueB.length === 0 || queueC.length === 0) {
    throw new Error('A lista de alunos deve conter membros de todas as 3 salas (A, B, C)');
  }

  // Initialize indices for each queue
  let indexA = 0;
  let indexB = 0;
  let indexC = 0;
  let classStartIndex = 0; // For rotating which class starts each day

  // Calculate days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const scheduleTitle = `${MONTH_NAMES[month].toUpperCase()} / ${year}`;

  // Initialize schedule data structure
  const scheduleData: Record<string, Record<number, ScheduleCell>> = {};
  postRows.forEach(rowName => {
    scheduleData[rowName] = {};
  });

  // Generate all days metadata
  const allDays: ScheduleDay[] = [];
  const ignoredDaysSet = new Set(ignoredDays);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    
    allDays.push({
      day,
      dayOfWeek,
      dayOfWeekInitial: DAY_INITIALS[dayOfWeek],
      assignments: {},
    });
  }

  // Main generation loop
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isIgnoredDay = ignoredDaysSet.has(day);

    // Skip ignored days
    if (isIgnoredDay) {
      postRows.forEach(rowName => {
        scheduleData[rowName][day] = {
          student: null,
          isWeekend,
          isIgnoredDay: true,
        };
      });
      continue;
    }

    const assignedToday = new Set<string>();
    const classOrder = getRotatedClassOrder(classStartIndex);

    // Assign students to all posts for this day
    for (const rowName of postRows) {
      let assignedStudent: string | null = null;

      // Try to assign from each class in order
      for (const className of classOrder) {
        const { queue, index } = getQueueAndIndex(className, { queueA, queueB, queueC, indexA, indexB, indexC });
        
        if (queue.length === 0) continue;

        // Find next available student from this class
        for (let attempts = 0; attempts < queue.length; attempts++) {
          const currentIndex = (index + attempts) % queue.length;
          const candidate = queue[currentIndex];

          if (!assignedToday.has(candidate)) {
            assignedStudent = candidate;
            assignedToday.add(candidate);

            // Update the class index
            if (className === 'A') indexA = (currentIndex + 1) % queueA.length;
            else if (className === 'B') indexB = (currentIndex + 1) % queueB.length;
            else if (className === 'C') indexC = (currentIndex + 1) % queueC.length;

            break;
          }
        }

        if (assignedStudent) break;
      }

      scheduleData[rowName][day] = {
        student: assignedStudent,
        isWeekend,
        isIgnoredDay: false,
      };
    }

    // Rotate the starting class for the next day
    classStartIndex = (classStartIndex + 1) % 3;
  }

  return {
    scheduleData,
    scheduleTitle,
    daysInMonth,
    allDays,
    postRows,
    ignoredDays: ignoredDaysSet,
    studentQueues: {
      A: queueA,
      B: queueB,
      C: queueC,
    },
    queueIndices: {
      A: indexA,
      B: indexB,
      C: indexC,
    },
  };
}

/**
 * Compute analytics from a generated schedule
 */
export function computeAnalytics(
  result: GenerationResult,
  config: GenerationConfig
): AnalyticsResult {
  const { students, servicePosts } = config;
  const { scheduleData, postRows, ignoredDays } = result;

  // Initialize stats for each student
  const statsMap = new Map<string, StudentStats>();
  students.forEach(student => {
    const postBreakdown: Record<string, number> = {};
    servicePosts.forEach(post => {
      postBreakdown[post.toUpperCase()] = 0;
    });

    statsMap.set(student, {
      student,
      class: getStudentClass(student),
      totalShifts: 0,
      totalDaysOff: 0,
      postBreakdown,
    });
  });

  // Count shifts and days off
  let totalShiftsAssigned = 0;
  const postDistribution: Record<string, number> = {};

  servicePosts.forEach(post => {
    postDistribution[post.toUpperCase()] = 0;
  });

  // Iterate through schedule
  for (const rowName of postRows) {
    const rowData = scheduleData[rowName];

    for (let day = 1; day <= result.daysInMonth; day++) {
      const cell = rowData[day];
      
      if (cell.isIgnoredDay) continue;

      if (cell.student) {
        const stats = statsMap.get(cell.student);
        if (stats) {
          stats.totalShifts++;
          totalShiftsAssigned++;

          // Find base post name
          const basePost = findBasePostName(rowName, servicePosts);
          if (basePost && stats.postBreakdown[basePost] !== undefined) {
            stats.postBreakdown[basePost]++;
            postDistribution[basePost] = (postDistribution[basePost] || 0) + 1;
          }
        }
      }
    }
  }

  // Calculate days off for each student
  const workingDays = result.daysInMonth - ignoredDays.size;
  statsMap.forEach(stats => {
    stats.totalDaysOff = workingDays - stats.totalShifts;
  });

  const studentStats = Array.from(statsMap.values());
  const averageShifts = totalShiftsAssigned / students.length;

  return {
    studentStats,
    totalStudents: students.length,
    totalShiftsAssigned,
    averageShiftsPerStudent: Math.round(averageShifts * 10) / 10,
    postDistribution,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateConfig(config: GenerationConfig): void {
  const { students, servicePosts, slots } = config;

  if (students.length === 0) {
    throw new Error('A lista de alunos não pode estar vazia');
  }

  if (servicePosts.length === 0) {
    throw new Error('A lista de postos não pode estar vazia');
  }

  if (servicePosts.length !== slots.length) {
    throw new Error(
      `O número de postos (${servicePosts.length}) deve ser igual ao número de vagas (${slots.length})`
    );
  }

  // Validate all students are numeric and in valid range
  const invalidStudents = students.filter(s => {
    const cls = getStudentClass(s);
    return cls === 'N/A';
  });

  if (invalidStudents.length > 0) {
    throw new Error(
      `Os seguintes alunos não são numéricos ou estão fora das faixas (1-74): ${invalidStudents.join(', ')}`
    );
  }
}

function getRotatedClassOrder(startIndex: number): Array<'A' | 'B' | 'C'> {
  const baseOrder: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
  return [
    baseOrder[startIndex % 3],
    baseOrder[(startIndex + 1) % 3],
    baseOrder[(startIndex + 2) % 3],
  ];
}

function getQueueAndIndex(
  className: 'A' | 'B' | 'C',
  data: {
    queueA: string[];
    queueB: string[];
    queueC: string[];
    indexA: number;
    indexB: number;
    indexC: number;
  }
): { queue: string[]; index: number } {
  if (className === 'A') return { queue: data.queueA, index: data.indexA };
  if (className === 'B') return { queue: data.queueB, index: data.indexB };
  return { queue: data.queueC, index: data.indexC };
}

function findBasePostName(rowName: string, servicePosts: string[]): string | null {
  // Check if rowName contains parentheses (e.g., "SENTINELAS (1/3)")
  const match = rowName.match(/^(.+?)\s*\(/);
  if (match) {
    return match[1].trim();
  }
  
  // Otherwise, rowName is the base post name
  return servicePosts.find(p => p.toUpperCase() === rowName.toUpperCase())?.toUpperCase() || null;
}

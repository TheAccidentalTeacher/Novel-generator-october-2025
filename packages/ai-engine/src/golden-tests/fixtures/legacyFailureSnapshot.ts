import {
  AnalysisSummary,
  ChapterOutlineDetails,
  ChapterPromptInput,
  ExistingChapterSummary,
  OutlinePromptInput,
  buildChapterPrompt,
  buildOutlinePrompt,
} from '../../prompts/novelGeneration';

interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

interface OutlineCallRecord {
  readonly model: 'gpt-4o-mini';
  readonly prompt: string;
  readonly usage: TokenUsage;
  readonly cost: number;
}

interface ChapterAttemptRecord {
  readonly attempt: number;
  readonly prompt: string;
  readonly usage?: TokenUsage;
  readonly cost?: number;
  readonly wordCount?: number;
  readonly error?: string;
}

interface ChapterOutcomeRecord {
  readonly chapterNumber: number;
  readonly finalStatus: 'completed' | 'failed';
  readonly attempts: readonly ChapterAttemptRecord[];
  readonly result?: {
    readonly wordCount: number;
    readonly contentExcerpt: string;
  };
}

type BaseEvent = {
  readonly type: string;
  readonly timestamp: string;
};

type PhaseTransitionEvent = BaseEvent & {
  readonly type: 'phase-transition';
  readonly from: string;
  readonly to: string;
  readonly phase: string;
};

type JobUpdateEvent = BaseEvent & {
  readonly type: 'job-update';
  readonly status?: string;
  readonly currentPhase?: string;
  readonly message: string;
  readonly progress?: Record<string, unknown>;
  readonly qualityMetrics?: Record<string, unknown>;
};

type GenerationProgressEvent = BaseEvent & {
  readonly type: 'generation-progress';
  readonly chapterNumber: number;
  readonly status: 'ai_generating' | 'ai_completed';
  readonly details: string;
  readonly wordTarget?: number;
  readonly wordsGenerated?: number;
};

type CostTrackingEvent = BaseEvent & {
  readonly type: 'cost-tracking';
  readonly chapterNumber: number;
  readonly model: 'gpt-4o';
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly tokensUsed: number;
  readonly chapterCost: number;
};

type FailureSnapshotEvent =
  | PhaseTransitionEvent
  | JobUpdateEvent
  | GenerationProgressEvent
  | CostTrackingEvent;

export interface LegacyFailureSnapshot {
  readonly job: {
    readonly jobId: string;
    readonly title: string;
    readonly premise: string;
    readonly genre: string;
    readonly subgenre: string;
    readonly targetWordCount: number;
    readonly targetChapters: number;
    readonly humanLikeWriting: boolean;
  };
  readonly outline: readonly ChapterOutlineDetails[];
  readonly analysisSummary: AnalysisSummary;
  readonly outlineCall: OutlineCallRecord;
  readonly chapterOutcomes: readonly ChapterOutcomeRecord[];
  readonly eventLog: readonly FailureSnapshotEvent[];
  readonly progressState: {
    readonly chaptersCompleted: number;
    readonly chaptersFailed: number;
    readonly hasFailures: boolean;
    readonly failedChapterNumbers: readonly number[];
    readonly estimatedCompletion: string;
  };
  readonly summary: {
    readonly jobId: string;
    readonly outlineCost: number;
    readonly chapterCosts: readonly number[];
    readonly totalCost: number;
    readonly tokensFromUsage: number;
    readonly tokensFromEvents: number;
    readonly completedChapterWordCounts: readonly number[];
    readonly failedChapters: readonly number[];
    readonly eventSequence: readonly string[];
    readonly finalJobStatus: {
      readonly status: string;
      readonly currentPhase: string;
      readonly message: string;
      readonly progress: Record<string, unknown>;
      readonly qualityMetrics: Record<string, unknown> | undefined;
    };
  };
}

const BASE_TIMESTAMP = Date.parse('2024-07-20T04:15:30.000Z');

const FAILURE_JOB = {
  jobId: 'legacy-job-2024-07-20T04:15:30Z',
  title: 'Shadows Over Helix Gate',
  premise:
    'A sentinel tasked with guarding a quantum gate witnesses glitched echoes of catastrophes that have not yet happened. Each vision degrades the gate and the sentinel must decide whether to seal it permanently, stranding allied fleets, or risk a cascading failure.',
  genre: 'science_fiction',
  subgenre: 'space_opera',
  targetWordCount: 12000,
  targetChapters: 2,
  humanLikeWriting: false,
} as const;

const ANALYSIS_SUMMARY: AnalysisSummary = {
  themes: [
    'Duty versus foresight',
    'Trusting imperfect systems',
  ],
  characters: [
    {
      name: 'Warden Lyra Chen',
      role: 'Gate sentinel haunted by future echoes',
      conflicts: 'Struggles between strict protocol and gut intuition',
    },
    {
      name: 'Admiral Kesh Darrow',
      role: 'Fleet commander dependent on the gate',
      conflicts: 'Needs the gate but fears Lyra’s destabilising visions',
    },
  ],
};

function createOutlinePromptInput(): OutlinePromptInput {
  return {
    title: FAILURE_JOB.title,
    premise: FAILURE_JOB.premise,
    genre: FAILURE_JOB.genre,
    subgenre: FAILURE_JOB.subgenre,
    targetWordCount: FAILURE_JOB.targetWordCount,
    targetChapters: FAILURE_JOB.targetChapters,
    humanLikeWriting: FAILURE_JOB.humanLikeWriting,
  };
}

const OUTLINE_USAGE: TokenUsage = {
  promptTokens: 3100,
  completionTokens: 2100,
  totalTokens: 5200,
};

const OUTLINE_PROMPT = buildOutlinePrompt(createOutlinePromptInput());

const OUTLINE_CALL: OutlineCallRecord = {
  model: 'gpt-4o-mini',
  prompt: OUTLINE_PROMPT,
  usage: OUTLINE_USAGE,
  cost: 0.00173,
};

function createChapterOutlineDetails(): readonly ChapterOutlineDetails[] {
  return [
    {
      chapterNumber: 1,
      title: 'Echoes in the Gate',
      summary:
        'Lyra intercepts overlapping nav-requests and glimpses three divergent disasters. She hides the anomaly while searching diagnostic archives, only to discover the gate logging arrivals from timelines that have not occurred.',
      keyEvents: [
        'Gate hum fractures into discordant chords while fleets align to transit',
        'Lyra reroutes power into archival buffers to replay the echo',
        'A diagnostic ghost signature matches a fleet years in the future',
      ],
      wordTarget: 6000,
    },
    {
      chapterNumber: 2,
      title: 'Probability Mutiny',
      summary:
        'Lyra convenes the admiralty with proof the gate is folding probabilities, but the admiral accuses her of sabotage. An emergency jump request forces a decision while the gate destabilises, threatening to strand half the fleet.',
      keyEvents: [
        'Bridge officers debate shutting down the gate mid-transit',
        'Lyra attempts a controlled collapse that fails to initialise',
        'External sensors show allied ships phasing in and out of alignment',
      ],
      wordTarget: 6000,
    },
  ];
}

const CHAPTER_OUTLINE = createChapterOutlineDetails();

const CHAPTER_ONE_USAGE: TokenUsage = {
  promptTokens: 1800,
  completionTokens: 3200,
  totalTokens: 5000,
};

const CHAPTER_ONE_PROMPT_INPUT: ChapterPromptInput = {
  title: FAILURE_JOB.title,
  premise: FAILURE_JOB.premise,
  genre: FAILURE_JOB.genre,
  subgenre: FAILURE_JOB.subgenre,
  targetChapters: FAILURE_JOB.targetChapters,
  humanLikeWriting: FAILURE_JOB.humanLikeWriting,
  analysis: ANALYSIS_SUMMARY,
  chaptersSoFar: [] as ReadonlyArray<ExistingChapterSummary>,
  chapterOutline: CHAPTER_OUTLINE[0],
};

const CHAPTER_ONE_PROMPT = buildChapterPrompt(CHAPTER_ONE_PROMPT_INPUT);

const CHAPTER_TWO_PROMPT_INPUT: ChapterPromptInput = {
  title: FAILURE_JOB.title,
  premise: FAILURE_JOB.premise,
  genre: FAILURE_JOB.genre,
  subgenre: FAILURE_JOB.subgenre,
  targetChapters: FAILURE_JOB.targetChapters,
  humanLikeWriting: FAILURE_JOB.humanLikeWriting,
  analysis: ANALYSIS_SUMMARY,
  chaptersSoFar: [
    {
      chapterNumber: 1,
      title: CHAPTER_OUTLINE[0].title,
      wordCount: 1012,
    },
  ],
  chapterOutline: CHAPTER_OUTLINE[1],
};

const CHAPTER_TWO_PROMPT = buildChapterPrompt(CHAPTER_TWO_PROMPT_INPUT);

const CHAPTER_OUTCOMES: readonly ChapterOutcomeRecord[] = [
  {
    chapterNumber: 1,
    finalStatus: 'completed',
    attempts: [
      {
        attempt: 1,
        prompt: CHAPTER_ONE_PROMPT,
        usage: CHAPTER_ONE_USAGE,
        cost: 0.057,
        wordCount: 1012,
      },
    ],
    result: {
      wordCount: 1012,
      contentExcerpt:
        '...Lyra muted the alarm and let the vibration of the gate roll through her bones. The harmonic split again, braiding into discordant threads she recognised from an incident report that had never been filed...',
    },
  },
  {
    chapterNumber: 2,
    finalStatus: 'failed',
    attempts: [
      {
        attempt: 1,
        prompt: CHAPTER_TWO_PROMPT,
        error: 'OpenAI: context_length_exceeded',
      },
      {
        attempt: 2,
        prompt: CHAPTER_TWO_PROMPT,
        error: 'OpenAI: server_error 503 temporarily unavailable',
      },
      {
        attempt: 3,
        prompt: CHAPTER_TWO_PROMPT,
        error: 'OpenAI: rate_limit_exceeded',
      },
    ],
  },
];

function iso(offsetSeconds: number): string {
  return new Date(BASE_TIMESTAMP + offsetSeconds * 1000).toISOString();
}

const EVENT_LOG: readonly FailureSnapshotEvent[] = [
  {
    type: 'phase-transition',
    timestamp: iso(0),
    from: 'initialization',
    to: 'outlining',
    phase: 'Creating detailed outline from synopsis',
  },
  {
    type: 'job-update',
    timestamp: iso(6),
    status: 'outlining',
    currentPhase: 'outline_generation',
    message: 'Creating detailed chapter outline from synopsis...',
  },
  {
    type: 'job-update',
    timestamp: iso(28),
    status: 'writing',
    currentPhase: 'chapter_writing',
    message: 'Outline completed. Starting chapter generation...',
  },
  {
    type: 'job-update',
    timestamp: iso(34),
    currentPhase: 'chapter_writing',
    message: 'Generating chapter 1 of 2...',
    progress: {
      chaptersCompleted: 0,
      chaptersFailed: 0,
      totalChapters: 2,
    },
  },
  {
    type: 'generation-progress',
    timestamp: iso(36),
    chapterNumber: 1,
    status: 'ai_generating',
    details: 'Generating chapter 1: "Echoes in the Gate"',
    wordTarget: 6000,
  },
  {
    type: 'generation-progress',
    timestamp: iso(78),
    chapterNumber: 1,
    status: 'ai_completed',
    details: 'Chapter 1 generated: 1012 words',
    wordsGenerated: 1012,
    wordTarget: 6000,
  },
  {
    type: 'cost-tracking',
    timestamp: iso(79),
    chapterNumber: 1,
    model: 'gpt-4o',
    promptTokens: CHAPTER_ONE_USAGE.promptTokens,
    completionTokens: CHAPTER_ONE_USAGE.completionTokens,
    tokensUsed: CHAPTER_ONE_USAGE.totalTokens,
    chapterCost: 0.057,
  },
  {
    type: 'job-update',
    timestamp: iso(80),
    currentPhase: 'chapter_writing',
    progress: {
      chaptersCompleted: 1,
      chaptersFailed: 0,
      totalChapters: 2,
    },
    message: 'Chapter 1 completed. 1/2 chapters done.',
  },
  {
    type: 'job-update',
    timestamp: iso(92),
    currentPhase: 'chapter_writing',
    message: 'Generating chapter 2 of 2...',
    progress: {
      chaptersCompleted: 1,
      chaptersFailed: 0,
      totalChapters: 2,
    },
  },
  {
    type: 'generation-progress',
    timestamp: iso(94),
    chapterNumber: 2,
    status: 'ai_generating',
    details: 'Generating chapter 2: "Probability Mutiny" (attempt 1)',
    wordTarget: 6000,
  },
  {
    type: 'generation-progress',
    timestamp: iso(136),
    chapterNumber: 2,
    status: 'ai_generating',
    details: 'Generating chapter 2: "Probability Mutiny" (attempt 2)',
    wordTarget: 6000,
  },
  {
    type: 'generation-progress',
    timestamp: iso(204),
    chapterNumber: 2,
    status: 'ai_generating',
    details: 'Generating chapter 2: "Probability Mutiny" (attempt 3)',
    wordTarget: 6000,
  },
  {
    type: 'job-update',
    timestamp: iso(248),
    currentPhase: 'chapter_writing',
    progress: {
      chaptersCompleted: 1,
      chaptersFailed: 1,
      totalChapters: 2,
      hasFailures: true,
      failedChapterNumbers: [2],
    },
    message: 'Chapter 2 failed after 3 attempts. 1 chapters failed.',
  },
  {
    type: 'job-update',
    timestamp: iso(260),
    status: 'completed',
    currentPhase: 'completed',
    message: 'Novel completed with 1/2 chapters. 1 chapters failed and can be retried.',
    progress: {
      chaptersCompleted: 1,
      chaptersFailed: 1,
      totalChapters: 2,
      hasFailures: true,
      failedChapterNumbers: [2],
    },
    qualityMetrics: {
      averageChapterLength: 1012,
      totalWordCount: 1012,
      targetAccuracy: 84,
      completionRate: 50,
      chaptersCompleted: 1,
      chaptersFailed: 1,
      hasFailures: true,
      failedChapters: [2],
    },
  },
];

const PROGRESS_STATE = {
  chaptersCompleted: 1,
  chaptersFailed: 1,
  hasFailures: true,
  failedChapterNumbers: [2] as const,
  estimatedCompletion: iso(360),
} as const;

function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled failure snapshot event: ${JSON.stringify(value)}`);
}

const SUMMARY = {
  jobId: FAILURE_JOB.jobId,
  outlineCost: OUTLINE_CALL.cost,
  chapterCosts: [0.057],
  totalCost: Number((OUTLINE_CALL.cost + 0.057).toFixed(5)),
  tokensFromUsage: OUTLINE_CALL.usage.totalTokens + CHAPTER_ONE_USAGE.totalTokens,
  tokensFromEvents: CHAPTER_ONE_USAGE.totalTokens,
  completedChapterWordCounts: [1012],
  failedChapters: [2],
  eventSequence: EVENT_LOG.map((event): string => {
    switch (event.type) {
      case 'phase-transition':
        return `${event.type}:${event.from}->${event.to}`;
      case 'job-update':
        return `${event.type}:${event.message}`;
      case 'generation-progress':
        return `${event.type}:${event.chapterNumber}:${event.status}`;
      case 'cost-tracking':
        return `${event.type}:${event.chapterNumber}`;
      default:
        return exhaustiveCheck(event);
    }
  }),
  finalJobStatus: {
    status: 'completed',
    currentPhase: 'completed',
    message: 'Novel completed with 1/2 chapters. 1 chapters failed and can be retried.',
    progress: PROGRESS_STATE,
    qualityMetrics: {
      averageChapterLength: 1012,
      totalWordCount: 1012,
      targetAccuracy: 84,
      completionRate: 50,
      chaptersCompleted: 1,
      chaptersFailed: 1,
      hasFailures: true,
      failedChapters: [2],
    },
  },
} as const;

export const LEGACY_FAILURE_SNAPSHOT: LegacyFailureSnapshot = {
  job: FAILURE_JOB,
  outline: CHAPTER_OUTLINE,
  analysisSummary: ANALYSIS_SUMMARY,
  outlineCall: OUTLINE_CALL,
  chapterOutcomes: CHAPTER_OUTCOMES,
  eventLog: EVENT_LOG,
  progressState: PROGRESS_STATE,
  summary: SUMMARY,
};

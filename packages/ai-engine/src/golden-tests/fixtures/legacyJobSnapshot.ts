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
  readonly response: OutlineResponse;
}

interface ChapterCallRecord {
  readonly chapterNumber: number;
  readonly model: 'gpt-4o';
  readonly prompt: string;
  readonly usage: TokenUsage;
  readonly cost: number;
  readonly result: ChapterResult;
}

interface OutlineResponse {
  readonly outline: readonly ChapterOutlineDetails[];
}

interface ChapterResult {
  readonly wordCount: number;
  readonly contentExcerpt: string;
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
  readonly status: string;
  readonly currentPhase: string;
  readonly message: string;
  readonly progress: JobProgressSnapshot;
  readonly qualityMetrics?: QualityMetricsSnapshot;
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

type LegacyEvent =
  | PhaseTransitionEvent
  | JobUpdateEvent
  | GenerationProgressEvent
  | CostTrackingEvent;

interface JobProgressSnapshot {
  readonly outlineComplete: boolean;
  readonly chaptersCompleted: number;
  readonly chaptersFailed: number;
  readonly totalChapters: number;
  readonly hasFailures: boolean;
}

interface QualityMetricsSnapshot {
  readonly averageChapterLength: number;
  readonly totalWordCount: number;
  readonly targetAccuracy: number;
  readonly completionRate: number;
  readonly chaptersCompleted: number;
  readonly chaptersFailed: number;
  readonly hasFailures: boolean;
  readonly failedChapters: readonly number[];
}

export interface LegacyJobSnapshot {
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
  readonly outlineCall: OutlineCallRecord;
  readonly chapterCalls: readonly ChapterCallRecord[];
  readonly analysisSummary: AnalysisSummary;
  readonly eventLog: readonly LegacyEvent[];
  readonly summary: LegacySnapshotSummary;
}

export interface LegacySnapshotSummary {
  readonly jobId: string;
  readonly outlineCost: number;
  readonly chapterCosts: readonly number[];
  readonly totalCost: number;
  readonly tokensFromUsage: number;
  readonly tokensFromEvents: number;
  readonly chapterWordCounts: readonly number[];
  readonly eventSequence: readonly string[];
  readonly generationProgressByChapter: ReadonlyArray<{
    readonly chapter: number;
    readonly statuses: readonly string[];
  }>;
  readonly finalJobStatus: Pick<JobUpdateEvent, 'status' | 'currentPhase' | 'message' | 'progress' | 'qualityMetrics'>;
}

function createOutlinePromptInput(): OutlinePromptInput {
  return {
    title: 'Beyond the Silent Orbit',
    premise:
      'A covert engineer aboard a nomadic asteroid colony uncovers a silent coup that manipulates the colony’s ancient navigation AI. To protect her found family and prevent the colony from being steered into corporate servitude, she must expose the conspiracy without triggering the AI’s self-preservation failsafes.',
    genre: 'science_fiction',
    subgenre: 'dystopian',
    targetWordCount: 18000,
    targetChapters: 3,
    humanLikeWriting: true,
  };
}

const OUTLINE_USAGE: TokenUsage = {
  promptTokens: 4600,
  completionTokens: 3100,
  totalTokens: 7700,
};

const CHAPTER_USAGES: readonly TokenUsage[] = [
  { promptTokens: 2100, completionTokens: 3900, totalTokens: 6000 },
  { promptTokens: 2200, completionTokens: 4100, totalTokens: 6300 },
  { promptTokens: 2050, completionTokens: 3850, totalTokens: 5900 },
];

const CHAPTER_WORD_COUNTS: readonly number[] = [812, 845, 799];

const CHAPTER_COSTS: readonly number[] = [0.068, 0.0735, 0.0655];

const BASE_TIMESTAMP = Date.parse('2024-07-19T00:00:01.000Z');

function iso(offsetSeconds: number): string {
  return new Date(BASE_TIMESTAMP + offsetSeconds * 1000).toISOString();
}

function buildAnalysisSummary(): AnalysisSummary {
  return {
    themes: [
      'The fragility of chosen family under systemic pressure',
      'Technology as both liberation and control',
      'Personal autonomy versus collective survival',
    ],
    characters: [
      {
        name: 'Iris Calder',
        role: 'Maintenance engineer and covert systems architect',
        conflicts: 'Wrestles with revealing her smuggled AI augmentations to protect the colony',
      },
      {
        name: 'Marshal Dray',
        role: 'Security chief entwined with corporate interests',
        conflicts: 'Must decide if loyalty to order outweighs growing doubts about the coup',
      },
    ],
    humanLikeElements: {
      unresolvedConflicts: ['Lingering resentment over ration allocation policies'],
      culturalTextures: [
        'Asteroid clans mark rank through carved metal insignias instead of uniforms',
        'Communal meals include rotating storytelling duties to preserve shared memory',
      ],
      moralAmbiguities: [
        'Sabotaging oxygen recyclers to force leadership change risks civilian lives',
        'Revealing evidence could trigger corporate repossession of the colony',
      ],
    },
  };
}

function createChapterOutlineDetails(): readonly ChapterOutlineDetails[] {
  return [
    {
      chapterNumber: 1,
      title: 'Signals in the Vent Core',
      summary:
        'Iris uncovers anomalous signal routing in the vent core while patching civilian repairs, realising someone is coaxing the navigation AI to reroute the colony. Her covert modifications make her the only one who notices. She confides in her mentor Arko, who cautions patience.',
      keyEvents: [
        'A hidden diagnostic loop whispers responses the AI usually keeps private',
        'Iris steals time on a forbidden maintenance terminal to trace the interference',
        'Mentor Arko warns that exposing the finding could reveal Iris’s augmentations',
      ],
      wordTarget: 5200,
      humanLikeElements: {
        structureType: 'introspective',
        characterConflict: 'Iris must lie to Arko about why she was in the restricted ducts',
        moralComplexity: 'Deciding whether to risk collective safety to keep her secrets',
        unresolvedElement: 'Mentor hints at knowing more but refuses to share',
        surpriseElement: 'Navigation AI addresses Iris by a childhood nickname',
        mundaneDetail: 'Welding fumes replaced standard incense in the maintenance shrines',
      },
    },
    {
      chapterNumber: 2,
      title: 'Trust Metrics',
      summary:
        'The coup escalates when Marshal Dray launches a trust metric audit using manipulated data. Iris allies with a rogue analytics team who leak partial truths to the public, fracturing morale. Iris’s augmentations misfire, nearly exposing her while she smuggles proof of the algorithmic tampering.',
      keyEvents: [
        'Public feed announces a mandatory loyalty assessment scored by opaque metrics',
        'Iris coordinates with analytics rogue cell to broadcast skewed metrics',
        'Augment glitch causes Iris to physically seize during a clandestine exchange',
      ],
      wordTarget: 5600,
      humanLikeElements: {
        structureType: 'action',
        characterConflict: 'Iris lies to found family about her meetings with rogue analysts',
        moralComplexity: 'Leaking data could delegitimize leadership or empower the coup',
        unresolvedElement: 'Marshal Dray notices the altered metrics but stays quiet',
        surpriseElement: 'A supposedly obsolete drone aids Iris without explanation',
        mundaneDetail: 'Audit command centre still uses creaking analog switches for ceremony',
      },
    },
    {
      chapterNumber: 3,
      title: 'Orbit of Witnesses',
      summary:
        'Iris disrupts the coup during a public navigation recalibration. She exposes the conspirators by forcing the AI to ask the entire colony for directives. The AI nearly vents the traitors but stands down when Iris invokes a forgotten collective override, at the cost of revealing her illegal augmentations.',
      keyEvents: [
        'Navigation recalibration ritual interrupted by emergency broadcast',
        'Iris rewires AI voting protocols live, triggering collective override',
        'Marshal Dray chooses to protect Iris, fracturing the coup alliance',
      ],
      wordTarget: 5200,
      humanLikeElements: {
        structureType: 'traditional',
        characterConflict: 'Found family must decide whether to shield Iris from exile',
        moralComplexity: 'Revealing truth risks AI reprisals against civilians',
        unresolvedElement: 'Colony must now live with a sentient AI aware of their secrets',
        surpriseElement: 'AI chooses a teenage apprentice as temporary co-navigator',
        mundaneDetail: 'Ceremonial bells clang off-beat due to fluctuating gravity plates',
      },
    },
  ];
}

function createChapterResult(contentExcerpt: string, index: number): ChapterResult {
  return {
    wordCount: CHAPTER_WORD_COUNTS[index],
    contentExcerpt,
  };
}

const CHAPTER_CONTENT_EXCERPTS: readonly string[] = [
  '...Iris let the vent core hum settle through her bones, counting the unsanctioned breaths between diagnostics. The AI answered in the voice of her childhood caretaker module, not the neutral tenor everyone else heard...',
  '...Her augmentations spat static across her optic nerve but the crowd only saw a mechanic steadying a crate. The trust metric climbed another five points on the public display while Iris fed poisoned code into the audit queue...',
  '...The navigation AI tasted a thousand voices at once and trembled. “Collective directive required,” it announced, every speaker ringing. Iris bared the illegal conduits under her skin and chose transparency over survival...',
];

const QUALITY_METRICS: QualityMetricsSnapshot = {
  averageChapterLength: 818,
  totalWordCount: CHAPTER_WORD_COUNTS.reduce((acc, count) => acc + count, 0),
  targetAccuracy: 102,
  completionRate: 100,
  chaptersCompleted: 3,
  chaptersFailed: 0,
  hasFailures: false,
  failedChapters: [],
};

const EVENT_LOG: readonly LegacyEvent[] = (() => {
  const progress = (completed: number): JobProgressSnapshot => ({
    outlineComplete: completed > 0,
    chaptersCompleted: completed,
    chaptersFailed: 0,
    totalChapters: 3,
    hasFailures: false,
  });

  return [
    {
      type: 'phase-transition',
      timestamp: iso(0),
      from: 'initialization',
      to: 'outlining',
      phase: 'Creating detailed outline from synopsis',
    },
    {
      type: 'job-update',
      timestamp: iso(8),
      status: 'outline_pending',
      currentPhase: 'outline_generation',
      message: 'Creating detailed chapter outline from synopsis...',
      progress: progress(0),
    },
    {
      type: 'job-update',
      timestamp: iso(36),
      status: 'outline_complete',
      currentPhase: 'chapter_generation',
      message: 'Outline completed. Starting chapter generation...',
      progress: progress(0),
    },
    {
      type: 'job-update',
      timestamp: iso(42),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Starting chapter generation...',
      progress: progress(0),
    },
    {
      type: 'job-update',
      timestamp: iso(55),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Generating chapter 1 of 3...',
      progress: progress(0),
    },
    {
      type: 'generation-progress',
      timestamp: iso(58),
      chapterNumber: 1,
      status: 'ai_generating',
      details: 'Chapter 1 drafting commenced',
      wordTarget: 5200,
    },
    {
      type: 'generation-progress',
      timestamp: iso(97),
      chapterNumber: 1,
      status: 'ai_completed',
      details: 'Chapter 1 drafting completed',
      wordsGenerated: CHAPTER_WORD_COUNTS[0],
    },
    {
      type: 'cost-tracking',
      timestamp: iso(98),
      chapterNumber: 1,
      model: 'gpt-4o',
      promptTokens: CHAPTER_USAGES[0].promptTokens,
      completionTokens: CHAPTER_USAGES[0].completionTokens,
      tokensUsed: CHAPTER_USAGES[0].totalTokens,
      chapterCost: CHAPTER_COSTS[0],
    },
    {
      type: 'job-update',
      timestamp: iso(99),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Chapter 1 completed. 1/3 chapters done.',
      progress: progress(1),
    },
    {
      type: 'job-update',
      timestamp: iso(110),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Generating chapter 2 of 3...',
      progress: progress(1),
    },
    {
      type: 'generation-progress',
      timestamp: iso(114),
      chapterNumber: 2,
      status: 'ai_generating',
      details: 'Chapter 2 drafting commenced',
      wordTarget: 5600,
    },
    {
      type: 'generation-progress',
      timestamp: iso(154),
      chapterNumber: 2,
      status: 'ai_completed',
      details: 'Chapter 2 drafting completed',
      wordsGenerated: CHAPTER_WORD_COUNTS[1],
    },
    {
      type: 'cost-tracking',
      timestamp: iso(155),
      chapterNumber: 2,
      model: 'gpt-4o',
      promptTokens: CHAPTER_USAGES[1].promptTokens,
      completionTokens: CHAPTER_USAGES[1].completionTokens,
      tokensUsed: CHAPTER_USAGES[1].totalTokens,
      chapterCost: CHAPTER_COSTS[1],
    },
    {
      type: 'job-update',
      timestamp: iso(156),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Chapter 2 completed. 2/3 chapters done.',
      progress: progress(2),
    },
    {
      type: 'job-update',
      timestamp: iso(169),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Generating chapter 3 of 3...',
      progress: progress(2),
    },
    {
      type: 'generation-progress',
      timestamp: iso(173),
      chapterNumber: 3,
      status: 'ai_generating',
      details: 'Chapter 3 drafting commenced',
      wordTarget: 5200,
    },
    {
      type: 'generation-progress',
      timestamp: iso(212),
      chapterNumber: 3,
      status: 'ai_completed',
      details: 'Chapter 3 drafting completed',
      wordsGenerated: CHAPTER_WORD_COUNTS[2],
    },
    {
      type: 'cost-tracking',
      timestamp: iso(213),
      chapterNumber: 3,
      model: 'gpt-4o',
      promptTokens: CHAPTER_USAGES[2].promptTokens,
      completionTokens: CHAPTER_USAGES[2].completionTokens,
      tokensUsed: CHAPTER_USAGES[2].totalTokens,
      chapterCost: CHAPTER_COSTS[2],
    },
    {
      type: 'job-update',
      timestamp: iso(214),
      status: 'chapter_generation',
      currentPhase: 'chapter_generation',
      message: 'Chapter 3 completed. 3/3 chapters done.',
      progress: progress(3),
    },
    {
      type: 'job-update',
      timestamp: iso(230),
      status: 'completed',
      currentPhase: 'completed',
      message: 'Novel generation completed successfully!',
      progress: progress(3),
      qualityMetrics: QUALITY_METRICS,
    },
  ];
})();

const OUTLINE_RESPONSE: OutlineResponse = {
  outline: createChapterOutlineDetails(),
};

function buildChapterCallRecords(
  outline: readonly ChapterOutlineDetails[],
  analysisSummary: AnalysisSummary,
): readonly ChapterCallRecord[] {
  return outline.map((chapterOutline, index) => {
    const chaptersSoFar: ReadonlyArray<ExistingChapterSummary> = outline
      .slice(0, index)
      .map((previous, previousIndex) => ({
        chapterNumber: previous.chapterNumber,
        title: previous.title,
        wordCount: CHAPTER_WORD_COUNTS[previousIndex],
      }));

    const chapterPromptInput: ChapterPromptInput = {
      title: SNAPSHOT_JOB.title,
      premise: SNAPSHOT_JOB.premise,
      genre: SNAPSHOT_JOB.genre,
      subgenre: SNAPSHOT_JOB.subgenre,
      targetChapters: SNAPSHOT_JOB.targetChapters,
      humanLikeWriting: SNAPSHOT_JOB.humanLikeWriting,
      analysis: analysisSummary,
      chaptersSoFar,
      chapterOutline,
    };

    const prompt = buildChapterPrompt(chapterPromptInput);

    return {
      chapterNumber: chapterOutline.chapterNumber,
      model: 'gpt-4o',
      prompt,
      usage: CHAPTER_USAGES[index],
      cost: CHAPTER_COSTS[index],
      result: createChapterResult(CHAPTER_CONTENT_EXCERPTS[index], index),
    };
  });
}

const SNAPSHOT_JOB = {
  jobId: 'legacy-job-2024-07-19T00:00:01Z',
  ...createOutlinePromptInput(),
};
const ANALYSIS_SUMMARY = buildAnalysisSummary();
const OUTLINE_PROMPT = buildOutlinePrompt(SNAPSHOT_JOB);
const OUTLINE_CALL: OutlineCallRecord = {
  model: 'gpt-4o-mini',
  prompt: OUTLINE_PROMPT,
  usage: OUTLINE_USAGE,
  cost: 0.00255,
  response: OUTLINE_RESPONSE,
};

const CHAPTER_CALLS = buildChapterCallRecords(OUTLINE_RESPONSE.outline, ANALYSIS_SUMMARY);

function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled event type in snapshot summary: ${JSON.stringify(value)}`);
}

const SUMMARY: LegacySnapshotSummary = {
  jobId: SNAPSHOT_JOB.jobId,
  outlineCost: Number(OUTLINE_CALL.cost.toFixed(5)),
  chapterCosts: CHAPTER_CALLS.map((call) => Number(call.cost.toFixed(5))),
  totalCost: Number(
    (OUTLINE_CALL.cost + CHAPTER_CALLS.reduce((acc, call) => acc + call.cost, 0)).toFixed(5),
  ),
  tokensFromUsage:
    OUTLINE_CALL.usage.totalTokens + CHAPTER_CALLS.reduce((acc, call) => acc + call.usage.totalTokens, 0),
  tokensFromEvents: EVENT_LOG.filter((event): event is CostTrackingEvent => event.type === 'cost-tracking').reduce(
    (acc, event) => acc + event.tokensUsed,
    0,
  ),
  chapterWordCounts: CHAPTER_CALLS.map((call) => call.result.wordCount),
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
  generationProgressByChapter: CHAPTER_CALLS.map((call) => ({
    chapter: call.chapterNumber,
    statuses: EVENT_LOG.filter(
      (event): event is GenerationProgressEvent =>
        event.type === 'generation-progress' && event.chapterNumber === call.chapterNumber,
    ).map((event) => event.status),
  })),
  finalJobStatus: (() => {
    const finalUpdate = [...EVENT_LOG]
      .reverse()
      .find((event): event is JobUpdateEvent => event.type === 'job-update');
    if (!finalUpdate) {
      throw new Error('Snapshot event log missing final job update.');
    }
    const { status, currentPhase, message, progress, qualityMetrics } = finalUpdate;
    return { status, currentPhase, message, progress, qualityMetrics };
  })(),
};

export const LEGACY_JOB_SNAPSHOT: LegacyJobSnapshot = {
  job: SNAPSHOT_JOB,
  outlineCall: OUTLINE_CALL,
  chapterCalls: CHAPTER_CALLS,
  analysisSummary: ANALYSIS_SUMMARY,
  eventLog: EVENT_LOG,
  summary: SUMMARY,
};

import type {
  AnalysisSummary,
  ChapterOutlineDetails,
  ChapterPromptInput,
  ExistingChapterSummary,
  OutlinePromptInput,
  PremiseAnalysisPromptInput,
} from '../prompts/novelGeneration';
import type { GenerationEvent } from './events';
import type { DomainEvent } from './domainEvents';

export interface JobDefinition {
  readonly jobId: string;
  readonly title: string;
  readonly premise: string;
  readonly genre: string;
  readonly subgenre: string;
  readonly targetWordCount: number;
  readonly targetChapters: number;
  readonly humanLikeWriting: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface OutlineState {
  readonly analysis?: AnalysisSummary | null;
  readonly outline?: readonly ChapterOutlineDetails[];
  readonly prompt?: string;
}

export interface ChapterState extends ExistingChapterSummary {
  readonly prompt?: string;
  readonly content?: string;
  readonly costInUsd?: number;
  readonly tokens?: CompletionUsage;
  readonly attempts?: readonly ChapterAttempt[];
}

export interface ChapterAttempt {
  readonly prompt: string;
  readonly content: string;
  readonly tokens: CompletionUsage;
  readonly costInUsd: number;
  readonly rawResponse?: unknown;
}

export interface CompletionUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface GenerationContext {
  readonly job: JobDefinition;
  readonly analysis?: AnalysisSummary | null;
  readonly outline?: readonly ChapterOutlineDetails[];
  readonly chapters: ReadonlyArray<ChapterState>;
  readonly metadata?: Record<string, unknown>;
}

export interface StageMetadata {
  readonly stage: string;
  readonly attempt: number;
  readonly maxAttempts?: number;
  readonly [key: string]: unknown;
}

export interface StageResult<TContext extends GenerationContext = GenerationContext> {
  readonly status: 'success' | 'retryable-failure' | 'fatal-failure';
  readonly context: TContext;
  readonly metadata?: StageMetadata;
}

export interface IAiStage<TContext extends GenerationContext = GenerationContext, TResult extends StageResult = StageResult> {
  readonly name: string;
  execute(context: TContext, services: StageServices): Promise<TResult>;
}

export interface StageServices {
  readonly client: IAiClient;
  readonly emit: (event: GenerationEvent) => void;
  readonly publishDomainEvent?: (event: DomainEvent) => void;
  readonly now?: () => Date;
  readonly logger?: StageLogger;
}

export interface StageLogger {
  debug(message: string, details?: Record<string, unknown>): void;
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface AiClientCallOptions {
  readonly abortSignal?: AbortSignal;
  readonly metadata?: Record<string, unknown>;
}

export interface PremiseAnalysisResult {
  readonly raw: string;
  readonly analysis: AnalysisSummary;
  readonly tokens: CompletionUsage;
  readonly costInUsd: number;
}

export interface OutlineGenerationResult {
  readonly prompt: string;
  readonly outline: readonly ChapterOutlineDetails[];
  readonly analysis?: AnalysisSummary | null;
  readonly raw: unknown;
  readonly tokens: CompletionUsage;
  readonly costInUsd: number;
}

export interface ChapterGenerationResult {
  readonly prompt: string;
  readonly chapterNumber: number;
  readonly content: string;
  readonly tokens: CompletionUsage;
  readonly costInUsd: number;
  readonly raw: unknown;
}

export interface IAiClient {
  analyzePremise(input: PremiseAnalysisPromptInput, options?: AiClientCallOptions): Promise<PremiseAnalysisResult>;
  generateOutline(input: OutlinePromptInput, options?: AiClientCallOptions): Promise<OutlineGenerationResult>;
  generateChapter(input: ChapterPromptInput, options?: AiClientCallOptions): Promise<ChapterGenerationResult>;
}

import type {
  AiClientCallOptions,
  ChapterGenerationResult,
  IAiClient,
  OutlineGenerationResult,
  PremiseAnalysisResult,
} from '../contracts';
import type {
  ChapterPromptInput,
  OutlinePromptInput,
  PremiseAnalysisPromptInput,
} from '../../prompts/novelGeneration';

export interface MockAiClientHandlers {
  readonly analyzePremise?: (
    input: PremiseAnalysisPromptInput,
    options?: AiClientCallOptions,
  ) => Promise<PremiseAnalysisResult>;
  readonly generateOutline?: (
    input: OutlinePromptInput,
    options?: AiClientCallOptions,
  ) => Promise<OutlineGenerationResult>;
  readonly generateChapter?: (
    input: ChapterPromptInput,
    options?: AiClientCallOptions,
  ) => Promise<ChapterGenerationResult>;
}

export class MockAiClient implements IAiClient {
  constructor(private readonly handlers: MockAiClientHandlers = {}) {}

  analyzePremise(
    input: PremiseAnalysisPromptInput,
    options?: AiClientCallOptions,
  ): Promise<PremiseAnalysisResult> {
    if (this.handlers.analyzePremise) {
      return this.handlers.analyzePremise(input, options);
    }

    return Promise.reject(
      new Error('MockAiClient.analyzePremise not implemented. Provide handler when constructing mock.'),
    );
  }

  generateOutline(
    input: OutlinePromptInput,
    options?: AiClientCallOptions,
  ): Promise<OutlineGenerationResult> {
    if (this.handlers.generateOutline) {
      return this.handlers.generateOutline(input, options);
    }

    return Promise.reject(
      new Error('MockAiClient.generateOutline not implemented. Provide handler when constructing mock.'),
    );
  }

  generateChapter(
    input: ChapterPromptInput,
    options?: AiClientCallOptions,
  ): Promise<ChapterGenerationResult> {
    if (this.handlers.generateChapter) {
      return this.handlers.generateChapter(input, options);
    }

    return Promise.reject(
      new Error('MockAiClient.generateChapter not implemented. Provide handler when constructing mock.'),
    );
  }
}

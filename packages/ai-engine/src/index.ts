import type { IAiClient, IAiStage, GenerationContext, StageLogger } from './core/contracts';
import type { DomainEvent } from './core/domainEvents';
import type { GenerationEvent } from './core/events';
import { NovelGenerationEngine } from './core/engine/novelGenerationEngine';

export * from './prompts/advancedHumanWritingRefinements';
export * from './prompts/universalHumanWritingFramework';
export * from './prompts/humanWritingEnhancements';
export * from './prompts/genreInstructions';
export * from './prompts/novelGeneration';
export * from './core/contracts';
export * from './core/events';
export * from './core/engine/novelGenerationEngine';
export * from './core/stages/outlineStage';
export * from './core/stages/chapterStage';
export * from './core/client/mockClient';
export * from './core/client/openAiClient';

export interface GenerateNovelOptions {
  readonly client: IAiClient;
  readonly stages?: ReadonlyArray<IAiStage>;
  readonly emit?: (event: GenerationEvent) => void;
  readonly publishDomainEvent?: (event: DomainEvent) => void;
  readonly logger?: StageLogger;
  readonly now?: () => Date;
}

export async function generateNovel(
  context: GenerationContext,
  options: GenerateNovelOptions,
): Promise<GenerationContext> {
  if (!options || !options.client) {
    throw new Error('generateNovel requires an AI client.');
  }

  const engine = new NovelGenerationEngine({
    stages: options.stages,
    services: {
      client: options.client,
      emit: options.emit ?? (() => undefined),
      publishDomainEvent: options.publishDomainEvent,
      logger: options.logger,
      now: options.now,
    },
  });

  const normalizedContext: GenerationContext = {
    ...context,
    chapters: Array.isArray(context.chapters) ? [...context.chapters] : [],
  };

  return engine.run(normalizedContext);
}

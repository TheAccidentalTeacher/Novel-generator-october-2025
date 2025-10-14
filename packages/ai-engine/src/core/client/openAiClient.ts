import type {
  ChapterGenerationResult,
  CompletionUsage,
  IAiClient,
  OutlineGenerationResult,
  PremiseAnalysisResult,
  AiClientCallOptions,
} from '../contracts';
import {
  buildChapterPrompt,
  buildOutlinePrompt,
  buildPremiseAnalysisPrompt,
  type AnalysisSummary,
  type ChapterPromptInput,
  type OutlinePromptInput,
  type PremiseAnalysisPromptInput,
} from '../../prompts/novelGeneration';

export type OpenAiChatCompletionsCreateParams = {
  readonly model: string;
  readonly messages: ReadonlyArray<OpenAiChatMessage>;
  readonly temperature?: number;
  readonly max_tokens?: number;
  readonly response_format?: { readonly type: 'json_object' | 'text' };
};

export interface OpenAiChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface OpenAiCompletionUsage {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
}

export interface OpenAiChatCompletionChoice {
  readonly index?: number;
  readonly message?: { readonly role?: string; readonly content?: string | null };
  readonly finish_reason?: string;
}

export interface OpenAiChatCompletion {
  readonly id?: string;
  readonly created?: number;
  readonly model?: string;
  readonly system_fingerprint?: string;
  readonly choices: ReadonlyArray<OpenAiChatCompletionChoice>;
  readonly usage?: OpenAiCompletionUsage;
}

export interface OpenAiLikeClient {
  readonly chat: {
    readonly completions: {
      create(
        params: OpenAiChatCompletionsCreateParams,
        requestOptions?: { readonly signal?: AbortSignal },
      ): Promise<OpenAiChatCompletion>;
    };
  };
}

export interface ModelPricingConfig {
  readonly input: number;
  readonly output: number;
}

export type PricingTable = Readonly<Record<string, ModelPricingConfig>>;

export interface OpenAiClientModels {
  readonly analysis?: string;
  readonly outline?: string;
  readonly chapter?: string;
}

export interface OpenAiClientSystemPrompts {
  readonly analysis?: string;
  readonly outline?: string;
  readonly chapter?: string;
}

export interface OpenAiClientOptions {
  readonly client: OpenAiLikeClient;
  readonly models?: OpenAiClientModels;
  readonly systemPrompts?: OpenAiClientSystemPrompts;
  readonly pricing?: PricingTable;
  readonly defaultTemperature?: number;
}

export interface CreateOpenAiClientOptions extends OpenAiClientOptions {
  readonly apiKey: string;
  readonly organization?: string;
  readonly baseURL?: string;
}

const DEFAULT_MODELS = {
  analysis: 'gpt-4o-mini',
  outline: 'gpt-4o-mini',
  chapter: 'gpt-4o',
} as const;

const DEFAULT_SYSTEM_PROMPTS: Required<OpenAiClientSystemPrompts> = {
  analysis: 'You are an expert story analyst. Return strictly valid JSON that matches the requested schema.',
  outline: 'You are an expert story architect. Return strictly valid JSON that matches the requested schema.',
  chapter: 'You are an expert novelist that writes immersive prose following the provided outline.',
};

const DEFAULT_PRICING: PricingTable = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

export class OpenAiClient implements IAiClient {
  private readonly client: OpenAiLikeClient;
  private readonly models: Required<OpenAiClientModels>;
  private readonly systemPrompts: Required<OpenAiClientSystemPrompts>;
  private readonly pricing: PricingTable;
  private readonly defaultTemperature: number;

  constructor(options: OpenAiClientOptions) {
    this.client = options.client;
    this.models = {
      analysis: options.models?.analysis ?? DEFAULT_MODELS.analysis,
      outline: options.models?.outline ?? DEFAULT_MODELS.outline,
      chapter: options.models?.chapter ?? DEFAULT_MODELS.chapter,
    };
    this.systemPrompts = {
      analysis: options.systemPrompts?.analysis ?? DEFAULT_SYSTEM_PROMPTS.analysis,
      outline: options.systemPrompts?.outline ?? DEFAULT_SYSTEM_PROMPTS.outline,
      chapter: options.systemPrompts?.chapter ?? DEFAULT_SYSTEM_PROMPTS.chapter,
    };
    this.pricing = options.pricing ?? DEFAULT_PRICING;
    this.defaultTemperature = options.defaultTemperature ?? 0.8;
  }

  async analyzePremise(
    input: PremiseAnalysisPromptInput,
    options?: AiClientCallOptions,
  ): Promise<PremiseAnalysisResult> {
    const prompt = buildPremiseAnalysisPrompt(input);
    const model = this.models.analysis;

    const response = await this.client.chat.completions.create(
      {
        model,
        temperature: this.resolveTemperature(options),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.systemPrompts.analysis },
          { role: 'user', content: prompt },
        ],
      },
      this.buildRequestOptions(options),
    );

    const usage = this.mapUsage(response.usage);
    const analysis = this.parseJsonContent<AnalysisSummary>(response, 'premise analysis');

    return {
  raw: JSON.stringify(response),
      analysis,
      tokens: usage,
      costInUsd: this.calculateCost(response.model ?? model, usage),
    };
  }

  async generateOutline(
    input: OutlinePromptInput,
    options?: AiClientCallOptions,
  ): Promise<OutlineGenerationResult> {
    const prompt = buildOutlinePrompt(input);
    const model = this.models.outline;

    const response = await this.client.chat.completions.create(
      {
        model,
        temperature: this.resolveTemperature(options),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.systemPrompts.outline },
          { role: 'user', content: prompt },
        ],
      },
      this.buildRequestOptions(options),
    );

    const usage = this.mapUsage(response.usage);
    const parsed = this.parseJsonContent<{ outline: OutlineGenerationResult['outline']; analysis?: AnalysisSummary | null }>(
      response,
      'outline generation',
    );

    if (!Array.isArray(parsed.outline)) {
      throw new Error('OpenAI outline response missing "outline" array.');
    }

    return {
      prompt,
      outline: parsed.outline,
      analysis: parsed.analysis ?? null,
      raw: response,
      tokens: usage,
      costInUsd: this.calculateCost(response.model ?? model, usage),
    };
  }

  async generateChapter(
    input: ChapterPromptInput,
    options?: AiClientCallOptions,
  ): Promise<ChapterGenerationResult> {
    const prompt = buildChapterPrompt(input);
    const model = this.models.chapter;

    const response = await this.client.chat.completions.create(
      {
        model,
        temperature: this.resolveTemperature(options, 0.9),
        messages: [
          { role: 'system', content: this.systemPrompts.chapter },
          { role: 'user', content: prompt },
        ],
      },
      this.buildRequestOptions(options),
    );

    const usage = this.mapUsage(response.usage);
    const content = this.extractMessage(response);

    if (!content) {
      throw new Error('OpenAI chapter response returned no content.');
    }

    const text = content.trim();

    return {
      prompt,
      chapterNumber: input.chapterOutline.chapterNumber,
      content: text,
      tokens: usage,
      costInUsd: this.calculateCost(response.model ?? model, usage),
      raw: response,
    };
  }

  private buildRequestOptions(options?: AiClientCallOptions) {
    return options?.abortSignal ? { signal: options.abortSignal } : undefined;
  }

  private resolveTemperature(options?: AiClientCallOptions, fallback?: number): number {
    const metadataTemperature = this.extractNumber(options?.metadata?.temperature);
    if (metadataTemperature !== null) {
      return metadataTemperature;
    }

    if (typeof fallback === 'number') {
      return fallback;
    }

    return this.defaultTemperature;
  }

  private extractNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    return null;
  }

  private parseJsonContent<T>(completion: OpenAiChatCompletion, label: string): T {
    const rawContent = this.extractMessage(completion);
    if (!rawContent) {
      throw new Error(`OpenAI ${label} response contained no message content.`);
    }

    const cleaned = rawContent
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse OpenAI ${label} JSON response: ${message}`);
    }
  }

  private extractMessage(completion: OpenAiChatCompletion): string | null {
    const [firstChoice] = completion.choices;
    const content = firstChoice?.message?.content;
    return typeof content === 'string' ? content : null;
  }

  private mapUsage(usage?: OpenAiCompletionUsage): CompletionUsage {
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
    };
  }

  private calculateCost(model: string, usage: CompletionUsage): number {
    const pricing = this.pricing[model];
    if (!pricing) {
      return 0;
    }

    const promptCost = (usage.promptTokens / 1000) * pricing.input;
    const completionCost = (usage.completionTokens / 1000) * pricing.output;
    return Number((promptCost + completionCost).toFixed(8));
  }
}

export async function createOpenAiClient(
  options: Omit<CreateOpenAiClientOptions, 'client'>,
): Promise<OpenAiClient> {
  const { default: OpenAIConstructor } = await import('openai');
  const client = new OpenAIConstructor({
    apiKey: options.apiKey,
    organization: options.organization,
    baseURL: options.baseURL,
  }) as unknown as OpenAiLikeClient;

  return new OpenAiClient({
    client,
    models: options.models,
    systemPrompts: options.systemPrompts,
    pricing: options.pricing,
    defaultTemperature: options.defaultTemperature,
  });
}

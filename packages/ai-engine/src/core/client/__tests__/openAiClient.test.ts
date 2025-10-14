import { OpenAiClient } from '../openAiClient';
import type { OpenAiLikeClient, OpenAiChatCompletion } from '../openAiClient';
import type { AiClientCallOptions } from '../../contracts';

function createCompletion(partial: Partial<OpenAiChatCompletion>): OpenAiChatCompletion {
  return {
    choices: [],
    ...partial,
  };
}

describe('OpenAiClient', () => {
  const defaultClientFactory = () => {
    const create = jest.fn();
    const client: OpenAiLikeClient = {
      chat: {
        completions: {
          create,
        },
      },
    };

    return { client, create } as const;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates outline and calculates cost using pricing table', async () => {
    const { client, create } = defaultClientFactory();

    create.mockResolvedValue(
      createCompletion({
        model: 'gpt-4o-mini',
        usage: {
          prompt_tokens: 600,
          completion_tokens: 400,
          total_tokens: 1000,
        },
        choices: [
          {
            index: 0,
            message: {
              content: JSON.stringify({
                outline: [
                  {
                    chapterNumber: 1,
                    title: 'Chapter One',
                    summary: 'Summary',
                    keyEvents: ['event-1'],
                    wordTarget: 4500,
                  },
                ],
                analysis: { themes: ['courage'] },
              }),
            },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({
      client,
      models: { outline: 'gpt-4o-mini', analysis: 'gpt-4o-mini', chapter: 'gpt-4o' },
      pricing: {
        'gpt-4o-mini': { input: 0.0002, output: 0.0007 },
      },
    });

    const result = await adapter.generateOutline({
      title: 'Test Novel',
      premise: 'A premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 9000,
      targetChapters: 2,
      humanLikeWriting: true,
    });

    expect(create).toHaveBeenCalledTimes(1);
    const callArgs = create.mock.calls[0][0];
    expect(callArgs.model).toBe('gpt-4o-mini');
    expect(callArgs.response_format).toEqual({ type: 'json_object' });
    expect(result.outline).toHaveLength(1);
    expect(result.analysis).toEqual({ themes: ['courage'] });
    expect(result.tokens.totalTokens).toBe(1000);

    const expectedCost = (600 / 1000) * 0.0002 + (400 / 1000) * 0.0007;
    expect(result.costInUsd).toBeCloseTo(Number(expectedCost.toFixed(8)));
  });

  it('respects abort signals and metadata temperature overrides', async () => {
    const { client, create } = defaultClientFactory();
    const controller = new AbortController();

    create.mockResolvedValue(
      createCompletion({
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              content: JSON.stringify({ outline: [], analysis: null }),
            },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({ client });
    const options: AiClientCallOptions = {
      abortSignal: controller.signal,
      metadata: { temperature: 0.42 },
    };

    await adapter.generateOutline({
      title: 'Test Novel',
      premise: 'A premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 9000,
      targetChapters: 2,
      humanLikeWriting: false,
    }, options);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.42 }),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('throws helpful error when JSON parsing fails', async () => {
    const { client, create } = defaultClientFactory();

    create.mockResolvedValue(
      createCompletion({
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: { content: 'invalid-json' },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({ client });

    await expect(
      adapter.generateOutline({
        title: 'Test Novel',
        premise: 'A premise',
        genre: 'science_fiction',
        subgenre: 'dystopian',
        targetWordCount: 9000,
        targetChapters: 2,
        humanLikeWriting: false,
      }),
    ).rejects.toThrow('Failed to parse OpenAI outline generation JSON response');
  });

  it('generates chapter content and includes prompt', async () => {
    const { client, create } = defaultClientFactory();

    create.mockResolvedValue(
      createCompletion({
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 700,
          completion_tokens: 1300,
        },
        choices: [
          {
            index: 0,
            message: {
              content: 'Chapter content goes here.',
            },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({ client });

    const result = await adapter.generateChapter({
      title: 'Test Novel',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetChapters: 3,
      humanLikeWriting: true,
      analysis: { themes: ['hope'] },
      chaptersSoFar: [],
      chapterOutline: {
        chapterNumber: 1,
        title: 'Chapter 1',
        summary: 'Summary',
        keyEvents: ['event-1'],
        wordTarget: 4000,
      },
    });

    expect(result.content).toBe('Chapter content goes here.');
    expect(result.chapterNumber).toBe(1);
    expect(result.prompt).toContain('Write Chapter 1 of the novel');
  });

  it('parses fenced JSON responses for premise analysis', async () => {
    const { client, create } = defaultClientFactory();

    create.mockResolvedValue(
      createCompletion({
        model: 'gpt-4o-mini',
        usage: {
          prompt_tokens: 200,
          completion_tokens: 300,
        },
        choices: [
          {
            index: 0,
            message: {
              content: '\u0060\u0060\u0060json\n{"themes":["hope"],"characters":[{"name":"A","role":"Lead"}]}\n\u0060\u0060\u0060',
            },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({ client });
    const result = await adapter.analyzePremise({
      premise: 'A premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 9000,
      targetChapters: 3,
      humanLikeWriting: true,
    });

    expect(result.analysis.themes).toEqual(['hope']);
    expect(result.tokens.totalTokens).toBe(500);
    expect(result.costInUsd).toBeGreaterThan(0);
  });

  it('falls back to default totals and zero cost for unknown models', async () => {
    const { client, create } = defaultClientFactory();

    create.mockResolvedValue(
      createCompletion({
        model: 'custom-model',
        usage: {
          prompt_tokens: 120,
          completion_tokens: 30,
        },
        choices: [
          {
            index: 0,
            message: {
              content: 'Chapter body with trailing spaces   ',
            },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({ client, pricing: {} });

    const result = await adapter.generateChapter({
      title: 'Test Novel',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetChapters: 3,
      humanLikeWriting: false,
      analysis: { themes: ['hope'] },
      chaptersSoFar: [],
      chapterOutline: {
        chapterNumber: 2,
        title: 'Next Chapter',
        summary: 'Summary',
        keyEvents: ['event'],
        wordTarget: 3800,
      },
    });

    expect(result.tokens).toEqual({ promptTokens: 120, completionTokens: 30, totalTokens: 150 });
    expect(result.costInUsd).toBe(0);
    expect(result.content).toBe('Chapter body with trailing spaces');
  });

  it('throws when model response contains no message content', async () => {
    const { client, create } = defaultClientFactory();

    create.mockResolvedValue(
      createCompletion({
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: { content: null },
          },
        ],
      }),
    );

    const adapter = new OpenAiClient({ client });

    await expect(adapter.generateChapter({
      title: 'Test Novel',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetChapters: 3,
      humanLikeWriting: true,
      analysis: { themes: [] },
      chaptersSoFar: [],
      chapterOutline: {
        chapterNumber: 1,
        title: 'Missing Content',
        summary: 'Summary',
        keyEvents: ['event'],
        wordTarget: 4000,
      },
    })).rejects.toThrow('OpenAI chapter response returned no content.');
  });
});

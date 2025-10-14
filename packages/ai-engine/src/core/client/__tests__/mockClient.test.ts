import { MockAiClient } from '../mockClient';

describe('MockAiClient', () => {
  it('rejects by default when handlers are missing', async () => {
    const client = new MockAiClient();

    await expect(client.analyzePremise({
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 4000,
      targetChapters: 2,
      humanLikeWriting: false,
    })).rejects.toThrow('MockAiClient.analyzePremise not implemented');

    await expect(client.generateOutline({
      title: 'Title',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 4000,
      targetChapters: 2,
      humanLikeWriting: false,
    })).rejects.toThrow('MockAiClient.generateOutline not implemented');

    await expect(client.generateChapter({
      title: 'Title',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetChapters: 2,
      humanLikeWriting: false,
      analysis: null,
      chaptersSoFar: [],
      chapterOutline: {
        chapterNumber: 1,
        title: 'Chapter 1',
        summary: 'Summary',
        keyEvents: ['event'],
        wordTarget: 3000,
      },
    })).rejects.toThrow('MockAiClient.generateChapter not implemented');
  });

  it('delegates to supplied handlers', async () => {
    const handlers = {
      analyzePremise: jest.fn(async () => ({
        raw: '{}',
        analysis: { themes: ['courage'] },
        tokens: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        costInUsd: 0.01,
      })),
      generateOutline: jest.fn(async () => ({
        prompt: 'prompt',
        outline: [],
        analysis: null,
        raw: {},
        tokens: { promptTokens: 2, completionTokens: 2, totalTokens: 4 },
        costInUsd: 0.02,
      })),
      generateChapter: jest.fn(async () => ({
        prompt: 'chapter',
        chapterNumber: 1,
        content: 'Content',
        tokens: { promptTokens: 3, completionTokens: 3, totalTokens: 6 },
        costInUsd: 0.03,
        raw: {},
      })),
    };

    const client = new MockAiClient(handlers);

    await client.analyzePremise({
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 4000,
      targetChapters: 2,
      humanLikeWriting: false,
    });

    await client.generateOutline({
      title: 'Title',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetWordCount: 4000,
      targetChapters: 2,
      humanLikeWriting: false,
    });

    await client.generateChapter({
      title: 'Title',
      premise: 'Premise',
      genre: 'science_fiction',
      subgenre: 'dystopian',
      targetChapters: 2,
      humanLikeWriting: false,
      analysis: null,
      chaptersSoFar: [],
      chapterOutline: {
        chapterNumber: 1,
        title: 'Chapter 1',
        summary: 'Summary',
        keyEvents: ['event'],
        wordTarget: 3000,
      },
    });

    expect(handlers.analyzePremise).toHaveBeenCalledTimes(1);
    expect(handlers.generateOutline).toHaveBeenCalledTimes(1);
    expect(handlers.generateChapter).toHaveBeenCalledTimes(1);
  });
});

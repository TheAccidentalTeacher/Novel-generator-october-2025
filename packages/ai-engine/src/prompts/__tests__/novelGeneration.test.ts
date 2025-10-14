import { buildChapterPrompt, buildOutlinePrompt, buildPremiseAnalysisPrompt } from '../novelGeneration';

describe('novel generation prompts', () => {
  it('builds premise analysis prompt with human-like enhancements', () => {
    const prompt = buildPremiseAnalysisPrompt({
      premise: 'An exiled starship captain must broker peace between warring factions while confronting their own legacy.',
      genre: 'SCIENCE_FICTION',
      subgenre: 'SPACE_OPERA',
      targetWordCount: 90000,
      targetChapters: 24,
      humanLikeWriting: true,
    });

    expect(prompt).toMatchSnapshot();
  });

  it('builds outline prompt with human-like storytelling requirements', () => {
    const prompt = buildOutlinePrompt({
      title: 'Shattered Orbit',
      premise: 'A scattered rebellion races to unify before an ancient AI awakens a doomsday fleet.',
      genre: 'SCIENCE_FICTION',
      subgenre: 'SPACE_OPERA',
      targetWordCount: 90000,
      targetChapters: 24,
      humanLikeWriting: true,
    });

    expect(prompt).toMatchSnapshot();
  });

  it('builds chapter prompt with full human authenticity guidance', () => {
    const prompt = buildChapterPrompt({
      title: 'Shattered Orbit',
      premise: 'A scattered rebellion races to unify before an ancient AI awakens a doomsday fleet.',
      genre: 'SCIENCE_FICTION',
      subgenre: 'SPACE_OPERA',
      targetChapters: 24,
      humanLikeWriting: true,
      analysis: {
        themes: ['Legacy', 'Collective Responsibility'],
        characters: ['Captain Mira Solari', 'AI Custodian Arcturus'],
        humanLikeElements: {
          characterConflicts: ['Leadership fractures', 'Ethical compromises'],
        },
      },
      chaptersSoFar: [
        { chapterNumber: 1, title: 'Prologue: The Silent Call', wordCount: 2500 },
        { chapterNumber: 2, title: 'Fragments of Trust', wordCount: 3100 },
        { chapterNumber: 3, title: 'Echoes in the Dust', wordCount: 2800 },
      ],
      chapterOutline: {
        chapterNumber: 4,
        title: 'Negotiations in Low Orbit',
        summary: 'Mira attempts to reconcile two rival cells while an AI emissary tests their resolve.',
        keyEvents: [
          'Arrival aboard the scarred carrier',
          'Heated debate collapsing into factional accusations',
          'Unexpected AI transmission forces new terms',
        ],
        wordTarget: 3400,
        humanLikeElements: {
          structureType: 'dialogue-heavy',
          characterConflict: 'Mira vs. former co-captain over mission priorities',
          moralComplexity: 'Choosing between sacrificing allies or civilians',
          unresolvedElement: 'AI ultimatum left hanging',
          surpriseElement: 'Revealed spy in Mira’s escort crew',
          mundaneDetail: 'Ship vents rattling from neglected maintenance',
        },
      },
    });

    expect(prompt).toMatchSnapshot();
  });
});

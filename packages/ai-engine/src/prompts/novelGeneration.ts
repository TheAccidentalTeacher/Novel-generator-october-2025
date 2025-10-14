import { advancedHumanWritingRefinements } from './advancedHumanWritingRefinements';
import { genreInstructions } from './genreInstructions';
import { humanWritingEnhancements } from './humanWritingEnhancements';
import { universalHumanWritingFramework } from './universalHumanWritingFramework';

export interface PremiseAnalysisPromptInput {
  readonly premise: string;
  readonly genre: string;
  readonly subgenre: string;
  readonly targetWordCount: number;
  readonly targetChapters: number;
  readonly humanLikeWriting: boolean;
}

export interface OutlinePromptInput {
  readonly title: string;
  readonly premise: string;
  readonly genre: string;
  readonly subgenre: string;
  readonly targetWordCount: number;
  readonly targetChapters: number;
  readonly humanLikeWriting: boolean;
}

export interface ChapterOutlineDetails {
  readonly chapterNumber: number;
  readonly title: string;
  readonly summary: string;
  readonly keyEvents: readonly string[];
  readonly wordTarget: number;
  readonly humanLikeElements?: Record<string, unknown>;
}

export interface ExistingChapterSummary {
  readonly chapterNumber: number;
  readonly title: string;
  readonly wordCount?: number | null;
}

export interface AnalysisSummary {
  readonly themes?: readonly string[];
  readonly characters?: readonly unknown[];
  readonly humanLikeElements?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export interface ChapterPromptInput {
  readonly title: string;
  readonly premise: string;
  readonly genre: string;
  readonly subgenre: string;
  readonly targetChapters: number;
  readonly humanLikeWriting: boolean;
  readonly analysis?: AnalysisSummary | null;
  readonly chaptersSoFar: ReadonlyArray<ExistingChapterSummary>;
  readonly chapterOutline: ChapterOutlineDetails;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function resolveGenreInstruction(genre: string, subgenre: string): string {
  const byExactGenre = (genreInstructions as Record<string, Record<string, string> | undefined>)[genre]?.[subgenre];
  if (byExactGenre) {
    return byExactGenre;
  }

  const normalizedGenre = genre.toUpperCase();
  const normalizedSubgenre = subgenre.toUpperCase();
  const byNormalizedGenre = (genreInstructions as Record<string, Record<string, string> | undefined>)[normalizedGenre]?.[normalizedSubgenre];
  if (byNormalizedGenre) {
    return byNormalizedGenre;
  }

  throw new Error(`Unsupported genre combination: ${genre}/${subgenre}`);
}

function formatThemes(analysis?: AnalysisSummary | null): string {
  if (!analysis || !Array.isArray(analysis.themes) || analysis.themes.length === 0) {
    return 'N/A';
  }

  return analysis.themes.join(', ');
}

function formatCharacters(analysis?: AnalysisSummary | null): string {
  if (!analysis || !Array.isArray(analysis.characters) || analysis.characters.length === 0) {
    return 'N/A';
  }

  return analysis.characters.map((character) => String(character)).join(', ');
}

export function buildPremiseAnalysisPrompt(input: PremiseAnalysisPromptInput): string {
  const genreInstruction = resolveGenreInstruction(input.genre, input.subgenre);

  return `
Analyze this novel premise and provide structural recommendations:

PREMISE: "${input.premise}"

GENRE: ${formatLabel(input.genre)}
SUBGENRE: ${formatLabel(input.subgenre)}
TARGET WORD COUNT: ${input.targetWordCount}
TARGET CHAPTERS: ${input.targetChapters}

GENRE GUIDELINES:
${genreInstruction}

${input.humanLikeWriting ? humanWritingEnhancements.prompts.analysis.humanLikeAdditions : ''}

${input.humanLikeWriting ? universalHumanWritingFramework.promptEnhancements.analysis : ''}

${input.humanLikeWriting ? advancedHumanWritingRefinements.level5Prompts.analysis : ''}

Please provide a comprehensive analysis that prioritizes ${input.humanLikeWriting ? 'authentic, human-like storytelling' : 'engaging storytelling'}:

ANALYSIS REQUIREMENTS:
1. Theme analysis - themes that allow for moral complexity
2. Character archetypes - with internal contradictions and growth potential
3. Plot structure - that accommodates meaningful failures and setbacks
4. Key story beats - including moments of genuine uncertainty
5. Potential subplots - that may remain partially unresolved
6. Tone and style guidance - that varies subtly throughout
${input.humanLikeWriting ? `7. HUMAN-LIKE ELEMENTS:
   - Internal character conflicts that create lasting tension
   - Opportunities for protagonist to be genuinely wrong
   - Morally ambiguous situations requiring difficult choices
   - Cultural/world elements that add lived-in authenticity
   - Distinctive character voice planning (speech patterns, vocabulary)` : `7. ENGAGING ELEMENTS:
   - Clear character motivations and goals
   - Compelling conflicts and obstacles
   - Satisfying story progression
   - Genre-appropriate atmosphere and tone`}

Respond in JSON format:
{
  "themes": ["theme1", "theme2"],
  "characters": [{"type": "character_type", "conflicts": "internal_struggles", "speechPattern": "distinctive_traits"}],
  "plotStructure": "structure_with_flexibility_for_messiness",
  "keyBeats": ["beat1", "beat2"],
  "subplots": [{"main": "subplot", "resolution": "complete|partial|unresolved"}],
  "tone": "description_that_allows_variation",
  "styleNotes": "guidance_for_character_specific_prose"${input.humanLikeWriting ? `,
  "humanLikeElements": {
    "characterConflicts": ["lasting_disagreement1", "lasting_disagreement2"],
    "moralDilemmas": ["situation1", "situation2"],
    "culturalElements": ["in_world_reference1", "in_world_reference2"],
    "unresolvedElements": ["mystery1", "relationship_tension1"]
  }` : ''}
}`;
}

export function buildOutlinePrompt(input: OutlinePromptInput): string {
  const averageWordsPerChapter = Math.round(input.targetWordCount / input.targetChapters);

  return `
Create a ${input.targetChapters}-chapter outline for "${input.title}" (${formatLabel(input.genre)} - ${formatLabel(input.subgenre)}).

SYNOPSIS: ${input.premise}
WORD COUNT: ${input.targetWordCount} total (~${averageWordsPerChapter} per chapter)

${input.humanLikeWriting ? humanWritingEnhancements.prompts.outline.humanLikeAdditions : ''}

${input.humanLikeWriting ? universalHumanWritingFramework.promptEnhancements.outline : ''}

${input.humanLikeWriting ? advancedHumanWritingRefinements.level5Prompts.outline : ''}

${input.humanLikeWriting ? `HUMAN-LIKE OUTLINE REQUIREMENTS:
- Create significant variation in chapter lengths (some 800 words, others 3000+ words)
- Mix chapter types: action, dialogue-heavy, introspective, world-building focused
- Plan at least 2 meaningful character failures that don't immediately resolve
- Include 1-2 chapters with unresolved endings that complicate rather than clarify
- Design at least one major plot twist that genuinely surprises (not just reveals)
- Ensure internal character conflicts span multiple chapters without easy resolution
- Plan chapters that show the same events from different character perspectives
- Include at least one chapter told through non-traditional format (logs, messages, flashbacks)` : `OUTLINE REQUIREMENTS:
- Create engaging chapter progression with clear story beats
- Build tension and character development throughout
- Include compelling conflicts and resolutions
- Maintain genre conventions and reader expectations`}

Create exactly ${input.targetChapters} chapters with detailed descriptions that embrace ${input.humanLikeWriting ? 'narrative complexity' : 'engaging storytelling'}:

JSON format:
{
  "outline": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "summary": "Key events and plot progression",
      "keyEvents": ["event1", "event2", "event3"],
      "characterFocus": ["char1", "char2"],
      "plotAdvancement": "How this chapter advances or complicates the main plot",
      "wordTarget": ${averageWordsPerChapter},
      "genreElements": ["genre-specific element1", "genre-specific element2"]${input.humanLikeWriting ? `,
      "humanLikeElements": {
        "structureType": "traditional|dialogue-heavy|introspective|action|logs|flashback",
        "characterConflict": "internal_or_interpersonal_tension_introduced_or_developed",
        "moralComplexity": "ethical_dilemma_or_ambiguous_situation",
        "unresolvedElement": "something_left_hanging_or_complicated",
        "surpriseElement": "unexpected_development_or_character_choice",
        "mundaneDetail": "lived_in_world_element_that_adds_authenticity"
      }` : ''}
    }
  ]
}`;
}

export function buildChapterPrompt(input: ChapterPromptInput): string {
  const { chapterOutline } = input;
  const keyEvents = Array.isArray(chapterOutline.keyEvents) && chapterOutline.keyEvents.length > 0
    ? chapterOutline.keyEvents.join(', ')
    : 'Chapter events to be determined';
  const previousChapters = input.chaptersSoFar.length > 0
    ? input.chaptersSoFar
        .slice(-3)
        .map((chapter) => `Ch${chapter.chapterNumber}: ${chapter.title} (${String(chapter.wordCount)}w)`)
        .join('; ')
    : 'This is the first chapter';
  const analysisContext = input.targetChapters > 20
    ? `Key themes: ${formatThemes(input.analysis)}
Main characters: ${formatCharacters(input.analysis)}${input.humanLikeWriting ? `
Human-like story elements: ${JSON.stringify(input.analysis?.humanLikeElements ?? {}, null, 1)}` : ''}`
    : JSON.stringify(input.analysis ?? {}, null, 1);
  const genreInstruction = resolveGenreInstruction(input.genre, input.subgenre);

  return `
Write Chapter ${chapterOutline.chapterNumber} of the novel "${input.title}".

CHAPTER OUTLINE:
Title: ${chapterOutline.title}
Summary: ${chapterOutline.summary}
Key Events: ${keyEvents}
Target Word Count: ${chapterOutline.wordTarget}${input.humanLikeWriting ? `
Human-Like Elements: ${JSON.stringify(chapterOutline.humanLikeElements ?? {}, null, 1)}` : ''}

NOVEL CONTEXT:
Premise: "${input.premise}"
Genre: ${formatLabel(input.genre)} - ${formatLabel(input.subgenre)}
Previous chapters: ${previousChapters}
Story progress: Chapter ${chapterOutline.chapterNumber} of ${input.targetChapters} total

GENRE GUIDELINES:
${genreInstruction}

ANALYSIS CONTEXT:
${analysisContext}

${input.humanLikeWriting ? humanWritingEnhancements.prompts.chapter.humanLikeAdditions : ''}

${input.humanLikeWriting ? universalHumanWritingFramework.promptEnhancements.chapter : ''}

${input.humanLikeWriting ? advancedHumanWritingRefinements.level5Prompts.chapter : ''}

${input.humanLikeWriting ? `LEVEL 5 ADVANCED HUMAN AUTHENTICITY IMPLEMENTATION:

FACTION BREAKING POINT - INTERNAL CONFLICTS WITH CONSEQUENCES:
- Show ally factions sabotaging protagonist's plans from genuine good intentions (no clear villains)
- Force leader into choice between authoritarian control and collaborative risk with lasting consequences
- Make internal division as dangerous as external threats - competing survival needs drive conflict
- Create "hard choice" scenarios where every option creates lasting community division

POWER COST ENFORCEMENT - MEANINGFUL LIMITATIONS:
- After significant ability use, show character suffering real biological/psychological costs (memory loss, exhaustion, vulnerability)
- Include empathetic feedback where protector characters physically/emotionally feel pain when their charges suffer
- Create recovery periods where powerful characters are dependent on others and cannot use abilities
- Never let powers solve problems without exacting meaningful prices that affect story progression

STRUCTURAL SUBVERSION - BREAK ESTABLISHED PATTERNS:
- Avoid repetitive meeting/discussion locations (break cantina meeting pattern if established)
- Include critical decision made by isolated character with no time for group consultation
- Show how small character weakness or overlooked detail catastrophically derails simple plans
- Create genuine surprise that feels inevitable once revealed

ACTIVE PROSE CONSTRAINTS - FORBIDDEN PHRASE ENFORCEMENT:
- ABSOLUTELY FORBIDDEN: "silver-flecked eyes," "copper-plated exosuit," "vibrant hair," "living suit," "multi-tool gauntlet," "weathered face," "steely determination," "nanite cloak," "luminescent ink"
- Describe characters/equipment through action and environmental effect: "weight settled across shoulders" not "heavy exosuit"
- Use fresh, specific details that haven't appeared in previous chapters
- Show character traits through behavior and dialogue, not repetitive physical descriptions

ADVANCED AUTHENTICITY TECHNIQUES:
- Let established character strengths become weaknesses under different pressures
- Show internal faction politics affecting every decision, not just major plot points
- Include moments where characters surprise themselves with choices under pressure
- Create dialogue subtext that contradicts spoken words, revealing deeper faction conflicts
- Make consequences of past chapters continue to affect current events and relationships

Write approximately ${chapterOutline.wordTarget} words that push established complexity to breaking points and challenge reader expectations while maintaining narrative authenticity.` : `Write approximately ${chapterOutline.wordTarget} words of engaging prose that maintains genre conventions and advances the story effectively.`}

Write only the chapter content, no metadata or formatting.`;
}

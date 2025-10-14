/**
 * Human writing enhancements configuration captured from the legacy engine.
 * Provides feature toggles, prompts, and quality metrics that push AI output toward human authenticity.
 */
export const humanWritingEnhancements = {
  improvements: {
    structuralVariety: {
      enabled: true,
      description: 'Vary chapter lengths, structures, and pacing',
      techniques: [
        'Mix action-packed and reflective chapters',
        'Vary chapter lengths significantly',
        'Include chapters told through logs, messages, or different POVs',
        'Create uneven pacing that mirrors human storytelling',
      ],
    },
    characterComplexity: {
      enabled: true,
      description: 'Add internal conflicts and surprising character choices',
      techniques: [
        'Characters make unexpected but believable decisions',
        "Internal team conflicts that aren't easily resolved",
        'Characters fail meaningfully without immediate plot advancement',
        "Morally ambiguous choices with no clear 'right' answer",
      ],
    },
    dialogueAuthenticity: {
      enabled: true,
      description: 'Create distinctive speech patterns and subtext',
      techniques: [
        'Each character has unique verbal tics and vocabulary',
        'Conversations with subtext - characters say one thing, mean another',
        'Dialogue that reveals character through word choice patterns',
        'Organic humor that emerges from situations naturally',
      ],
    },
    worldBuilding: {
      enabled: true,
      description: 'Add cultural depth and mundane details',
      techniques: [
        'In-world songs, stories, sayings that characters reference',
        "Mundane details that don't advance plot but feel lived-in",
        'Minor equipment failures and everyday irritations',
        'Cultural references specific to the fictional world',
      ],
    },
    narrativeComplexity: {
      enabled: true,
      description: 'Embrace messiness and unresolved elements',
      techniques: [
        'Leave some plot threads deliberately unresolved',
        'Convenient resolutions avoided in favor of messy realism',
        'Protagonist genuinely surprised or wrong about important things',
        'Unexpected consequences that complicate rather than resolve',
      ],
    },
    sensoryVariability: {
      enabled: true,
      description: 'Add inconsistent perception and varied descriptions',
      techniques: [
        'Characters perceive same events differently',
        'Occasional sensory misinterpretation as humans experience',
        'Avoid repetitive character descriptions and phrases',
        'Vary prose style subtly based on character focus',
      ],
    },
    antagonistDepth: {
      enabled: true,
      description: 'Develop complex antagonists with understandable motivations',
      techniques: [
        'Antagonists with relatable (if misguided) motivations',
        'Corporate/institutional enemies with human faces and reasons',
        'Villains who make valid points even when wrong overall',
        "Opposition that challenges heroes' worldview meaningfully",
      ],
    },
    characterFailures: {
      enabled: true,
      description: "Include meaningful failures that don't advance plot but reveal character",
      techniques: [
        'Characters make mistakes with lasting consequences',
        "Show characters failing at important moments without easy recovery",
        'Include physical and emotional failures that create genuine setbacks',
        'Failures that force character growth or change relationships',
      ],
    },
    interpersonalFriction: {
      enabled: true,
      description: 'Create deeper conflicts between characters that persist',
      techniques: [
        'Fundamental disagreements about values or approaches',
        "Personal friction that doesn't resolve easily",
        'Trust issues that span multiple chapters',
        'Characters who genuinely dislike aspects of each other',
      ],
    },
    mundaneFrustrations: {
      enabled: true,
      description: 'Add everyday annoyances and complications',
      techniques: [
        'Equipment breaking at crucial moments',
        'Miscommunications that create real problems',
        'Physical discomfort and exhaustion affecting decisions',
        'Small irritations that compound into bigger issues',
      ],
    },
    sensoryInconsistency: {
      enabled: true,
      description: 'Show characters perceiving same environment differently',
      techniques: [
        'Different characters notice different details in same scene',
        'Varied reactions to same stimuli based on background',
        'Conflicting interpretations of events or situations',
        'Personal biases affecting perception and memory',
      ],
    },
    backstoryContradictions: {
      enabled: true,
      description: 'Create complex character histories with contradictory elements',
      techniques: [
        'Past actions that conflict with current values',
        'Skills or knowledge that seem inconsistent with background',
        "Relationships that don't fit expected patterns",
        'Hidden aspects of personality revealed gradually',
      ],
    },
  },
  prompts: {
    analysis: {
      humanLikeAdditions: `
HUMAN-LIKE WRITING REQUIREMENTS:
- Plan for internal conflicts between main characters that won't resolve easily
- Identify opportunities for characters to fail meaningfully without plot advancement
- Consider morally ambiguous situations with no clear right answers
- Plan distinctive speech patterns and verbal tics for each major character
- Include mundane, lived-in world details that don't advance plot
- Design at least 2-3 unresolved elements to leave open
- Ensure antagonist has understandable (if wrong) motivations
- Plan for interpersonal friction based on fundamental value differences
- Create backstories with contradictory elements that surprise readers`,
    },
    outline: {
      humanLikeAdditions: `
STRUCTURAL VARIETY REQUIREMENTS:
- Vary chapter lengths significantly (some short, some long)
- Mix chapter types: action, reflection, dialogue-heavy, description-heavy, logs/messages
- Plan uneven pacing with slower moments that build character
- Ensure some chapters end without clear resolution or neat closure
- Plan at least one major plot twist that genuinely surprises characters
- Include meaningful failures that create genuine setbacks without easy recovery
- Create chapters where equipment fails or miscommunications cause problems
- Plan for different characters to perceive same events differently
- Include at least one chapter focused on mundane frustrations and complications
- Avoid formulaic chapter structures (setup-conflict-resolution pattern)`,
    },
    chapter: {
      humanLikeAdditions: `
HUMAN-LIKE CHAPTER WRITING REQUIREMENTS:

CHARACTER AUTHENTICITY:
- Each character should have distinctive speech patterns, verbal tics, and vocabulary choices
- Include subtext in dialogue - characters saying one thing but meaning another
- Show characters making unexpected but believable choices that reveal contradictions
- Avoid repetitive character descriptions (same traits mentioned repeatedly)
- Include genuine interpersonal friction that doesn't resolve easily
- Show characters failing meaningfully without immediate plot advancement

NARRATIVE REALISM:
- Add mundane frustrations: equipment breaking, miscommunications, physical discomfort
- Include sensory inconsistencies - characters perceiving same events differently
- Avoid over-explaining themes or having characters speak too philosophically
- Let conflicts be messy and not resolve too neatly or conveniently
- Show genuine surprise for protagonists - they should be caught off-guard
- Avoid too many profound or scripted-sounding conversations

WORLD DEPTH:
- Reference specific in-world cultural elements (songs, sayings, shared history)
- Include organic humor that emerges naturally from situations
- Add small equipment failures or everyday complications at inconvenient times
- Show characters dealing with mundane annoyances that compound
- Vary sensory details - different smells, tastes, textures, sounds

STRUCTURAL VARIETY:
- Avoid formulaic chapter structure (setup-conflict-resolution)
- Vary prose style based on which character is the focus
- Include unexpected moments that don't serve the main plot
- End with something unresolved or complicating rather than neat closure
- Break expected narrative patterns with genuine surprises
- Mix chapter formats - some action-heavy, others reflective, some through logs/messages

ANTAGONIST COMPLEXITY:
- Make antagonists more complex with understandable motivations beyond simple greed
- Show opposition that makes valid points even when wrong overall
- Create conflicts where there's no clear "right" answer
- Develop institutional/corporate enemies with human faces and relatable reasons`,
    },
  },
  qualityMetrics: {
    structuralVariety: {
      checkRepetitiveChapterStructure: true,
      checkChapterLengthVariation: true,
      checkPacingVariation: true,
      avoidFormulaic: true,
    },
    characterAuthenticity: {
      checkDistinctiveDialogue: true,
      checkUnpredictableChoices: true,
      checkInternalConflicts: true,
      avoidRepetitiveDescriptions: true,
      checkGenuineFailures: true,
    },
    narrativeComplexity: {
      checkUnresolvedElements: true,
      checkMoralAmbiguity: true,
      checkGenuineFailures: true,
      avoidConvenientPlotDevelopments: true,
      checkProtagonistSurprises: true,
    },
    dialogueQuality: {
      checkSubtext: true,
      avoidOverlyPhilosophical: true,
      checkOrganicHumor: true,
      checkDistinctiveVoices: true,
    },
    worldBuilding: {
      checkMundaneDetails: true,
      checkEquipmentFailures: true,
      checkCulturalReferences: true,
      checkSensoryInconsistency: true,
    },
    antagonistDevelopment: {
      checkComplexMotivations: true,
      avoidSimpleGreed: true,
      checkValidPoints: true,
      checkInstitutionalHumans: true,
    },
  },
  avoidPatterns: {
    repetitiveDescriptions: [
      'Avoid repeatedly mentioning same character traits',
      "Don't always describe characters with signature features",
      'Vary how you introduce characters in different scenes',
    ],
    formulaicChapters: [
      'Break setup-conflict-resolution pattern',
      'Vary chapter opening and ending styles',
      'Mix action-heavy with reflective chapters organically',
    ],
    overlyProfound: [
      'Reduce philosophical monologues',
      'Let wisdom emerge through action rather than speeches',
      'Avoid characters who always speak in profound ways',
    ],
    convenientSolutions: [
      'Make problems harder to solve',
      'Include failed attempts and setbacks',
      'Show the messiness of real problem-solving',
    ],
    limitedEmotions: [
      'Expand emotional range beyond character archetypes',
      "Show contradictory emotions simultaneously",
      "Include emotions that don't fit character's usual pattern",
    ],
    overusedMetaphors: [
      'Vary metaphors and similes',
      'Avoid comparing everything to living entities',
      'Use concrete rather than abstract comparisons',
    ],
  },
} as const;

export type HumanWritingEnhancements = typeof humanWritingEnhancements;

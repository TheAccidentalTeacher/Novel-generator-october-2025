/**
 * Universal human writing framework captured from the legacy authoring engine.
 * Provides core narrative, character, and prose guidance for maintaining human authenticity.
 */
export const universalHumanWritingFramework = {
  corePhilosophy: {
    primary:
      'AI excels at pattern recognition but struggles with intentional messiness and contradictory human creativity',
    goal: 'Bridge the gap between AI efficiency and human authenticity through structured creative chaos',
  },
  characterDevelopment: {
    embraceCharacterFallibility: {
      principle:
        'Perfect characters are boring and unrelatable. Human stories are defined by struggle and mistakes.',
      implementation: {
        assignCoreFlaws: {
          description: 'Give each main character a significant flaw that directly impacts decisions',
          examples: ['pride', 'insecurity', 'impulsiveness', 'stubbornness', 'fear of intimacy', 'arrogance'],
          prompt: 'Assign each character a core psychological flaw that will cause them to make poor decisions',
        },
        engineerMeaningfulFailure: {
          description: "Design scenarios where character's core flaw causes failure with lasting consequences",
          examples: [
            "Detective's arrogance leads them to dismiss crucial clue",
            "Romantic lead's fear of intimacy causes them to sabotage relationship",
            "Leader's pride prevents them from accepting help when desperately needed",
          ],
          prompt: 'Create failures that stem from character flaws and have real, lasting story consequences',
        },
      },
    },
    developMultiDimensionalAntagonists: {
      principle:
        "Villains who are 'evil for evil's sake' are caricatures. Compelling antagonists have understandable motivations.",
      implementation: {
        heroOfTheirOwnStory: {
          description: "Write antagonist's motivation from perspective where they are the protagonist",
          prompt:
            "What does the antagonist believe they are saving or achieving? How do they justify their actions?",
        },
        giveThemPointOfView: {
          description: "Dedicate scenes to antagonist's perspective showing personal life, fears, justifications",
          prompt: "Show the antagonist's humanity through their personal struggles and believable motivations",
        },
      },
    },
    generateConflictFromCharacter: {
      principle: 'Most memorable conflicts are internal or interpersonal, not just external plot events',
      implementation: {
        createValueOppositions: {
          description: 'Design main cast with conflicting core values',
          examples: ['Order vs Freedom', 'Community vs Individual survival', 'Justice vs Mercy', 'Tradition vs Progress'],
          prompt: 'Create characters whose fundamental values will inevitably clash under pressure',
        },
        forceDifficultChoices: {
          description: 'Place characters in situations where their values directly oppose each other',
          prompt: 'Force characters to choose paths that create lasting friction with other characters',
        },
      },
    },
  },
  plotAndPacing: {
    masterPacingAndRevelation: {
      principle: 'Humans crave patterns but are delighted by surprises that make perfect sense in hindsight',
      implementation: {
        ruleOfThree: {
          description: 'Introduce key information three times: mention, context, critical',
          prompt: 'Plant important story elements three times before they become crucial to the plot',
        },
        plantSeedsNotBillboards: {
          description: 'Hint at character/event existence through subtle clues before direct introduction',
          examples: ['Intercepted messages', 'Strange rumors', 'Unexplained events', 'Mysterious effects without visible cause'],
          prompt: 'Foreshadow major plot elements through environmental clues and character reactions',
        },
      },
    },
    introduceAmbiguityAndUnresolvedElements: {
      principle: "Life rarely offers neat conclusions. Unresolved elements make the world feel larger and more real",
      implementation: {
        avoidTidyEpilogue: {
          description: 'Resist explaining what happens to every single character',
          prompt: "Leave some character fates and secondary plot points deliberately unresolved",
        },
        poseUnanswerable: {
          description:
            "End chapters/books with lingering questions about world nature or character morality",
          prompt: "Include moral and philosophical questions that don't have clear answers",
        },
      },
    },
    createComplexMoralDilemmas: {
      principle: "Human condition is defined by navigating gray areas with no clear 'right' answers",
      implementation: {
        noWinScenarios: {
          description: 'Create situations where every option comes with significant cost or sacrifice',
          prompt: 'Design choices where characters must sacrifice something important regardless of decision',
        },
        challengeGenreTropes: {
          description: 'Subvert expected genre conventions with morally complex alternatives',
          examples: [
            "Chosen one must sacrifice innocent to fulfill prophecy",
            "Killer's motive was morally justifiable",
            "Hero's victory requires becoming what they fought against",
          ],
          prompt: "Challenge reader expectations by making traditionally 'good' choices morally ambiguous",
        },
      },
    },
  },
  proseAndWorldBuilding: {
    diversifyLanguagePatterns: {
      principle:
        "AI models fall back on statistically probable phrases. Breaking these patterns is crucial for believability",
      implementation: {
        forbiddenWordsList: {
          description: "Identify and avoid AI's go-to descriptors for each character/chapter",
          examples: ['silver-flecked eyes', 'copper-plated exosuit', 'weathered face', 'steely determination'],
          prompt: 'Avoid repetitive character descriptors and find new ways to convey the same information',
        },
        describeViaActionAndEffect: {
          description: 'Describe objects through their effect on characters or environment',
          examples: [
            "Instead of 'exosuit was heavy' → 'felt familiar, grounding weight settle on shoulders'",
            "Instead of 'room was cold' → 'breath misted as she spoke'",
            "Instead of 'he was angry' → 'his jaw worked like he was chewing glass'",
          ],
          prompt: 'Show character and environment details through action and sensory impact rather than direct description',
        },
      },
    },
    groundExtraordinaryInMundane: {
      principle: 'Fantastical worlds become believable when inhabitants deal with everyday problems',
      implementation: {
        incorporateMinorAnnoyances: {
          description: "Add small, relatable problems to extraordinary settings",
          examples: [
            "Starship's food synthesizer makes terrible coffee",
            "Wizard's enchanted robes are itchy",
            'Super-spy gets a papercut',
            'Teleportation makes you nauseous',
            'Magic sword is awkwardly balanced',
          ],
          prompt: "Include mundane frustrations and minor problems that don't advance plot but add authenticity",
        },
        showEnvironmentDontTell: {
          description: 'Reveal world details through specific, lived-in details rather than exposition',
          examples: [
            'Floorboards that creak in specific spot',
            "Particular mug that's chipped",
            'Door handle that sticks',
            'Stain on wall from old accident',
          ],
          prompt: 'Show world history and character through environmental details and worn objects',
        },
      },
    },
    writeDialogueWithLayers: {
      principle:
        'Humans rarely say exactly what they mean. Communication happens through implication and subtext',
      implementation: {
        focusOnUnspoken: {
          description: "Define what each character wants but won't say, then dance around it in dialogue",
          prompt: "In every dialogue scene, identify what each character desperately wants but cannot directly say",
        },
        useActionsToContradictWords: {
          description: "Show character's true feelings through actions that contradict their words",
          examples: [
            "'I'm fine' while hands clench into fists",
            "'I trust you' while taking step backward",
            "'No problem' while voice gets higher",
            "'I don't care' while avoiding eye contact",
          ],
          prompt: "Create tension between what characters say and what their body language reveals",
        },
      },
    },
  },
  promptEnhancements: {
    analysis: `
UNIVERSAL FRAMEWORK FOR CHARACTER ANALYSIS:

CHARACTER FALLIBILITY REQUIREMENTS:
- Assign each main character a core psychological flaw that will drive poor decisions
- Identify how this flaw will cause meaningful failures with lasting consequences
- Plan scenarios where character strengths become weaknesses under pressure

ANTAGONIST COMPLEXITY:
- Develop antagonist as hero of their own story with understandable motivations
- Create opposition that makes valid points even when wrong overall
- Plan scenes showing antagonist's personal life, fears, and justifications

VALUE CONFLICT PLANNING:
- Design main characters with fundamentally opposing core values
- Plan situations where these values will clash and create lasting friction
- Identify choices that will force characters to act against their stated beliefs`,
    outline: `
UNIVERSAL FRAMEWORK FOR OUTLINE STRUCTURE:

PACING AND REVELATION MASTERY:
- Use Rule of Three: introduce key elements three times before they become critical
- Plant seeds for major events through environmental clues and character reactions
- Plan foreshadowing that feels natural, not forced or obvious

AMBIGUITY AND UNRESOLVED ELEMENTS:
- Leave secondary plot points and some character fates deliberately unresolved
- Create moral and philosophical questions without clear answers
- Plan chapter endings that pose lingering questions about character morality

COMPLEX MORAL DILEMMAS:
- Design no-win scenarios where every choice has significant cost
- Challenge genre tropes with morally complex alternatives
- Create situations where traditional 'good' choices become ambiguous`,
    chapter: `
UNIVERSAL FRAMEWORK FOR CHAPTER WRITING:

CHARACTER FALLIBILITY IN ACTION:
- Show characters making decisions driven by their core psychological flaws
- Include meaningful failures that have real, lasting consequences beyond this chapter
- Let character strengths become weaknesses when taken to extremes

PROSE AUTHENTICITY REQUIREMENTS:
- Avoid repetitive character descriptors (forbidden words: silver-flecked, weathered, steely)
- Describe through action and effect rather than direct description
- Include mundane annoyances that don't advance plot but add authenticity

DIALOGUE WITH LAYERS:
- Every dialogue scene must have subtext - characters wanting something they won't say
- Use body language and actions that contradict spoken words
- Show character relationships through what they DON'T say to each other

WORLD-BUILDING THROUGH LIVED-IN DETAILS:
- Show world history through worn objects and environmental details
- Include minor equipment failures and everyday complications
- Ground extraordinary elements in relatable, mundane problems

ANTAGONIST HUMANIZATION:
- If antagonist appears, show their perspective and understandable motivations
- Make opposition that raises valid points even when wrong overall
- Avoid "evil for evil's sake" - show the human reasoning behind opposition`,
  },
} as const;

export type UniversalHumanWritingFramework = typeof universalHumanWritingFramework;

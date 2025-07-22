// humanWritingEnhancements.js - Configuration for making AI-generated novels feel more human
// Based on analysis feedback for "Copper Stars: The McCarthy Expeditions"

const humanWritingEnhancements = {
  // Core improvement areas identified in analysis
  improvements: {
    structuralVariety: {
      enabled: true,
      description: "Vary chapter lengths, structures, and pacing",
      techniques: [
        "Mix action-packed and reflective chapters",
        "Vary chapter lengths significantly",
        "Include chapters told through logs, messages, or different POVs",
        "Create uneven pacing that mirrors human storytelling"
      ]
    },
    
    characterComplexity: {
      enabled: true,
      description: "Add internal conflicts and surprising character choices",
      techniques: [
        "Characters make unexpected but believable decisions",
        "Internal team conflicts that aren't easily resolved", 
        "Characters fail meaningfully without immediate plot advancement",
        "Morally ambiguous choices with no clear 'right' answer"
      ]
    },
    
    dialogueAuthenticity: {
      enabled: true,
      description: "Create distinctive speech patterns and subtext",
      techniques: [
        "Each character has unique verbal tics and vocabulary",
        "Conversations with subtext - characters say one thing, mean another",
        "Dialogue that reveals character through word choice patterns",
        "Organic humor that emerges from situations naturally"
      ]
    },
    
    worldBuilding: {
      enabled: true,
      description: "Add cultural depth and mundane details",
      techniques: [
        "In-world songs, stories, sayings that characters reference",
        "Mundane details that don't advance plot but feel lived-in",
        "Minor equipment failures and everyday irritations",
        "Cultural references specific to the fictional world"
      ]
    },
    
    narrativeComplexity: {
      enabled: true,
      description: "Embrace messiness and unresolved elements",
      techniques: [
        "Leave some plot threads deliberately unresolved",
        "Convenient resolutions avoided in favor of messy realism",
        "Protagonist genuinely surprised or wrong about important things",
        "Unexpected consequences that complicate rather than resolve"
      ]
    },
    
    sensoryVariability: {
      enabled: true,
      description: "Add inconsistent perception and varied descriptions",
      techniques: [
        "Characters perceive same events differently",
        "Occasional sensory misinterpretation as humans experience",
        "Avoid repetitive character descriptions and phrases",
        "Vary prose style subtly based on character focus"
      ]
    },
    
    antagonistDepth: {
      enabled: true,
      description: "Develop complex antagonists with understandable motivations",
      techniques: [
        "Antagonists with relatable (if misguided) motivations",
        "Corporate/institutional enemies with human faces and reasons",
        "Villains who make valid points even when wrong overall",
        "Opposition that challenges heroes' worldview meaningfully"
      ]
    }
  },

  // Specific prompt additions for each writing phase
  prompts: {
    analysis: {
      humanLikeAdditions: `
HUMAN-LIKE WRITING REQUIREMENTS:
- Plan for internal conflicts between main characters that won't resolve easily
- Identify opportunities for characters to fail meaningfully 
- Consider morally ambiguous situations with no clear right answers
- Plan distinctive speech patterns for each major character
- Include mundane, lived-in world details that don't advance plot
- Design at least 2-3 unresolved elements to leave open
- Ensure antagonist has understandable (if wrong) motivations`
    },
    
    outline: {
      humanLikeAdditions: `
STRUCTURAL VARIETY REQUIREMENTS:
- Vary chapter lengths significantly (some short, some long)
- Mix chapter types: action, reflection, dialogue-heavy, description-heavy
- Include at least one chapter told through logs/messages/different format
- Plan uneven pacing with slower moments that build character
- Ensure some chapters end without clear resolution
- Plan at least one major plot twist that genuinely surprises
- Include meaningful failures that create genuine setbacks`
    },
    
    chapter: {
      humanLikeAdditions: `
HUMAN-LIKE CHAPTER WRITING REQUIREMENTS:

CHARACTER AUTHENTICITY:
- Each character should have distinctive speech patterns and vocabulary choices
- Include subtext in dialogue - characters saying one thing but meaning another
- Show characters making unexpected but believable choices
- Include internal contradictions and personal blind spots

NARRATIVE REALISM:
- Add mundane details and minor irritations that don't advance the plot
- Include sensory inconsistencies and misperceptions
- Avoid over-explaining themes - show through action and dialogue
- Let conflicts be messy and not resolve too neatly

WORLD DEPTH:
- Reference in-world cultural elements (songs, sayings, shared history)
- Include organic humor that emerges from situations naturally
- Add small equipment failures or everyday complications
- Show characters perceiving the same events slightly differently

STRUCTURAL VARIETY:
- Vary prose style subtly based on which character is the focus
- Avoid repetitive phrases and character descriptions
- Include unexpected moments that don't serve the main plot
- End with something unresolved or complicating rather than neat closure`
    }
  },

  // Quality checks for human-like writing
  qualityMetrics: {
    structuralVariety: {
      checkRepetitiveChapterStructure: true,
      checkChapterLengthVariation: true,
      checkPacingVariation: true
    },
    
    characterAuthenticity: {
      checkDistinctiveDialogue: true,
      checkUnpredictableChoices: true,
      checkInternalConflicts: true
    },
    
    narrativeComplexity: {
      checkUnresolvedElements: true,
      checkMoralAmbiguity: true,
      checkGenuineFailures: true
    }
  }
};

module.exports = humanWritingEnhancements;

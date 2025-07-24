/**
 * Continuity Guardian System
 * Advanced quality control for maintaining story consistency across chapters
 * Designed for proof-of-concept and critical novel generation
 */

const { emitStoryBibleUpdate, emitContinuityAlert } = require('../websocket');
const logger = require('../logger');

class ContinuityGuardian {
    constructor(jobId) {
        this.jobId = jobId;
        this.storyBible = {
            characters: new Map(),
            locations: new Map(),
            plotThreads: new Map(),
            timeline: [],
            establishedFacts: new Map(),
            pendingPayoffs: new Set(),
            conflicts: new Map(),
            abilities: new Map()
        };
        this.analysisHistory = [];
        this.continuityIssues = [];
    }

    /**
     * Extract and track key story elements from a chapter
     */
    analyzeChapter(chapterContent, chapterNumber) {
        logger.info(`Analyzing chapter ${chapterNumber} for continuity elements`);
        
        const analysis = {
            chapterNumber,
            characters: this.extractCharacterReferences(chapterContent),
            plotThreads: this.extractPlotThreads(chapterContent),
            timelineEvents: this.extractTimelineEvents(chapterContent),
            establishedFacts: this.extractEstablishedFacts(chapterContent),
            foreshadowing: this.extractForeshadowing(chapterContent),
            conflicts: this.extractConflicts(chapterContent),
            abilities: this.extractAbilities(chapterContent)
        };
        
        this.analysisHistory.push(analysis);
        
        // Emit real-time story bible update
        emitStoryBibleUpdate(this.jobId, {
            type: 'chapterAnalyzed',
            chapterNumber,
            newElements: this.summarizeNewElements(analysis),
            storyBible: this.getStoryBibleSummary()
        });
        
        return analysis;
    }

    /**
     * Generate continuity checking prompts for chapter generation
     */
    generateContinuityPrompt(chapterOutline, previousChapters) {
        if (this.storyBible.characters.size === 0 && previousChapters.length === 0) {
            return ''; // No continuity to check for first chapter
        }
        
        const relevantElements = this.getRelevantContinuityElements(chapterOutline);
        
        return `
CONTINUITY GUARDIAN ACTIVE - Maintain story consistency:

ESTABLISHED CHARACTER DETAILS:
${this.formatCharacterConsistency(relevantElements.characters)}

ACTIVE PLOT THREADS:
${this.formatPlotThreads(relevantElements.plotThreads)}

ESTABLISHED FACTS TO MAINTAIN:
${this.formatEstablishedFacts(relevantElements.facts)}

TIMELINE CONTEXT:
${this.formatTimelineContext(relevantElements.timeline)}

UNRESOLVED ELEMENTS TO ADDRESS:
${this.formatForeshadowing(relevantElements.foreshadowing)}

CRITICAL CONTINUITY REQUIREMENTS:
1. Character actions must match established personality and background
2. References to previous events must be accurate
3. Physical descriptions must match previous chapters
4. Timeline progression must be logical
5. Any callbacks to earlier chapters must be precise
6. Introduced plot threads must show development or acknowledgment

`;
    }

    /**
     * Check for potential continuity issues in generated content
     */
    validateChapter(chapterContent, chapterNumber) {
        const issues = [];
        
        try {
            // Character consistency check
            const characterIssues = this.checkCharacterConsistency(chapterContent, chapterNumber);
            issues.push(...characterIssues);
            
            // Plot thread continuity check
            const plotIssues = this.checkPlotContinuity(chapterContent, chapterNumber);
            issues.push(...plotIssues);
            
            // Timeline coherence check
            const timelineIssues = this.checkTimelineCoherence(chapterContent, chapterNumber);
            issues.push(...timelineIssues);
            
            // Fact consistency check
            const factIssues = this.checkFactConsistency(chapterContent, chapterNumber);
            issues.push(...factIssues);
            
            // Alert on any issues found
            if (issues.length > 0) {
                emitContinuityAlert(this.jobId, {
                    chapterNumber,
                    issueCount: issues.length,
                    issues: issues.map(issue => ({
                        type: issue.type,
                        description: issue.description,
                        severity: issue.severity
                    }))
                });
            }
            
        } catch (error) {
            logger.error(`Error validating chapter ${chapterNumber}: ${error.message}`);
            issues.push({
                type: 'validation_error',
                description: `Failed to validate chapter: ${error.message}`,
                severity: 'error'
            });
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            suggestions: this.generateFixSuggestions(issues)
        };
    }

    /**
     * Extract character references and descriptions (simplified implementation)
     */
    extractCharacterReferences(content) {
        const characters = new Map();
        
        // Simple pattern matching for character names (would be enhanced with NLP)
        const namePatterns = [
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|replied|nodded|smiled|frowned|looked|walked|ran)/g,
            /"[^"]*",?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+said/g,
            /Captain\s+([A-Z][a-z]+)/g,
            /Dr\.\s+([A-Z][a-z]+)/g
        ];
        
        namePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[1];
                if (name && name.length > 1) {
                    characters.set(name, {
                        appearances: (characters.get(name)?.appearances || 0) + 1,
                        context: match[0]
                    });
                }
            }
        });
        
        return characters;
    }

    /**
     * Track plot threads and story elements (simplified implementation)
     */
    extractPlotThreads(content) {
        const threads = new Map();
        
        // Look for plot-relevant keywords and phrases
        const plotKeywords = [
            'mission', 'quest', 'investigation', 'discovery', 'secret', 'mystery',
            'threat', 'danger', 'enemy', 'alliance', 'betrayal', 'revelation',
            'plan', 'strategy', 'attack', 'defense', 'escape', 'rescue'
        ];
        
        plotKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = content.match(regex);
            if (matches) {
                threads.set(keyword, {
                    mentions: matches.length,
                    keyword: keyword
                });
            }
        });
        
        return threads;
    }

    /**
     * Identify timeline markers and sequencing (simplified implementation)
     */
    extractTimelineEvents(content) {
        const events = [];
        
        // Look for time indicators
        const timePatterns = [
            /(?:hours?|days?|weeks?|months?|years?)\s+(?:ago|later|before|after)/gi,
            /(?:yesterday|today|tomorrow|tonight|morning|afternoon|evening)/gi,
            /(?:suddenly|meanwhile|then|next|finally|afterwards)/gi
        ];
        
        timePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                events.push({
                    timeMarker: match[0],
                    context: content.substring(Math.max(0, match.index - 50), match.index + 50)
                });
            }
        });
        
        return events;
    }

    /**
     * Catalog established world-building facts (simplified implementation)
     */
    extractEstablishedFacts(content) {
        const facts = new Map();
        
        // Look for technology, locations, and world-building elements
        const factPatterns = [
            /(?:the|a|an)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:facility|building|ship|station|device|system)/gi,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Corporation|Company|Guild|Alliance|Federation)/gi
        ];
        
        factPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const factName = match[1];
                facts.set(factName, {
                    type: 'worldbuilding',
                    context: match[0]
                });
            }
        });
        
        return facts;
    }

    /**
     * Identify setups that need future payoff (simplified implementation)
     */
    extractForeshadowing(content) {
        const foreshadowing = new Set();
        
        // Look for setup phrases
        const setupPatterns = [
            /(?:little did|unknown to|unaware that|secretly|hidden|mysterious)/gi,
            /(?:would later|destined to|fate would|soon would)/gi
        ];
        
        setupPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => foreshadowing.add(match));
            }
        });
        
        return foreshadowing;
    }

    /**
     * Extract conflicts and tensions (simplified implementation)
     */
    extractConflicts(content) {
        const conflicts = new Map();
        
        // Look for conflict indicators
        const conflictKeywords = ['argued', 'disagreed', 'opposed', 'conflict', 'tension', 'dispute'];
        
        conflictKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = content.match(regex);
            if (matches) {
                conflicts.set(keyword, matches.length);
            }
        });
        
        return conflicts;
    }

    /**
     * Extract abilities and powers mentioned (simplified implementation)
     */
    extractAbilities(content) {
        const abilities = new Map();
        
        // Look for ability-related terms
        const abilityPatterns = [
            /(?:ability to|power to|skill in|talent for)\s+([a-z\s]+)/gi,
            /(?:nanites?|tech|magic|psionics?|abilities?|powers?)/gi
        ];
        
        abilityPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                abilities.set(match[0], {
                    type: 'ability',
                    context: match[0]
                });
            }
        });
        
        return abilities;
    }

    /**
     * Get relevant continuity elements for current chapter
     */
    getRelevantContinuityElements(chapterOutline) {
        // For now, return a summary of what we've tracked
        return {
            characters: this.storyBible.characters,
            plotThreads: this.storyBible.plotThreads,
            facts: this.storyBible.establishedFacts,
            timeline: this.storyBible.timeline.slice(-5), // Last 5 timeline events
            foreshadowing: this.storyBible.pendingPayoffs
        };
    }

    /**
     * Format elements for AI prompt
     */
    formatCharacterConsistency(characters) {
        if (characters.size === 0) return 'No established characters yet.';
        
        const entries = Array.from(characters.entries()).slice(0, 10); // Limit to avoid token bloat
        return entries.map(([name, details]) => 
            `${name}: Appeared ${details.appearances || 1} time(s)`
        ).join('\n');
    }

    formatPlotThreads(threads) {
        if (threads.size === 0) return 'No established plot threads yet.';
        
        const entries = Array.from(threads.entries()).slice(0, 8);
        return entries.map(([thread, data]) =>
            `${thread}: Mentioned ${data.mentions || 1} time(s)`
        ).join('\n');
    }

    formatEstablishedFacts(facts) {
        if (facts.size === 0) return 'No established facts yet.';
        
        const entries = Array.from(facts.entries()).slice(0, 8);
        return entries.map(([fact, data]) =>
            `${fact}: ${data.type || 'worldbuilding element'}`
        ).join('\n');
    }

    formatTimelineContext(timeline) {
        if (timeline.length === 0) return 'No timeline context yet.';
        
        return timeline.slice(-3).map(event => 
            `${event.timeMarker}: ${event.context}`
        ).join('\n');
    }

    formatForeshadowing(foreshadowing) {
        if (foreshadowing.size === 0) return 'No unresolved elements yet.';
        
        return Array.from(foreshadowing).slice(0, 5).join(', ');
    }

    /**
     * Validate character consistency (simplified implementation)
     */
    checkCharacterConsistency(content, chapterNumber) {
        const issues = [];
        
        // Check if major characters are still being referenced
        const chapterCharacters = this.extractCharacterReferences(content);
        const establishedCharacters = this.storyBible.characters;
        
        // Flag if major characters disappear without explanation
        for (const [name, data] of establishedCharacters) {
            if (data.appearances > 3 && !chapterCharacters.has(name) && chapterNumber > 5) {
                issues.push({
                    type: 'character_disappearance',
                    description: `Major character ${name} hasn't appeared recently`,
                    severity: 'warning',
                    character: name
                });
            }
        }
        
        return issues;
    }

    /**
     * Validate plot thread continuity (simplified implementation)
     */
    checkPlotContinuity(content, chapterNumber) {
        const issues = [];
        
        // Check if important plot threads are being maintained
        const chapterThreads = this.extractPlotThreads(content);
        const establishedThreads = this.storyBible.plotThreads;
        
        // Simple check: if we're past chapter 10 and no plot advancement
        if (chapterNumber > 10 && chapterThreads.size === 0) {
            issues.push({
                type: 'plot_stagnation',
                description: 'Chapter lacks plot advancement or thread development',
                severity: 'warning'
            });
        }
        
        return issues;
    }

    /**
     * Validate timeline coherence (simplified implementation)
     */
    checkTimelineCoherence(content, chapterNumber) {
        const issues = [];
        
        // Basic timeline check - look for conflicting time references
        const timeEvents = this.extractTimelineEvents(content);
        
        if (timeEvents.length === 0 && chapterNumber > 3) {
            issues.push({
                type: 'timeline_unclear',
                description: 'Chapter lacks clear time progression indicators',
                severity: 'info'
            });
        }
        
        return issues;
    }

    /**
     * Validate fact consistency (simplified implementation)
     */
    checkFactConsistency(content, chapterNumber) {
        const issues = [];
        
        // Check for contradictory world-building facts
        const chapterFacts = this.extractEstablishedFacts(content);
        
        // This would be enhanced with more sophisticated checking
        return issues;
    }

    /**
     * Generate specific suggestions for fixing issues
     */
    generateFixSuggestions(issues) {
        return issues.map(issue => {
            switch (issue.type) {
                case 'character_disappearance':
                    return {
                        problem: issue.description,
                        suggestion: `Consider mentioning ${issue.character} or explaining their absence`,
                        severity: issue.severity
                    };
                case 'plot_stagnation':
                    return {
                        problem: issue.description,
                        suggestion: 'Add plot development, character decisions, or story progression',
                        severity: issue.severity
                    };
                case 'timeline_unclear':
                    return {
                        problem: issue.description,
                        suggestion: 'Add time markers like "hours later", "the next day", etc.',
                        severity: issue.severity
                    };
                default:
                    return {
                        problem: issue.description,
                        suggestion: 'Review and address the noted inconsistency',
                        severity: issue.severity
                    };
            }
        });
    }

    /**
     * Update story bible with new chapter information
     */
    updateStoryBible(chapterAnalysis, chapterNumber) {
        // Update character tracking
        for (const [name, data] of chapterAnalysis.characters) {
            const existing = this.storyBible.characters.get(name) || { appearances: 0 };
            this.storyBible.characters.set(name, {
                ...existing,
                appearances: existing.appearances + data.appearances,
                lastChapter: chapterNumber
            });
        }
        
        // Update plot threads
        for (const [thread, data] of chapterAnalysis.plotThreads) {
            const existing = this.storyBible.plotThreads.get(thread) || { mentions: 0 };
            this.storyBible.plotThreads.set(thread, {
                ...existing,
                mentions: existing.mentions + data.mentions,
                lastChapter: chapterNumber
            });
        }
        
        // Update established facts
        for (const [fact, data] of chapterAnalysis.establishedFacts) {
            this.storyBible.establishedFacts.set(fact, {
                ...data,
                establishedInChapter: chapterNumber
            });
        }
        
        // Update timeline
        chapterAnalysis.timelineEvents.forEach(event => {
            this.storyBible.timeline.push({
                ...event,
                chapter: chapterNumber
            });
        });
        
        // Update pending payoffs
        chapterAnalysis.foreshadowing.forEach(item => {
            this.storyBible.pendingPayoffs.add({
                element: item,
                introducedInChapter: chapterNumber
            });
        });
        
        // Emit updated story bible
        emitStoryBibleUpdate(this.jobId, {
            type: 'bibleUpdated',
            chapterNumber,
            storyBible: this.getStoryBibleSummary()
        });
    }

    /**
     * Get a summary of the story bible for display
     */
    getStoryBibleSummary() {
        return {
            characterCount: this.storyBible.characters.size,
            plotThreadCount: this.storyBible.plotThreads.size,
            establishedFactCount: this.storyBible.establishedFacts.size,
            timelineEventCount: this.storyBible.timeline.length,
            pendingPayoffCount: this.storyBible.pendingPayoffs.size,
            topCharacters: Array.from(this.storyBible.characters.entries())
                .sort((a, b) => b[1].appearances - a[1].appearances)
                .slice(0, 5)
                .map(([name, data]) => ({ name, appearances: data.appearances })),
            activeThreads: Array.from(this.storyBible.plotThreads.entries())
                .sort((a, b) => b[1].mentions - a[1].mentions)
                .slice(0, 5)
                .map(([thread, data]) => ({ thread, mentions: data.mentions }))
        };
    }

    /**
     * Summarize new elements added in this analysis
     */
    summarizeNewElements(analysis) {
        return {
            newCharacters: Array.from(analysis.characters.keys()),
            newPlotElements: Array.from(analysis.plotThreads.keys()),
            newFacts: Array.from(analysis.establishedFacts.keys()),
            timelineEvents: analysis.timelineEvents.length,
            foreshadowingElements: analysis.foreshadowing.size
        };
    }

    /**
     * Get full continuity report for completed novel
     */
    getFullContinuityReport() {
        return {
            storyBible: {
                characters: Object.fromEntries(this.storyBible.characters),
                plotThreads: Object.fromEntries(this.storyBible.plotThreads),
                establishedFacts: Object.fromEntries(this.storyBible.establishedFacts),
                timeline: this.storyBible.timeline,
                pendingPayoffs: Array.from(this.storyBible.pendingPayoffs)
            },
            analysisHistory: this.analysisHistory,
            continuityIssues: this.continuityIssues,
            summary: this.getStoryBibleSummary()
        };
    }
}

module.exports = ContinuityGuardian;

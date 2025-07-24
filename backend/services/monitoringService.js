const { 
  emitStoryBibleUpdate,
  emitQualityMetrics,
  emitContinuityAlert,
  emitAIDecision 
} = require('../websocket');

class MonitoringService {
  constructor() {
    // Track monitoring data per job
    this.jobMonitoring = new Map();
  }

  initializeJob(jobId) {
    this.jobMonitoring.set(jobId, {
      storyBible: {
        characters: {},
        plotThreads: [],
        timeline: [],
        locations: {},
        themes: []
      },
      qualityMetrics: {
        humanLikenessScore: 0,
        complexityScore: 0,
        consistencyScore: 0,
        creativityScore: 0
      },
      continuityAlerts: [],
      aiDecisions: []
    });
  }

  // Track AI decision making process
  logAIDecision(jobId, decision) {
    const monitoring = this.jobMonitoring.get(jobId);
    if (!monitoring) return;

    const decisionEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: decision.type || 'general',
      context: decision.context || '',
      reasoning: decision.reasoning || '',
      choice: decision.choice || '',
      alternatives: decision.alternatives || [],
      confidence: decision.confidence || 0.5,
      chapter: decision.chapter || null
    };

    monitoring.aiDecisions.push(decisionEntry);
    
    // Keep only last 50 decisions to prevent memory bloat
    if (monitoring.aiDecisions.length > 50) {
      monitoring.aiDecisions = monitoring.aiDecisions.slice(-50);
    }

    // Emit to frontend
    emitAIDecision(jobId, decisionEntry);
  }

  // Update story bible with new information
  updateStoryBible(jobId, updates) {
    const monitoring = this.jobMonitoring.get(jobId);
    if (!monitoring) return;

    const { storyBible } = monitoring;

    // Update characters
    if (updates.characters) {
      Object.assign(storyBible.characters, updates.characters);
    }

    // Add plot threads
    if (updates.plotThreads) {
      updates.plotThreads.forEach(thread => {
        const existing = storyBible.plotThreads.find(t => t.id === thread.id);
        if (existing) {
          Object.assign(existing, thread);
        } else {
          storyBible.plotThreads.push({
            id: thread.id || Date.now().toString(),
            ...thread,
            timestamp: Date.now()
          });
        }
      });
    }

    // Add timeline events
    if (updates.timeline) {
      updates.timeline.forEach(event => {
        storyBible.timeline.push({
          id: Date.now().toString(),
          ...event,
          timestamp: Date.now()
        });
      });
    }

    // Update locations
    if (updates.locations) {
      Object.assign(storyBible.locations, updates.locations);
    }

    // Update themes
    if (updates.themes) {
      updates.themes.forEach(theme => {
        const existing = storyBible.themes.find(t => t.name === theme.name);
        if (existing) {
          Object.assign(existing, theme);
        } else {
          storyBible.themes.push(theme);
        }
      });
    }

    // Emit to frontend
    emitStoryBibleUpdate(jobId, storyBible);
  }

  // Update quality metrics
  updateQualityMetrics(jobId, metrics) {
    const monitoring = this.jobMonitoring.get(jobId);
    if (!monitoring) return;

    Object.assign(monitoring.qualityMetrics, metrics);

    // Emit to frontend
    emitQualityMetrics(jobId, monitoring.qualityMetrics);
  }

  // Add continuity alert
  addContinuityAlert(jobId, alert) {
    const monitoring = this.jobMonitoring.get(jobId);
    if (!monitoring) return;

    const alertEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      severity: alert.severity || 'info',
      type: alert.type || 'general',
      message: alert.message || '',
      chapter: alert.chapter || null,
      details: alert.details || {},
      resolved: false
    };

    monitoring.continuityAlerts.push(alertEntry);

    // Keep only last 20 alerts
    if (monitoring.continuityAlerts.length > 20) {
      monitoring.continuityAlerts = monitoring.continuityAlerts.slice(-20);
    }

    // Emit to frontend
    emitContinuityAlert(jobId, alertEntry);
  }

  // Get all monitoring data for a job
  getJobMonitoring(jobId) {
    return this.jobMonitoring.get(jobId) || {
      storyBible: { characters: {}, plotThreads: [], timeline: [], locations: {}, themes: [] },
      qualityMetrics: { humanLikenessScore: 0, complexityScore: 0, consistencyScore: 0, creativityScore: 0 },
      continuityAlerts: [],
      aiDecisions: []
    };
  }

  // Clean up job data when complete
  cleanupJob(jobId) {
    this.jobMonitoring.delete(jobId);
  }

  // Helper methods for common AI decision tracking
  logCharacterDecision(jobId, character, reasoning, choice, chapter = null) {
    this.logAIDecision(jobId, {
      type: 'character-development',
      context: `Character: ${character}`,
      reasoning,
      choice,
      chapter
    });
  }

  logPlotDecision(jobId, plotElement, reasoning, choice, chapter = null) {
    this.logAIDecision(jobId, {
      type: 'plot-choice',
      context: `Plot: ${plotElement}`,
      reasoning,
      choice,
      chapter
    });
  }

  logDialogueDecision(jobId, context, reasoning, choice, chapter = null) {
    this.logAIDecision(jobId, {
      type: 'dialogue-style',
      context,
      reasoning,
      choice,
      chapter
    });
  }

  logEnhancementDecision(jobId, enhancement, reasoning, choice, chapter = null) {
    this.logAIDecision(jobId, {
      type: 'enhancement-application',
      context: `Enhancement: ${enhancement}`,
      reasoning,
      choice,
      chapter
    });
  }
}

// Export singleton instance
module.exports = new MonitoringService();

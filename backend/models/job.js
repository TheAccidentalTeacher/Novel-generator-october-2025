const mongoose = require('mongoose');

const outlineChapterSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  keyEvents: {
    type: [String],
    required: true
  },
  characterFocus: {
    type: [String],
    required: true
  },
  plotAdvancement: {
    type: String,
    required: true
  },
  wordTarget: {
    type: Number,
    required: true
  },
  genreElements: {
    type: [String],
    required: true
  }
});

const chapterSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  },
  qualityScore: {
    type: Number,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  tokensUsed: Number,
  cost: Number,
  attempts: Number
});

const jobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['planning', 'outlining', 'writing', 'completed', 'failed', 'recovering'],
    default: 'planning',
    required: true,
    index: true
  },
  currentPhase: {
    type: String,
    enum: ['premise_analysis', 'outline_generation', 'chapter_writing', 'quality_validation', 'finalization'],
    default: 'premise_analysis',
    required: true
  },
  
  // Story data
  premise: { 
    type: String, 
    maxLength: 10000,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  subgenre: {
    type: String,
    required: true
  },
  targetWordCount: {
    type: Number,
    required: true,
    min: 20000,
    max: 200000
  },
  targetChapters: {
    type: Number,
    required: true,
    min: 5,
    max: 50
  },
  
  // Generated content
  outline: [outlineChapterSchema],
  chapters: [chapterSchema],
  
  // Model usage tracking
  modelUsage: {
    outlineGeneration: {
      model: String,
      tokensUsed: Number,
      cost: Number,
      duration: Number
    },
    chapterGeneration: {
      model: String,
      tokensUsed: Number,
      cost: Number,
      duration: Number
    }
  },
  
  // Progress tracking
  progress: {
    outlineComplete: {
      type: Boolean,
      default: false
    },
    chaptersCompleted: {
      type: Number,
      default: 0
    },
    totalChapters: {
      type: Number,
      required: true
    },
    estimatedCompletion: Date,
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  
  // Quality metrics
  qualityMetrics: {
    averageChapterLength: Number,
    genreAdherence: Number,
    characterConsistency: Number,
    plotContinuity: Number
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: Date
});

// Add indexes for performance
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ status: 1, updatedAt: -1 });

// Add pre-save hook to update timestamps
jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Job', jobSchema);

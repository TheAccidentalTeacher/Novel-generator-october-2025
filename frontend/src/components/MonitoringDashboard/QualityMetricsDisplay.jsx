import './QualityMetricsDisplay.css';

function QualityMetricsDisplay({ metrics, compact = false }) {
  const formatScore = (score) => {
    if (typeof score !== 'number') return '0';
    return Math.round(score * 100);
  };

  const getScoreColor = (score) => {
    const percentage = score * 100;
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#ffc107';
    if (percentage >= 40) return '#fd7e14';
    return '#dc3545';
  };

  const getScoreGrade = (score) => {
    const percentage = score * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const metricDefinitions = {
    humanLikenessScore: {
      name: 'Human-Like Writing',
      description: 'How naturally human the writing feels',
      icon: '👤'
    },
    complexityScore: {
      name: 'Narrative Complexity',
      description: 'Depth of character development and plot intricacies',
      icon: '🧩'
    },
    consistencyScore: {
      name: 'Story Consistency',
      description: 'Continuity of characters, plot, and world-building',
      icon: '🎯'
    },
    creativityScore: {
      name: 'Creative Innovation',
      description: 'Originality and unexpected storytelling elements',
      icon: '✨'
    }
  };

  const calculateOverallScore = () => {
    const scores = Object.values(metrics).filter(score => typeof score === 'number');
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const overallScore = calculateOverallScore();

  if (compact) {
    return (
      <div className="quality-metrics-display compact">
        <div className="overall-score">
          <div className="score-circle" style={{ borderColor: getScoreColor(overallScore) }}>
            <span className="score-value">{formatScore(overallScore)}</span>
            <span className="score-grade">{getScoreGrade(overallScore)}</span>
          </div>
          <span className="overall-label">Overall Quality</span>
        </div>
        <div className="compact-metrics">
          {Object.entries(metrics).map(([key, score]) => {
            const def = metricDefinitions[key];
            if (!def) return null;
            return (
              <div key={key} className="compact-metric">
                <span className="metric-icon">{def.icon}</span>
                <span className="metric-score" style={{ color: getScoreColor(score) }}>
                  {formatScore(score)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="quality-metrics-display">
      <div className="metrics-header">
        <h2>Quality Metrics</h2>
        <div className="overall-score-large">
          <div 
            className="score-ring" 
            style={{ 
              background: `conic-gradient(${getScoreColor(overallScore)} ${overallScore * 360}deg, #e9ecef 0deg)` 
            }}
          >
            <div className="score-inner">
              <span className="score-number">{formatScore(overallScore)}</span>
              <span className="score-percent">%</span>
              <span className="score-letter">{getScoreGrade(overallScore)}</span>
            </div>
          </div>
          <span className="overall-title">Overall Quality Score</span>
        </div>
      </div>

      <div className="metrics-grid">
        {Object.entries(metrics).map(([key, score]) => {
          const def = metricDefinitions[key];
          if (!def) return null;
          
          return (
            <div key={key} className="metric-card">
              <div className="metric-header">
                <span className="metric-icon-large">{def.icon}</span>
                <div className="metric-info">
                  <h3>{def.name}</h3>
                  <p>{def.description}</p>
                </div>
              </div>
              
              <div className="metric-score-section">
                <div className="score-bar-container">
                  <div 
                    className="score-bar" 
                    style={{ 
                      width: `${formatScore(score)}%`,
                      backgroundColor: getScoreColor(score)
                    }}
                  ></div>
                </div>
                <div className="score-details">
                  <span className="score-percentage">{formatScore(score)}%</span>
                  <span className="score-grade-badge" style={{ backgroundColor: getScoreColor(score) }}>
                    {getScoreGrade(score)}
                  </span>
                </div>
              </div>

              <div className="metric-insights">
                {score >= 0.9 && (
                  <div className="insight excellent">
                    Exceptional performance in this area
                  </div>
                )}
                {score >= 0.7 && score < 0.9 && (
                  <div className="insight good">
                    Strong performance with room for enhancement
                  </div>
                )}
                {score >= 0.5 && score < 0.7 && (
                  <div className="insight fair">
                    Adequate performance, could be improved
                  </div>
                )}
                {score < 0.5 && (
                  <div className="insight poor">
                    Needs significant improvement
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="metrics-summary">
        <h3>Quality Insights</h3>
        <div className="insights-grid">
          <div className="insight-item">
            <strong>Strengths:</strong>
            <span>
              {Object.entries(metrics)
                .filter(([_, score]) => score >= 0.8)
                .map(([key, _]) => metricDefinitions[key]?.name)
                .filter(Boolean)
                .join(', ') || 'Building quality foundations'}
            </span>
          </div>
          <div className="insight-item">
            <strong>Focus Areas:</strong>
            <span>
              {Object.entries(metrics)
                .filter(([_, score]) => score < 0.7)
                .map(([key, _]) => metricDefinitions[key]?.name)
                .filter(Boolean)
                .join(', ') || 'All areas performing well'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QualityMetricsDisplay;

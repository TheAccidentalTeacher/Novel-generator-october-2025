import { useState, useEffect } from 'react';
import './AIDecisionStream.css';

function AIDecisionStream({ decisions, jobId }) {
  const [filter, setFilter] = useState('all');
  const [expandedDecision, setExpandedDecision] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (decisions) {
      setData(decisions);
    } else if (jobId) {
      // Fetch decisions data for this job
      setLoading(true);
      fetch(`/api/monitor/ai-decisions/${jobId}`)
        .then(res => res.json())
        .then(result => {
          setData(result.decisions || []);
        })
        .catch(err => {
          console.error('Failed to fetch AI decisions:', err);
          setData([]);
        })
        .finally(() => setLoading(false));
    } else {
      setData([]);
    }
  }, [decisions, jobId]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getDecisionTypeIcon = (type) => {
    switch (type) {
      case 'character-development': return '👥';
      case 'plot-choice': return '🎭';
      case 'dialogue-style': return '💭';
      case 'scene-setting': return '🎬';
      case 'enhancement-application': return '⚡';
      case 'continuity-check': return '🔍';
      default: return '🤖';
    }
  };

  if (loading) {
    return (
      <div className="ai-decision-stream">
        <div className="loading-state">Loading AI decisions...</div>
      </div>
    );
  }

  const decisionsData = data || [];
  
  const filteredDecisions = decisionsData.filter(decision => {
    if (filter === 'all') return true;
    return decision.type === filter;
  });

  const decisionTypes = [...new Set(decisionsData.map(d => d.type))];

  return (
    <div className="ai-decision-stream">
      <div className="stream-header">
        <h2>AI Decision Stream</h2>
        <p>Real-time view of AI reasoning and decision-making process</p>
      </div>

      {decisionsData.length === 0 ? (
        <div className="empty-state">
          <div className="thinking-icon">🤖</div>
          <h3>No Decisions Logged Yet</h3>
          <p>AI decisions will appear here as the generation process begins.</p>
        </div>
      ) : (
        <>
          <div className="stream-filters">
            <button 
              className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('all')}
            >
              All ({decisionsData.length})
            </button>
            {decisionTypes.map(type => {
              const count = decisionsData.filter(d => d.type === type).length;
              return (
                <button 
                  key={type}
                  className={filter === type ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter(type)}
                >
                  {getDecisionTypeIcon(type)} {type} ({count})
                </button>
              );
            })}
          </div>

          <div className="decisions-stream">
            {filteredDecisions.map((decision) => (
              <div key={decision.id} className="decision-item">
                <div className="decision-header">
                  <div className="decision-type">
                    <span className="type-icon">{getDecisionTypeIcon(decision.type)}</span>
                    <span className="type-name">{decision.type}</span>
                  </div>
                  <div className="decision-meta">
                    <span className="decision-time">{formatTimestamp(decision.timestamp)}</span>
                    {decision.confidence && (
                      <span className="confidence-score">
                        {Math.round(decision.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>

                <div className="decision-content">
                  <div className="decision-summary">{decision.summary}</div>
                  
                  {decision.reasoning && (
                    <div className="decision-reasoning">
                      <strong>Reasoning:</strong> {decision.reasoning}
                    </div>
                  )}

                  {decision.alternatives && decision.alternatives.length > 0 && (
                    <button 
                      className="expand-btn"
                      onClick={() => setExpandedDecision(
                        expandedDecision === decision.id ? null : decision.id
                      )}
                    >
                      {expandedDecision === decision.id ? 'Hide' : 'Show'} alternatives
                    </button>
                  )}

                  {expandedDecision === decision.id && decision.alternatives && (
                    <div className="decision-alternatives">
                      <h4>Considered Alternatives:</h4>
                      <ul>
                        {decision.alternatives.map((alt, idx) => (
                          <li key={idx}>
                            <strong>{alt.option}:</strong> {alt.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {decision.impact && (
                    <div className="decision-impact">
                      <strong>Expected Impact:</strong> {decision.impact}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AIDecisionStream;

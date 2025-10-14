import './CostTrackingDisplay.css';

function CostTrackingDisplay({ tracking, compact = false }) {
  const formatCost = (cost) => {
    if (typeof cost !== 'number') return '$0.00';
    return `$${cost.toFixed(3)}`;
  };

  const formatTokens = (tokens) => {
    if (typeof tokens !== 'number') return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (compact) {
    return (
      <div className="cost-tracking-display compact">
        <div className="cost-summary">
          <div className="total-cost">
            <span className="cost-label">Total Cost</span>
            <span className="cost-value">{formatCost(tracking.totalCost)}</span>
          </div>
          <div className="tokens-used">
            <span className="tokens-label">Tokens</span>
            <span className="tokens-value">{formatTokens(tracking.tokensUsed)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cost-tracking-display">
      <h2>Cost Tracking</h2>
      
      <div className="cost-overview">
        <div className="cost-card total">
          <h3>Total Cost</h3>
          <div className="cost-amount">{formatCost(tracking.totalCost)}</div>
        </div>
        
        <div className="cost-card tokens">
          <h3>Tokens Used</h3>
          <div className="token-amount">{formatTokens(tracking.tokensUsed)}</div>
        </div>
        
        {tracking.estimatedRemaining > 0 && (
          <div className="cost-card estimate">
            <h3>Estimated Remaining</h3>
            <div className="estimate-amount">{formatCost(tracking.estimatedRemaining)}</div>
          </div>
        )}
      </div>

      {tracking.breakdown && (
        <div className="cost-breakdown">
          <h3>Cost Breakdown</h3>
          <div className="breakdown-list">
            <div className="breakdown-item">
              <span>Analysis Phase</span>
              <span>{formatCost(tracking.breakdown.analysis)}</span>
            </div>
            <div className="breakdown-item">
              <span>Outline Phase</span>
              <span>{formatCost(tracking.breakdown.outline)}</span>
            </div>
            <div className="breakdown-item">
              <span>Chapter Generation</span>
              <span>{formatCost(tracking.breakdown.chapters)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostTrackingDisplay;

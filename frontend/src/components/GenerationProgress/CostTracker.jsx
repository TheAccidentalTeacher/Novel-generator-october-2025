import '../../styles/CostTracker.css';

function CostTracker({ outlineGeneration, chapterGeneration }) {
  // Calculate total cost
  const outlineCost = outlineGeneration?.cost || 0;
  const chapterCost = chapterGeneration?.cost || 0;
  const totalCost = outlineCost + chapterCost;
  
  // Format costs
  const formatCost = (cost) => {
    return `$${cost.toFixed(4)}`;
  };
  
  // Calculate token usage
  const outlineTokens = outlineGeneration?.tokensUsed || 0;
  const chapterTokens = chapterGeneration?.tokensUsed || 0;
  const totalTokens = outlineTokens + chapterTokens;

  return (
    <div className="cost-tracker">
      <h3>Cost & Usage Tracking</h3>
      
      <div className="cost-grid">
        <div className="cost-label">Outline Generation:</div>
        <div className="cost-value">{formatCost(outlineCost)}</div>
        <div className="cost-tokens">{outlineTokens.toLocaleString()} tokens</div>
        
        <div className="cost-label">Chapter Generation:</div>
        <div className="cost-value">{formatCost(chapterCost)}</div>
        <div className="cost-tokens">{chapterTokens.toLocaleString()} tokens</div>
        
        <div className="cost-label total">Total:</div>
        <div className="cost-value total">{formatCost(totalCost)}</div>
        <div className="cost-tokens total">{totalTokens.toLocaleString()} tokens</div>
      </div>
    </div>
  );
}

export default CostTracker;

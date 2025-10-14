import '../../styles/ProgressPhase.css';

function ProgressPhase({ phase, currentPhase, status, description }) {
  // Map phase names to their corresponding API phase values
  const phaseMapping = {
    'planning': 'premise_analysis',
    'outlining': 'outline_generation',
    'writing': 'chapter_writing'
  };
  
  const apiPhase = phaseMapping[phase];
  
  // Determine the status of this phase
  let phaseStatus = 'pending';
  
  if (currentPhase === apiPhase) {
    phaseStatus = 'active';
  } else if (
    (apiPhase === 'premise_analysis' && ['outline_generation', 'chapter_writing'].includes(currentPhase)) ||
    (apiPhase === 'outline_generation' && currentPhase === 'chapter_writing') ||
    status === 'completed'
  ) {
    phaseStatus = 'completed';
  }

  return (
    <div className={`progress-phase ${phaseStatus}`}>
      <div className="phase-icon">
        {phaseStatus === 'completed' ? '✓' : phaseStatus === 'active' ? '•' : '○'}
      </div>
      <div className="phase-content">
        <h3 className="phase-title">{phase.charAt(0).toUpperCase() + phase.slice(1)}</h3>
        <p className="phase-description">{description}</p>
      </div>
    </div>
  );
}

export default ProgressPhase;

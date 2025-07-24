import './GenerationProgressMonitor.css';

function GenerationProgressMonitor({ progress }) {
  const formatTimeRemaining = (timeMs) => {
    if (!timeMs) return 'Calculating...';
    const minutes = Math.ceil(timeMs / 60000);
    if (minutes < 60) return `${minutes}m remaining`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  };

  const getLastActivity = () => {
    if (!progress.lastActivity) return 'No recent activity';
    const diff = Date.now() - progress.lastActivity;
    if (diff < 60000) return 'Active now';
    if (diff < 300000) return `${Math.floor(diff / 60000)}m ago`;
    return 'Idle';
  };

  return (
    <div className="generation-progress-monitor">
      <div className="progress-header">
        <div className="current-step">
          <strong>{progress.currentStep || 'Waiting to start...'}</strong>
        </div>
        <div className="last-activity">
          {getLastActivity()}
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar"
          style={{ width: `${progress.percentage || 0}%` }}
        ></div>
        <span className="progress-text">{progress.percentage || 0}%</span>
      </div>
      
      {progress.estimatedTimeRemaining && (
        <div className="time-estimate">
          {formatTimeRemaining(progress.estimatedTimeRemaining)}
        </div>
      )}
    </div>
  );
}

export default GenerationProgressMonitor;

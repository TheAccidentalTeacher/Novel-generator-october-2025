import './EnhancementsLog.css';

function EnhancementsLog({ enhancements, compact = false }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getEnhancementIcon = (type) => {
    switch (type) {
      case 'character': return '👤';
      case 'dialogue': return '💬';
      case 'plot': return '📖';
      case 'style': return '✍️';
      case 'world': return '🌍';
      default: return '⚡';
    }
  };

  if (compact) {
    return (
      <div className="enhancements-log compact">
        {enhancements.length === 0 ? (
          <div className="no-enhancements">No enhancements applied yet</div>
        ) : (
          <div className="compact-list">
            {enhancements.map((enhancement) => (
              <div key={enhancement.id} className="compact-enhancement">
                <span className="enhancement-icon">
                  {getEnhancementIcon(enhancement.type)}
                </span>
                <span className="enhancement-text">{enhancement.description}</span>
                <span className="enhancement-time">
                  {formatTimestamp(enhancement.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="enhancements-log">
      <h2>Applied Enhancements</h2>
      
      {enhancements.length === 0 ? (
        <div className="empty-state">
          <p>No enhancements have been applied yet. Enhancements will appear here as the AI applies human-like writing techniques.</p>
        </div>
      ) : (
        <div className="enhancements-list">
          {enhancements.map((enhancement) => (
            <div key={enhancement.id} className="enhancement-item">
              <div className="enhancement-header">
                <span className="enhancement-icon-large">
                  {getEnhancementIcon(enhancement.type)}
                </span>
                <div className="enhancement-info">
                  <h4>{enhancement.name || 'Enhancement Applied'}</h4>
                  <span className="enhancement-timestamp">
                    {formatTimestamp(enhancement.timestamp)}
                  </span>
                </div>
              </div>
              <div className="enhancement-description">
                {enhancement.description}
              </div>
              {enhancement.details && (
                <div className="enhancement-details">
                  {enhancement.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EnhancementsLog;

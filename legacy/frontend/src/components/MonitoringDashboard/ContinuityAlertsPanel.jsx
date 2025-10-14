import { useState, useEffect } from 'react';
import './ContinuityAlertsPanel.css';

function ContinuityAlertsPanel({ alerts, jobId, compact = false }) {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (alerts) {
      setData(alerts);
    } else if (jobId) {
      // Fetch alerts data for this job
      setLoading(true);
      fetch(`/api/monitor/continuity-alerts/${jobId}`)
        .then(res => res.json())
        .then(result => {
          setData(result.alerts || []);
        })
        .catch(err => {
          console.error('Failed to fetch continuity alerts:', err);
          setData([]);
        })
        .finally(() => setLoading(false));
    } else {
      setData([]);
    }
  }, [alerts, jobId]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="continuity-alerts-panel">
        <div className="loading-state">Loading continuity alerts...</div>
      </div>
    );
  }

  const alertsData = data || [];
  
  const filteredAlerts = alertsData.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  const alertCounts = alertsData.reduce((counts, alert) => {
    counts[alert.severity || 'info'] = (counts[alert.severity || 'info'] || 0) + 1;
    return counts;
  }, {});

  if (compact) {
    return (
      <div className="continuity-alerts-panel compact">
        {alertsData.length === 0 ? (
          <div className="no-alerts">
            <span className="status-icon">✅</span>
            <span>No continuity issues detected</span>
          </div>
        ) : (
          <div className="compact-alerts">
            {alertsData.slice(0, 3).map((alert) => (
              <div key={alert.id} className={`compact-alert ${alert.severity || 'info'}`}>
                <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">{getRelativeTime(alert.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="continuity-alerts-panel">
      <div className="alerts-header">
        <h2>Continuity Alerts</h2>
        <div className="alerts-summary">
          <span className="total-count">{alertsData.length} total alerts</span>
          {alertsData.length > 0 && (
            <div className="severity-counts">
              {Object.entries(alertCounts).map(([severity, count]) => (
                <span 
                  key={severity} 
                  className={`severity-count ${severity}`}
                  style={{ color: getSeverityColor(severity) }}
                >
                  {getSeverityIcon(severity)} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {alertsData.length === 0 ? (
        <div className="empty-state">
          <div className="success-icon">✅</div>
          <h3>No Continuity Issues</h3>
          <p>The AI is maintaining excellent story consistency. All character details, plot threads, and timeline events are tracking correctly.</p>
        </div>
      ) : (
        <>
          <div className="alerts-filters">
            <button 
              className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('all')}
            >
              All ({alertsData.length})
            </button>
            {Object.entries(alertCounts).map(([severity, count]) => (
              <button 
                key={severity}
                className={filter === severity ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setFilter(severity)}
              >
                {getSeverityIcon(severity)} {severity} ({count})
              </button>
            ))}
          </div>

          <div className="alerts-list">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`alert-card ${alert.severity || 'info'}`}>
                <div className="alert-header">
                  <div className="alert-severity">
                    <span className="severity-icon">{getSeverityIcon(alert.severity)}</span>
                    <span className="severity-text">{alert.severity || 'Info'}</span>
                  </div>
                  <div className="alert-timestamp">
                    <span className="relative-time">{getRelativeTime(alert.timestamp)}</span>
                    <span className="absolute-time">{formatTimestamp(alert.timestamp)}</span>
                  </div>
                </div>

                <div className="alert-body">
                  <div className="alert-message">{alert.message}</div>
                  
                  {alert.details && (
                    <div className="alert-details">
                      <h4>Details:</h4>
                      <p>{alert.details}</p>
                    </div>
                  )}

                  {alert.suggestion && (
                    <div className="alert-suggestion">
                      <h4>Suggested Fix:</h4>
                      <p>{alert.suggestion}</p>
                    </div>
                  )}

                  {alert.context && (
                    <div className="alert-context">
                      <h4>Context:</h4>
                      <div className="context-info">
                        {alert.context.chapter && (
                          <span className="context-item">Chapter: {alert.context.chapter}</span>
                        )}
                        {alert.context.character && (
                          <span className="context-item">Character: {alert.context.character}</span>
                        )}
                        {alert.context.plotThread && (
                          <span className="context-item">Plot: {alert.context.plotThread}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {alert.actions && alert.actions.length > 0 && (
                  <div className="alert-actions">
                    {alert.actions.map((action, idx) => (
                      <button key={idx} className="action-btn">
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ContinuityAlertsPanel;

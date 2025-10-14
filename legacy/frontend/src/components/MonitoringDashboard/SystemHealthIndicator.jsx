import './SystemHealthIndicator.css';

function SystemHealthIndicator({ isConnected, health }) {
  const getConnectionStatus = () => {
    if (!isConnected) return { status: 'disconnected', color: '#dc3545', text: 'Disconnected' };
    if (health.status === 'generating') return { status: 'active', color: '#28a745', text: 'Live Monitoring' };
    if (health.status === 'idle') return { status: 'idle', color: '#6c757d', text: 'Connected' };
    return { status: 'unknown', color: '#ffc107', text: 'Unknown' };
  };

  const connectionInfo = getConnectionStatus();

  return (
    <div className="system-health-indicator">
      <div className="connection-status">
        <div 
          className={`status-dot ${connectionInfo.status}`}
          style={{ backgroundColor: connectionInfo.color }}
        ></div>
        <span className="status-text">{connectionInfo.text}</span>
      </div>
    </div>
  );
}

export default SystemHealthIndicator;

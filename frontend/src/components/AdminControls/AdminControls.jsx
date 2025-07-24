import { useState } from 'react';
import './AdminControls.css';

function AdminControls({ jobId }) {
  const [isKilling, setIsKilling] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [message, setMessage] = useState('');

  const killCurrentJob = async () => {
    if (!jobId) return;
    
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to cancel this generation?\n\nThis will stop the current novel generation process.'
    );
    
    if (!confirmed) return;

    setIsKilling(true);
    setMessage('');

    try {
      const response = await fetch(`/api/monitor/kill-job/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Job cancelled successfully');
        // Reload page after short delay to show cancellation
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`❌ Error: ${result.error || 'Failed to cancel job'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsKilling(false);
    }
  };

  const cleanupAllJobs = async () => {
    const confirmed = window.confirm(
      '🧹 Clean up all stuck jobs?\n\nThis will cancel any jobs that have been inactive for more than 2 hours.'
    );
    
    if (!confirmed) return;

    setIsCleaning(true);
    setMessage('');

    try {
      const response = await fetch('/api/monitor/cleanup-all-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Cleaned up ${result.cleanedJobs} stuck jobs`);
      } else {
        setMessage(`❌ Error: ${result.error || 'Failed to cleanup jobs'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="admin-controls">
      <div className="admin-header">
        <p className="admin-description">
          Quick actions for job management
        </p>
      </div>

      <div className="admin-buttons">
        <button 
          className="admin-btn kill-btn"
          onClick={killCurrentJob}
          disabled={isKilling || !jobId}
        >
          {isKilling ? '⏳ Cancelling...' : '🛑 Cancel This Job'}
        </button>

        <button 
          className="admin-btn cleanup-btn"
          onClick={cleanupAllJobs}
          disabled={isCleaning}
        >
          {isCleaning ? '⏳ Cleaning...' : '🧹 Cleanup Stuck Jobs'}
        </button>
      </div>

      {message && (
        <div className={`admin-message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="admin-info">
        <small>
          <strong>Cancel:</strong> Stops current generation<br/>
          <strong>Cleanup:</strong> Removes jobs inactive &gt;2 hours
        </small>
      </div>
    </div>
  );
}

export default AdminControls;

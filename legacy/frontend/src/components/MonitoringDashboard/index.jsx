import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNovel } from '../../context/NovelContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import StoryBibleViewer from './StoryBibleViewer';
import ContinuityAlertsPanel from './ContinuityAlertsPanel';
import CostTrackingDisplay from './CostTrackingDisplay';
import GenerationProgressMonitor from './GenerationProgressMonitor';
import EnhancementsLog from './EnhancementsLog';
import AIDecisionStream from './AIDecisionStream';
import SystemHealthIndicator from './SystemHealthIndicator';
import './MonitoringDashboard.css';

function MonitoringDashboard() {
  const { jobId } = useParams();
  const { state } = useNovel();
  const { isConnected } = useWebSocket(jobId);
  const [activeTab, setActiveTab] = useState('overview');

  const { monitoring } = state;

  // Auto-refresh effect for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to show relative timestamps
      setActiveTab(prev => prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!jobId) {
    return (
      <div className="monitoring-dashboard error">
        <h2>No Job Selected</h2>
        <p>Please select a generation job to monitor.</p>
      </div>
    );
  }

  return (
    <div className="monitoring-dashboard">
      {/* Header with connection status */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Novel Generation Monitor</h1>
          <div className="job-info">
            <span className="job-id">Job: {jobId}</span>
            <SystemHealthIndicator 
              isConnected={isConnected} 
              health={monitoring.systemHealth} 
            />
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'story-bible' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('story-bible')}
        >
          Story Bible
        </button>
        <button 
          className={activeTab === 'continuity' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('continuity')}
        >
          Continuity Alerts
          {monitoring.continuityAlerts.length > 0 && (
            <span className="alert-badge">{monitoring.continuityAlerts.length}</span>
          )}
        </button>
        <button 
          className={activeTab === 'quality' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('quality')}
        >
          Quality Metrics
        </button>
        <button 
          className={activeTab === 'cost' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('cost')}
        >
          Cost Tracking
        </button>
        <button 
          className={activeTab === 'ai-decisions' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('ai-decisions')}
        >
          AI Decisions
        </button>
      </div>

      {/* Tab content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-card">
              <h3>Generation Progress</h3>
              <GenerationProgressMonitor progress={monitoring.generationProgress} />
            </div>
            
            <div className="overview-card">
              <h3>Cost Summary</h3>
              <CostTrackingDisplay tracking={monitoring.costTracking} compact={true} />
            </div>
            
            <div className="overview-card">
              <h3>Recent Activity</h3>
              <EnhancementsLog 
                enhancements={monitoring.enhancementsApplied.slice(-5)} 
                compact={true} 
              />
            </div>
            
            {monitoring.continuityAlerts.length > 0 && (
              <div className="overview-card alert">
                <h3>Active Alerts</h3>
                <ContinuityAlertsPanel 
                  alerts={monitoring.continuityAlerts.slice(-3)} 
                  compact={true} 
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'story-bible' && (
          <StoryBibleViewer storyBible={monitoring.storyBible} />
        )}

        {activeTab === 'continuity' && (
          <ContinuityAlertsPanel alerts={monitoring.continuityAlerts} />
        )}

        {activeTab === 'cost' && (
          <CostTrackingDisplay tracking={monitoring.costTracking} />
        )}

        {activeTab === 'ai-decisions' && (
          <AIDecisionStream decisions={monitoring.aiDecisions} />
        )}
      </div>
    </div>
  );
}

export default MonitoringDashboard;

import { useState, useEffect } from 'react';
import './StoryBibleViewer.css';

function StoryBibleViewer({ storyBible, jobId }) {
  const [activeSection, setActiveSection] = useState('characters');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (storyBible) {
      setData(storyBible);
    } else if (jobId) {
      // Fetch story bible data for this job
      setLoading(true);
      fetch(`/api/monitor/story-bible/${jobId}`)
        .then(res => res.json())
        .then(result => {
          setData(result.storyBible || {});
        })
        .catch(err => {
          console.error('Failed to fetch story bible:', err);
          setData({});
        })
        .finally(() => setLoading(false));
    } else {
      setData({});
    }
  }, [storyBible, jobId]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp).toLocaleString();
  };

  const isEmpty = (obj) => {
    if (Array.isArray(obj)) return obj.length === 0;
    return Object.keys(obj || {}).length === 0;
  };

  if (loading) {
    return (
      <div className="story-bible-viewer">
        <div className="loading-state">Loading story bible...</div>
      </div>
    );
  }

  const storyBibleData = data || {};

  return (
    <div className="story-bible-viewer">
      <div className="bible-header">
        <h2>Story Bible</h2>
        <p className="bible-description">
          Real-time story consistency tracking and character development
        </p>
      </div>

      <div className="bible-nav">
        <button 
          className={activeSection === 'characters' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('characters')}
        >
          Characters ({Object.keys(storyBibleData.characters || {}).length})
        </button>
        <button 
          className={activeSection === 'plots' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('plots')}
        >
          Plot Threads ({(storyBibleData.plotThreads || []).length})
        </button>
        <button 
          className={activeSection === 'timeline' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('timeline')}
        >
          Timeline ({(storyBibleData.timeline || []).length})
        </button>
        <button 
          className={activeSection === 'locations' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('locations')}
        >
          Locations ({Object.keys(storyBibleData.locations || {}).length})
        </button>
        <button 
          className={activeSection === 'themes' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('themes')}
        >
          Themes ({(storyBibleData.themes || []).length})
        </button>
      </div>

      <div className="bible-content">
        {activeSection === 'characters' && (
          <div className="characters-section">
            {isEmpty(storyBibleData.characters) ? (
              <div className="empty-state">
                <p>No characters tracked yet. Characters will appear as the story develops.</p>
              </div>
            ) : (
              <div className="characters-grid">
                {Object.entries(storyBibleData.characters || {}).map(([name, character]) => (
                  <div key={name} className="character-card">
                    <h4>{name}</h4>
                    {character.description && (
                      <p className="character-description">{character.description}</p>
                    )}
                    {character.traits && character.traits.length > 0 && (
                      <div className="character-traits">
                        <strong>Traits:</strong>
                        <div className="traits-list">
                          {character.traits.map((trait, idx) => (
                            <span key={idx} className="trait-tag">{trait}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {character.relationships && character.relationships.length > 0 && (
                      <div className="character-relationships">
                        <strong>Relationships:</strong>
                        <ul>
                          {character.relationships.map((rel, idx) => (
                            <li key={idx}>{rel}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {character.lastSeen && (
                      <div className="last-seen">
                        <small>Last seen: Chapter {character.lastSeen}</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'plots' && (
          <div className="plots-section">
            {isEmpty(storyBibleData.plotThreads) ? (
              <div className="empty-state">
                <p>No plot threads tracked yet. Plot threads will be identified as the story progresses.</p>
              </div>
            ) : (
              <div className="plots-list">
                {(storyBibleData.plotThreads || []).map((thread, idx) => (
                  <div key={idx} className="plot-thread">
                    <h4>{thread.title || `Plot Thread ${idx + 1}`}</h4>
                    <p>{thread.description}</p>
                    <div className="thread-status">
                      <span className={`status-badge ${thread.status || 'active'}`}>
                        {thread.status || 'Active'}
                      </span>
                      {thread.introducedIn && (
                        <span className="introduced-in">
                          Introduced: Chapter {thread.introducedIn}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'timeline' && (
          <div className="timeline-section">
            {isEmpty(storyBibleData.timeline) ? (
              <div className="empty-state">
                <p>No timeline events tracked yet. Events will be recorded as they occur in the story.</p>
              </div>
            ) : (
              <div className="timeline-list">
                {(storyBibleData.timeline || []).map((event, idx) => (
                  <div key={idx} className="timeline-event">
                    <div className="event-marker"></div>
                    <div className="event-content">
                      <h4>{event.title || `Event ${idx + 1}`}</h4>
                      <p>{event.description}</p>
                      {event.chapter && (
                        <span className="event-chapter">Chapter {event.chapter}</span>
                      )}
                      {event.timestamp && (
                        <span className="event-timestamp">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'locations' && (
          <div className="locations-section">
            {isEmpty(storyBibleData.locations) ? (
              <div className="empty-state">
                <p>No locations tracked yet. Locations will be catalogued as they appear in the story.</p>
              </div>
            ) : (
              <div className="locations-grid">
                {Object.entries(storyBibleData.locations || {}).map(([name, location]) => (
                  <div key={name} className="location-card">
                    <h4>{name}</h4>
                    {location.description && (
                      <p className="location-description">{location.description}</p>
                    )}
                    {location.significance && (
                      <div className="location-significance">
                        <strong>Significance:</strong>
                        <p>{location.significance}</p>
                      </div>
                    )}
                    {location.firstMentioned && (
                      <div className="first-mentioned">
                        <small>First mentioned: Chapter {location.firstMentioned}</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'themes' && (
          <div className="themes-section">
            {isEmpty(storyBibleData.themes) ? (
              <div className="empty-state">
                <p>No themes tracked yet. Themes will be identified as they emerge in the narrative.</p>
              </div>
            ) : (
              <div className="themes-list">
                {(storyBibleData.themes || []).map((theme, idx) => (
                  <div key={idx} className="theme-item">
                    <h4>{theme.name || `Theme ${idx + 1}`}</h4>
                    {theme.description && (
                      <p className="theme-description">{theme.description}</p>
                    )}
                    {theme.examples && theme.examples.length > 0 && (
                      <div className="theme-examples">
                        <strong>Examples:</strong>
                        <ul>
                          {theme.examples.map((example, exIdx) => (
                            <li key={exIdx}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {theme.chapters && theme.chapters.length > 0 && (
                      <div className="theme-chapters">
                        <strong>Present in chapters:</strong>
                        <span className="chapter-list">
                          {theme.chapters.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryBibleViewer;

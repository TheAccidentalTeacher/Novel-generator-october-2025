import { useState } from 'react';
import './StoryBibleViewer.css';

function StoryBibleViewer({ storyBible }) {
  const [activeSection, setActiveSection] = useState('characters');

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp).toLocaleString();
  };

  const isEmpty = (obj) => {
    if (Array.isArray(obj)) return obj.length === 0;
    return Object.keys(obj).length === 0;
  };

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
          Characters ({Object.keys(storyBible.characters || {}).length})
        </button>
        <button 
          className={activeSection === 'plots' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('plots')}
        >
          Plot Threads ({(storyBible.plotThreads || []).length})
        </button>
        <button 
          className={activeSection === 'timeline' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('timeline')}
        >
          Timeline ({(storyBible.timeline || []).length})
        </button>
        <button 
          className={activeSection === 'locations' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('locations')}
        >
          Locations ({Object.keys(storyBible.locations || {}).length})
        </button>
        <button 
          className={activeSection === 'themes' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('themes')}
        >
          Themes ({(storyBible.themes || []).length})
        </button>
      </div>

      <div className="bible-content">
        {activeSection === 'characters' && (
          <div className="characters-section">
            {isEmpty(storyBible.characters) ? (
              <div className="empty-state">
                <p>No characters tracked yet. Characters will appear as the story develops.</p>
              </div>
            ) : (
              <div className="characters-grid">
                {Object.entries(storyBible.characters).map(([name, character]) => (
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
            {isEmpty(storyBible.plotThreads) ? (
              <div className="empty-state">
                <p>No plot threads tracked yet. Plot threads will be identified as the story progresses.</p>
              </div>
            ) : (
              <div className="plots-list">
                {storyBible.plotThreads.map((thread, idx) => (
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
            {isEmpty(storyBible.timeline) ? (
              <div className="empty-state">
                <p>No timeline events tracked yet. Events will be recorded as they occur in the story.</p>
              </div>
            ) : (
              <div className="timeline-list">
                {storyBible.timeline.map((event, idx) => (
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
            {isEmpty(storyBible.locations) ? (
              <div className="empty-state">
                <p>No locations tracked yet. Locations will be catalogued as they appear in the story.</p>
              </div>
            ) : (
              <div className="locations-grid">
                {Object.entries(storyBible.locations).map(([name, location]) => (
                  <div key={name} className="location-card">
                    <h4>{name}</h4>
                    {location.description && (
                      <p className="location-description">{location.description}</p>
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
            {isEmpty(storyBible.themes) ? (
              <div className="empty-state">
                <p>No themes identified yet. Themes will be extracted as the story develops.</p>
              </div>
            ) : (
              <div className="themes-list">
                {storyBible.themes.map((theme, idx) => (
                  <div key={idx} className="theme-item">
                    <h4>{theme.name || `Theme ${idx + 1}`}</h4>
                    <p>{theme.description}</p>
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

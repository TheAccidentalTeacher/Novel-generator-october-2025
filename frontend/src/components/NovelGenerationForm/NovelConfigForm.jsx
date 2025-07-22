import '../../styles/NovelConfigForm.css';

function NovelConfigForm({ targetWordCount, targetChapters, humanLikeWriting, onChange }) {
  const handleWordCountChange = (e) => {
    const value = parseInt(e.target.value);
    onChange({
      target: {
        name: 'targetWordCount',
        value: value
      }
    });
  };

  const handleChaptersChange = (e) => {
    const value = parseInt(e.target.value);
    onChange({
      target: {
        name: 'targetChapters',
        value: value
      }
    });
  };

  const handleHumanLikeChange = (e) => {
    onChange({
      target: {
        name: 'humanLikeWriting',
        value: e.target.checked
      }
    });
  };

  // Calculate average chapter length
  const avgChapterLength = Math.round(targetWordCount / targetChapters);

  return (
    <div className="novel-config-form">
      <h3>Novel Configuration</h3>
      
      <div className="form-group">
        <label htmlFor="targetWordCount">Target Word Count</label>
        <input
          type="range"
          id="targetWordCount"
          min="20000"
          max="200000"
          step="5000"
          value={targetWordCount}
          onChange={handleWordCountChange}
        />
        <div className="range-value">{targetWordCount.toLocaleString()} words</div>
      </div>
      
      <div className="form-group">
        <label htmlFor="targetChapters">Number of Chapters</label>
        <input
          type="range"
          id="targetChapters"
          min="5"
          max="50"
          step="1"
          value={targetChapters}
          onChange={handleChaptersChange}
        />
        <div className="range-value">{targetChapters} chapters</div>
      </div>

      <div className="form-group">
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="humanLikeWriting"
            checked={humanLikeWriting}
            onChange={handleHumanLikeChange}
          />
          <label htmlFor="humanLikeWriting" className="checkbox-label">
            <strong>Enhanced Human-Like Writing</strong>
            <span className="feature-description">
              Enable advanced techniques for more authentic storytelling: varied chapter structures, 
              complex characters with internal conflicts, distinctive dialogue, unresolved plot elements, 
              and organic narrative complexity.
            </span>
          </label>
        </div>
      </div>
      
      <div className="chapter-length-info">
        Average chapter length: <strong>{avgChapterLength.toLocaleString()} words</strong>
        {humanLikeWriting && <div className="human-like-note">
          ✨ Human-like writing will create varied chapter lengths and complex narrative structures
        </div>}
      </div>
    </div>
  );
}

export default NovelConfigForm;

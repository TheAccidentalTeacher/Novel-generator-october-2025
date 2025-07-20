import '../../styles/ChapterProgress.css';

function ChapterProgress({ completed, total, estimatedCompletion }) {
  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
  
  // Format estimated completion time
  let completionText = '';
  if (estimatedCompletion) {
    const estimatedDate = new Date(estimatedCompletion);
    completionText = `Estimated completion: ${estimatedDate.toLocaleTimeString()}`;
  }

  return (
    <div className="chapter-progress">
      <div className="progress-header">
        <span>Chapter Progress</span>
        <span>{completed} of {total} chapters</span>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className="progress-percentage">
        {Math.round(progressPercentage)}%
      </div>
      
      {completionText && (
        <div className="estimated-completion">
          {completionText}
        </div>
      )}
    </div>
  );
}

export default ChapterProgress;

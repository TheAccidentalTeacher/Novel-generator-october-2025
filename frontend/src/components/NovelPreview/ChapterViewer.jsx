import '../../styles/ChapterViewer.css';

function ChapterViewer({ chapter }) {
  if (!chapter) {
    return (
      <div className="chapter-viewer empty">
        <p>Select a chapter to view</p>
      </div>
    );
  }

  // Format the chapter content with proper paragraphs
  const formatContent = (content) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index}>{paragraph}</p>
    ));
  };

  return (
    <div className="chapter-viewer">
      <div className="chapter-header">
        <h2>
          <span className="chapter-number">Chapter {chapter.number}:</span>
          <span className="chapter-title">{chapter.title}</span>
        </h2>
        <div className="chapter-meta">
          <span>{chapter.wordCount} words</span>
        </div>
      </div>
      <div className="chapter-content">
        {formatContent(chapter.content)}
      </div>
    </div>
  );
}

export default ChapterViewer;

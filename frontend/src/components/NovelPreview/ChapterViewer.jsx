import { useSanitizer, SafeText } from '../../utils/sanitizer.jsx';
import '../../styles/ChapterViewer.css';

function ChapterViewer({ chapter }) {
  const { sanitizeNovelContent, escapeText } = useSanitizer();

  if (!chapter) {
    return (
      <div className="chapter-viewer empty">
        <p>Select a chapter to view</p>
      </div>
    );
  }

  // Sanitize and format chapter content with XSS protection
  const formatContent = (content) => {
    const sanitizedParagraphs = sanitizeNovelContent(content);
    
    return sanitizedParagraphs.map((paragraph) => (
      <p 
        key={paragraph.id}
        dangerouslySetInnerHTML={{ __html: paragraph.sanitized }}
      />
    ));
  };

  return (
    <div className="chapter-viewer">
      <div className="chapter-header">
        <h2>
          <span className="chapter-number">Chapter {parseInt(chapter.number)}:</span>
          <SafeText className="chapter-title">{chapter.title}</SafeText>
        </h2>
        <div className="chapter-meta">
          <span>{parseInt(chapter.wordCount || 0).toLocaleString()} words</span>
        </div>
      </div>
      <div className="chapter-content">
        {formatContent(chapter.content)}
      </div>
    </div>
  );
}

export default ChapterViewer;

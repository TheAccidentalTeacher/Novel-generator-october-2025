import '../../styles/ChapterList.css';

function ChapterList({ chapters, selectedChapter, onSelectChapter }) {
  return (
    <div className="chapter-list">
      <h2>Chapters</h2>
      <ul>
        {chapters.map(chapter => (
          <li 
            key={chapter.number}
            className={selectedChapter?.number === chapter.number ? 'selected' : ''}
            onClick={() => onSelectChapter(chapter)}
          >
            <span className="chapter-number">{chapter.number}.</span>
            <span className="chapter-title">{chapter.title}</span>
            <span className="chapter-words">{chapter.wordCount} words</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChapterList;

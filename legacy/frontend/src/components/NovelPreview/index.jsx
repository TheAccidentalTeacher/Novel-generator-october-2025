import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadNovel } from '../../services/api';
import ChapterList from './ChapterList';
import ChapterViewer from './ChapterViewer';
import DownloadOptions from './DownloadOptions';
import '../../styles/NovelPreview.css';

function NovelPreview() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [novel, setNovel] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchNovel = async () => {
      try {
        setIsLoading(true);
        const data = await downloadNovel(jobId);
        setNovel(data);
        
        // Select first chapter by default
        if (data.chapters && data.chapters.length > 0) {
          setSelectedChapter(data.chapters[0]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading novel');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNovel();
  }, [jobId]);
  
  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    
    // Scroll to top of chapter viewer on mobile
    if (window.innerWidth < 768) {
      document.querySelector('.chapter-viewer')?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const handleBackToHome = () => {
    navigate('/');
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading novel...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Novel</h2>
        <p className="error-message">{error}</p>
        <button onClick={handleBackToHome}>Back to Home</button>
      </div>
    );
  }
  
  if (!novel) {
    return (
      <div className="error-container">
        <h2>Novel Not Found</h2>
        <p>The requested novel could not be found.</p>
        <button onClick={handleBackToHome}>Back to Home</button>
      </div>
    );
  }
  
  return (
    <div className="novel-preview">
      <div className="novel-header">
        <h1>{novel.title}</h1>
        <div className="novel-meta">
          <p>Genre: {novel.genre.replace(/_/g, ' ')} ({novel.subgenre.replace(/_/g, ' ')})</p>
          <p>Chapters: {novel.chapters.length}</p>
          <p>Word Count: {novel.wordCount.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="novel-content">
        <ChapterList 
          chapters={novel.chapters}
          selectedChapter={selectedChapter}
          onSelectChapter={handleChapterSelect}
        />
        
        <ChapterViewer chapter={selectedChapter} />
      </div>
      
      <DownloadOptions novel={novel} />
    </div>
  );
}

export default NovelPreview;

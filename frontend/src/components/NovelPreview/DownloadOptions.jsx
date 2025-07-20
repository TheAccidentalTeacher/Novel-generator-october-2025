import { useState } from 'react';
import '../../styles/DownloadOptions.css';

function DownloadOptions({ novel }) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const downloadAsText = () => {
    setIsGenerating(true);
    
    try {
      // Format the novel as plain text
      let content = `${novel.title}\n\n`;
      content += `Genre: ${novel.genre.replace(/_/g, ' ')} (${novel.subgenre.replace(/_/g, ' ')})\n`;
      content += `Word Count: ${novel.wordCount.toLocaleString()}\n\n`;
      
      // Add premise
      content += `PREMISE:\n${novel.premise}\n\n`;
      content += '='.repeat(50) + '\n\n';
      
      // Add each chapter
      novel.chapters.forEach(chapter => {
        content += `\n\nCHAPTER ${chapter.number}: ${chapter.title}\n\n`;
        content += chapter.content;
      });
      
      // Create and download the file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating text file:', error);
      alert('Failed to generate text file');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const downloadAsHTML = () => {
    setIsGenerating(true);
    
    try {
      // Format the novel as HTML
      let content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${novel.title}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; margin-bottom: 10px; }
    .meta { text-align: center; margin-bottom: 40px; color: #666; }
    .premise { margin-bottom: 40px; padding: 20px; background: #f5f5f5; border-left: 4px solid #333; }
    .chapter { margin-top: 40px; page-break-before: always; }
    .chapter-title { text-align: center; margin-bottom: 20px; }
    p { margin-bottom: 20px; text-indent: 2em; }
  </style>
</head>
<body>
  <h1>${novel.title}</h1>
  <div class="meta">
    <p>Genre: ${novel.genre.replace(/_/g, ' ')} (${novel.subgenre.replace(/_/g, ' ')})</p>
    <p>Word Count: ${novel.wordCount.toLocaleString()}</p>
  </div>
  <div class="premise">
    <h3>Premise</h3>
    <p>${novel.premise}</p>
  </div>`;
      
      // Add each chapter
      novel.chapters.forEach(chapter => {
        content += `
  <div class="chapter">
    <h2 class="chapter-title">Chapter ${chapter.number}: ${chapter.title}</h2>
    ${chapter.content.split('\n\n').map(p => `    <p>${p}</p>`).join('\n')}
  </div>`;
      });
      
      content += `
</body>
</html>`;
      
      // Create and download the file
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating HTML file:', error);
      alert('Failed to generate HTML file');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="download-options">
      <h3>Download Options</h3>
      <div className="buttons">
        <button 
          onClick={downloadAsText}
          disabled={isGenerating}
          className="download-button"
        >
          {isGenerating ? 'Generating...' : 'Download as Text'}
        </button>
        <button 
          onClick={downloadAsHTML}
          disabled={isGenerating}
          className="download-button"
        >
          {isGenerating ? 'Generating...' : 'Download as HTML'}
        </button>
      </div>
    </div>
  );
}

export default DownloadOptions;

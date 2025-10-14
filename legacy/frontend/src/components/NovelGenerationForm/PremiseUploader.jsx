import { useRef, useState } from 'react';
import '../../styles/PremiseUploader.css';

function PremiseUploader({ premise, onChange, onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [charCount, setCharCount] = useState(premise.length);
  
  const handleTextChange = (e) => {
    const newPremise = e.target.value;
    onChange(newPremise);
    setCharCount(newPremise.length);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };
  
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };
  
  const handleFile = (file) => {
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      onFileUpload(file);
    } else {
      alert('Please upload a .txt or .md file');
    }
  };
  
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };
  
  return (
    <div className="premise-uploader">
      <h3>Novel Premise</h3>
      
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <p>Drag & drop a text file or <button type="button" onClick={handleBrowseClick}>browse</button></p>
        <p className="file-types">Accepted file types: .txt, .md (max 5,000 words)</p>
      </div>
      
      <div className="form-group">
        <label htmlFor="premise">
          Premise <span className="char-count">{charCount}/30000</span>
        </label>
        <textarea
          id="premise"
          value={premise}
          onChange={handleTextChange}
          placeholder="Enter your novel premise here or upload a file..."
          required
          maxLength="30000"
        ></textarea>
      </div>
    </div>
  );
}

export default PremiseUploader;

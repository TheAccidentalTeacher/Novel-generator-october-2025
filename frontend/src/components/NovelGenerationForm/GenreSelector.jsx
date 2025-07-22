import { useState, useEffect } from 'react';
import '../../styles/GenreSelector.css';

function GenreSelector({ genres, selectedGenre, selectedSubgenre, onChange }) {
  const [subgenres, setSubgenres] = useState([]);
  
  useEffect(() => {
    if (selectedGenre) {
      const genreData = genres.find(g => g.name === selectedGenre);
      if (genreData) {
        setSubgenres(genreData.subgenres);
        
        // Only reset subgenre if it's not valid for the new genre
        if (selectedSubgenre && !genreData.subgenres.some(sg => sg.name === selectedSubgenre)) {
          onChange(selectedGenre, '');
        }
      }
    } else {
      setSubgenres([]);
    }
  }, [selectedGenre, genres]);

  const handleGenreChange = (e) => {
    const newGenre = e.target.value;
    onChange(newGenre, ''); // Always reset subgenre when genre changes
  };

  const handleSubgenreChange = (e) => {
    const newSubgenre = e.target.value;
    console.log('Subgenre selected:', newSubgenre); // Debug log
    onChange(selectedGenre, newSubgenre);
  };

  return (
    <div className="genre-selector">
      <div className="form-group">
        <label htmlFor="genre">Genre</label>
        <select
          id="genre"
          value={selectedGenre}
          onChange={handleGenreChange}
          required
        >
          <option value="">Select a genre</option>
          {genres.map(genre => (
            <option key={genre.name} value={genre.name}>
              {genre.displayName}
            </option>
          ))}
        </select>
      </div>

      {selectedGenre && (
        <div className="form-group">
          <label htmlFor="subgenre">Subgenre</label>
          <select
            id="subgenre"
            value={selectedSubgenre}
            onChange={handleSubgenreChange}
            required
          >
            <option value="">Select a subgenre</option>
            {subgenres.map(subgenre => (
              <option key={subgenre.name} value={subgenre.name}>
                {subgenre.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {selectedGenre && selectedSubgenre && (
        <div className="subgenre-description">
          <h4>Genre Guidelines:</h4>
          <p>{subgenres.find(sg => sg.name === selectedSubgenre)?.description}</p>
        </div>
      )}
    </div>
  );
}

export default GenreSelector;

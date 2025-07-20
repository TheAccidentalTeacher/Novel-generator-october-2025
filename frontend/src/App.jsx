import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NovelProvider } from './context/NovelContext';
import Header from './components/Header';
import NovelGenerationForm from './components/NovelGenerationForm';
import GenerationProgress from './components/GenerationProgress';
import NovelPreview from './components/NovelPreview';

function App() {
  return (
    <Router>
      <NovelProvider>
        <div className="app">
          <Header />
          <main className="container">
            <Routes>
              <Route path="/" element={<NovelGenerationForm />} />
              <Route path="/progress/:jobId" element={<GenerationProgress />} />
              <Route path="/preview/:jobId" element={<NovelPreview />} />
            </Routes>
          </main>
        </div>
      </NovelProvider>
    </Router>
  );
}

export default App;

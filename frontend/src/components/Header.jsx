import { Link } from 'react-router-dom';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <h1>Somers Novel Generator</h1>
        </Link>
        <nav>
          <ul>
            <li><Link to="/">Generate</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PoolPage from './pages/PoolPage';
import ResultsPage from './pages/ResultsPage';
import CreateAccount from './pages/CreateAccount';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pool/:poolId" element={<PoolPage />} />
          <Route path="/results/:poolId" element={<ResultsPage />} />
          <Route path="/create-account" element={<CreateAccount />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

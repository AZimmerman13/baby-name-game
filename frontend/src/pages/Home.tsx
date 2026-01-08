import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPool } from '../services/api';
import axios from 'axios';

function Home() {
  const [creatorName, setCreatorName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!creatorName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const data = await createPool(creatorName.trim());
      // Store admin token in localStorage
      localStorage.setItem(`admin_token_${data.id}`, data.admin_token);
      // Navigate to pool page with admin token in URL
      navigate(`/pool/${data.id}?admin=${data.admin_token}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to create pool. Please try again.');
      } else {
        setError('Failed to create pool. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🥚 Stork Pool</h1>
        <p>The fun way to guess baby names, gender, and birthdays!</p>
        <p style={{ fontSize: '0.9rem', color: '#a0aec0', marginTop: '8px' }}>
          Perfect for baby showers, office pools, and family betting games
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Create a New Pool</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="creatorName" className="form-label">
              Your Name
            </label>
            <input
              type="text"
              id="creatorName"
              className="form-input"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Enter your name"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating Pool...' : 'Create Pool'}
          </button>
        </form>

        <div className="info-box" style={{ marginTop: '24px' }}>
          <p>
            <strong>How it works:</strong>
          </p>
          <ol style={{ marginTop: '12px', paddingLeft: '20px', color: '#718096' }}>
            <li>Create a free baby name guessing pool and share the link</li>
            <li>Everyone submits up to 6 name guesses (hedge your bets!)</li>
            <li>All guesses remain hidden until you reveal the actual baby name</li>
            <li>Our smart scoring algorithm finds each player's best guess</li>
            <li>See the leaderboard and find out who won the baby pool!</li>
          </ol>
          <p style={{ marginTop: '16px', fontSize: '0.9rem', color: '#718096' }}>
            <strong>Why Stork Pool?</strong> Create unlimited baby prediction pools, baby shower games,
            office betting pools, or family name contests. No sign-up required! Track gender reveals,
            birthday predictions, and name guesses all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;

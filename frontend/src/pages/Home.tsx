import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPool } from '../services/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

function Home() {
  const [creatorName, setCreatorName] = useState<string>('');
  const [enableName, setEnableName] = useState<boolean>(true);
  const [enableDate, setEnableDate] = useState<boolean>(false);
  const [enableSex, setEnableSex] = useState<boolean>(false);
  const [enableTime, setEnableTime] = useState<boolean>(false);
  const [enableWeight, setEnableWeight] = useState<boolean>(false);
  const [enableCustom, setEnableCustom] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
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

    // Check that at least one category is enabled
    if (!enableName && !enableDate && !enableSex && !enableTime && !enableWeight && !enableCustom) {
      setError('Please enable at least one category');
      return;
    }

    if (enableDate && !dueDate) {
      setError('Please enter a due date or disable the date category');
      return;
    }

    if (enableCustom && !customCategoryName.trim()) {
      setError('Please enter a custom category name or disable the custom category');
      return;
    }

    setLoading(true);

    try {
      const data = await createPool({
        creator_name: creatorName.trim(),
        enable_name: enableName,
        enable_date: enableDate,
        enable_sex: enableSex,
        enable_time: enableTime,
        enable_weight: enableWeight,
        enable_custom: enableCustom,
        due_date: enableDate && dueDate ? dueDate : null,
        custom_category_name: enableCustom && customCategoryName ? customCategoryName.trim() : null,
      });
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
    <>
      <Navigation />
      <div className="container">
        <div className="header">
          <h1>🥚 Stork Pool</h1>
          <p>The fun way to guess baby names, sex, and birthdays!</p>
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

          <div className="form-group">
            <label className="form-label">Prediction Categories</label>
            <p style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '12px' }}>
              Choose which categories participants will guess (at least one required)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableName}
                  onChange={(e) => setEnableName(e.target.checked)}
                  disabled={loading}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div><strong>Baby Name</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    Up to 6 guesses, scored by similarity (phonetic matching, spelling)
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableDate}
                  onChange={(e) => setEnableDate(e.target.checked)}
                  disabled={loading}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div><strong>Birth Date</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    100 points for exact date, minus 5 points per day off
                  </div>
                </div>
              </label>

              {enableDate && (
                <div style={{ marginLeft: '28px', marginTop: '-8px' }}>
                  <label htmlFor="dueDate" style={{ fontSize: '0.9rem', color: '#718096' }}>
                    Due Date (shown to participants)
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={loading}
                    style={{ marginTop: '4px' }}
                  />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableSex}
                  onChange={(e) => setEnableSex(e.target.checked)}
                  disabled={loading}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div><strong>Baby's Sex</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    100 points for correct guess, 0 for incorrect
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableTime}
                  onChange={(e) => setEnableTime(e.target.checked)}
                  disabled={loading}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div><strong>Birth Time</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    100 points for exact time, minus 1 point per 10 minutes off
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableWeight}
                  onChange={(e) => setEnableWeight(e.target.checked)}
                  disabled={loading}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div><strong>Birth Weight</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    100 points for exact weight (lbs + oz), minus 10 points per pound off
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableCustom}
                  onChange={(e) => setEnableCustom(e.target.checked)}
                  disabled={loading}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div><strong>Custom Category</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    Create your own category (e.g., "Hair Color", "Eye Color")
                  </div>
                </div>
              </label>

              {enableCustom && (
                <div style={{ marginLeft: '28px', marginTop: '-8px' }}>
                  <label htmlFor="customCategoryName" style={{ fontSize: '0.9rem', color: '#718096' }}>
                    Category Name (e.g., "Hair Color", "Eye Color")
                  </label>
                  <input
                    type="text"
                    id="customCategoryName"
                    className="form-input"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    disabled={loading}
                    maxLength={100}
                    style={{ marginTop: '4px' }}
                  />
                </div>
              )}
            </div>
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
            <strong>Why Stork Pool?</strong> The only baby pool game that lets your friends make complete
            baby name guesses (up to 6 per person!). Create unlimited prediction pools, baby shower games,
            office betting pools, or family name contests. No sign-up required! Track sex reveals,
            birthday predictions, and name guesses all in one place with our smart scoring algorithm.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}

export default Home;

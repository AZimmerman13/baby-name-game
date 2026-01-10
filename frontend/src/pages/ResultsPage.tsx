import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResults } from '../services/api';
import type { ResultsResponse } from '../types/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

function ResultsPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId]);

  const loadResults = async () => {
    if (!poolId) return;

    try {
      const data = await getResults(poolId);
      setResults(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400) {
          // Pool not revealed yet, redirect back to pool page
          navigate(`/pool/${poolId}`);
        } else {
          setError(err.response?.data?.detail || 'Failed to load results');
        }
      } else {
        setError('Failed to load results');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading results...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navigation />
        <div className="container">
          <div className="card">
            <div className="error-message">{error}</div>
            <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '16px' }}>
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!results) {
    return (
      <>
        <Navigation />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container">
      <div className="header">
        <h1>Results</h1>
        <p>Pool by {results.creator_name}</p>
      </div>

      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>The baby's name is...</h2>
          <div style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            padding: '16px 0'
          }}>
            {results.baby_name}
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-value">{results.total_participants}</div>
            <div className="stat-label">Total Guesses</div>
          </div>
          {results.leaderboard.length > 0 && (
            <div className="stat">
              <div className="stat-value">{results.leaderboard[0].total_score?.toFixed(1) || '0.0'}</div>
              <div className="stat-label">Top Score</div>
            </div>
          )}
        </div>
      </div>

      {results.leaderboard.length > 0 ? (
        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Leaderboard</h2>
          <div className="leaderboard">
            {results.leaderboard.map((entry, index) => (
              <div
                key={index}
                className="leaderboard-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`leaderboard-rank ${getRankClass(entry.rank)}`}>
                  {getMedalEmoji(entry.rank)}
                </div>
                <div className="leaderboard-content">
                  <div className="leaderboard-name">{entry.player_name}</div>
                  {entry.best_guess && (
                    <div className="leaderboard-guess">
                      Best: <strong>{entry.best_guess}</strong>
                      {entry.guessed_names.length > 1 && (
                        <span style={{ fontSize: '0.85em', color: '#a0aec0', marginLeft: '8px' }}>
                          (also guessed: {entry.guessed_names.filter(n => n !== entry.best_guess).join(', ')})
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.85em', color: '#718096', marginTop: '8px' }}>
                    {entry.name_score !== null && (
                      <span style={{ marginRight: '12px' }}>
                        Name: {entry.name_score.toFixed(1)}
                      </span>
                    )}
                    {entry.date_score !== null && (
                      <span style={{ marginRight: '12px' }}>
                        Date: {entry.date_score.toFixed(1)}
                      </span>
                    )}
                    {entry.sex_score !== null && (
                      <span style={{ marginRight: '12px' }}>
                        Sex: {entry.sex_score.toFixed(1)}
                      </span>
                    )}
                    {entry.time_score !== null && (
                      <span style={{ marginRight: '12px' }}>
                        Time: {entry.time_score.toFixed(1)}
                      </span>
                    )}
                    {entry.weight_score !== null && (
                      <span style={{ marginRight: '12px' }}>
                        Weight: {entry.weight_score.toFixed(1)}
                      </span>
                    )}
                    {entry.custom_score !== null && (
                      <span style={{ marginRight: '12px' }}>
                        Custom: {entry.custom_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="leaderboard-score">{entry.total_score?.toFixed(1) || '0.0'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="info-box">
            <p>No guesses were submitted for this pool.</p>
          </div>
        </div>
      )}

      <div className="card">
        <button onClick={() => navigate('/')} className="btn btn-primary btn-full">
          Create New Pool
        </button>
      </div>
      </div>
    </>
  );
}

export default ResultsPage;

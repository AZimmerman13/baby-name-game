import { useState, useEffect, useMemo } from 'react';
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
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

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

  const formatResultsForSharing = (): string => {
    if (!results) return '';

    let text = `🎉 Baby Name Pool Results 🎉\n\n`;
    text += `The baby's name is: ${results.baby_name}\n`;
    text += `Pool by ${results.creator_name}\n`;
    text += `Total Participants: ${results.total_participants}\n\n`;

    if (results.leaderboard.length > 0) {
      text += `🏆 Leaderboard 🏆\n\n`;
      results.leaderboard.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${entry.rank}`;
        text += `${medal} ${entry.player_name} - ${entry.total_score?.toFixed(1) || '0.0'} points\n`;
        if (entry.best_guess) {
          text += `   Best guess: ${entry.best_guess}\n`;
        }
        text += '\n';
      });
    }

    text += `\nPlay at: ${window.location.origin}`;

    return text;
  };

  const copyResults = async () => {
    const text = formatResultsForSharing();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const categoryWinners = useMemo(() => {
    if (!results || results.leaderboard.length === 0) return [];

    const categories = [
      { key: 'name_score', label: 'Name', color: '#667eea', emoji: '📝' },
      { key: 'date_score', label: 'Date', color: '#48bb78', emoji: '📅' },
      { key: 'sex_score', label: 'Sex', color: '#ed64a6', emoji: '👶' },
      { key: 'time_score', label: 'Time', color: '#f6ad55', emoji: '⏰' },
      { key: 'weight_score', label: 'Weight', color: '#4299e1', emoji: '⚖️' },
      { key: 'custom_score', label: 'Custom', color: '#9f7aea', emoji: '⭐' },
    ];

    const winners: Array<{ category: string; winner: string; score: number; color: string; emoji: string }> = [];

    categories.forEach(({ key, label, color, emoji }) => {
      const categoryKey = key as keyof typeof results.leaderboard[0];
      const entriesWithScore = results.leaderboard.filter(
        entry => entry[categoryKey] !== null && entry[categoryKey] !== undefined
      );

      if (entriesWithScore.length > 0) {
        const winner = entriesWithScore.reduce((prev, current) => {
          const prevScore = prev[categoryKey] as number;
          const currentScore = current[categoryKey] as number;
          return currentScore > prevScore ? current : prev;
        });

        const score = winner[categoryKey] as number;
        if (score > 0) {
          winners.push({
            category: label,
            winner: winner.player_name,
            score,
            color,
            emoji
          });
        }
      }
    });

    return winners;
  }, [results]);

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

        <button
          onClick={copyResults}
          className="btn btn-secondary btn-full"
          style={{ marginTop: '24px' }}
        >
          {copied ? '✓ Copied to Clipboard!' : '📋 Copy & Share Results'}
        </button>
      </div>

      {/* Category Winners */}
      {categoryWinners.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Category Winners</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {categoryWinners.map((categoryWinner, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: 'white',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  animation: 'slideIn 0.5s ease-out',
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = categoryWinner.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  {categoryWinner.emoji}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  {categoryWinner.category}
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#2d3748',
                  marginBottom: '4px',
                  textAlign: 'center'
                }}>
                  {categoryWinner.winner}
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: categoryWinner.color,
                  textAlign: 'center'
                }}>
                  {categoryWinner.score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.leaderboard.length > 0 ? (
        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Leaderboard</h2>
          <div className="leaderboard">
            {results.leaderboard.map((entry, index) => (
              <div
                key={index}
                className="leaderboard-item"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => toggleCard(index)}
              >
                <div className={`leaderboard-rank ${getRankClass(entry.rank)}`}>
                  {getMedalEmoji(entry.rank)}
                </div>
                <div className="leaderboard-content" style={{ flex: 1 }}>
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

                  {!expandedCard || expandedCard !== index ? (
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
                  ) : (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#2d3748' }}>
                        Score Breakdown
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {entry.name_score !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a5568' }}>Name Score:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${entry.name_score}%`,
                                  height: '100%',
                                  backgroundColor: '#667eea',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                {entry.name_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        {entry.date_score !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a5568' }}>Date Score:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${entry.date_score}%`,
                                  height: '100%',
                                  backgroundColor: '#48bb78',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                {entry.date_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        {entry.sex_score !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a5568' }}>Sex Score:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${entry.sex_score}%`,
                                  height: '100%',
                                  backgroundColor: '#ed64a6',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                {entry.sex_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        {entry.time_score !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a5568' }}>Time Score:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${entry.time_score}%`,
                                  height: '100%',
                                  backgroundColor: '#f6ad55',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                {entry.time_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        {entry.weight_score !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a5568' }}>Weight Score:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${entry.weight_score}%`,
                                  height: '100%',
                                  backgroundColor: '#4299e1',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                {entry.weight_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        {entry.custom_score !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4a5568' }}>Custom Score:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${entry.custom_score}%`,
                                  height: '100%',
                                  backgroundColor: '#9f7aea',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                {entry.custom_score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '2px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 'bold'
                      }}>
                        <span style={{ color: '#2d3748' }}>Total Score:</span>
                        <span style={{ fontSize: '1.2rem', color: '#667eea' }}>
                          {entry.total_score?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        color: '#718096',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}>
                        Click to collapse
                      </div>
                    </div>
                  )}
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

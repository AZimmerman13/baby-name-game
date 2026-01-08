import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getPool, submitGuess, revealName } from '../services/api';
import type { PoolResponse } from '../types/api';
import axios from 'axios';

function PoolPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adminTokenFromUrl = searchParams.get('admin');
  const isAdmin = !!adminTokenFromUrl;

  const [pool, setPool] = useState<PoolResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Guess form state
  const [playerName, setPlayerName] = useState<string>('');
  const [guessedNames, setGuessedNames] = useState<string[]>(['', '', '', '', '']);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reveal form state
  const [babyName, setBabyName] = useState<string>('');
  const [revealing, setRevealing] = useState<boolean>(false);
  const [showRevealForm, setShowRevealForm] = useState<boolean>(false);

  // Copy link state
  const [copiedAdmin, setCopiedAdmin] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  useEffect(() => {
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId]);

  const loadPool = async () => {
    if (!poolId) return;

    try {
      const data = await getPool(poolId);
      setPool(data);

      // If pool is revealed, redirect to results
      if (data.status === 'revealed') {
        navigate(`/results/${poolId}`);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to load pool');
      } else {
        setError('Failed to load pool');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGuess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Filter out empty guesses
    const validNames = guessedNames.filter(name => name.trim() !== '');

    if (validNames.length === 0) {
      setError('Please enter at least one name guess');
      return;
    }

    if (!poolId) return;

    setSubmitting(true);

    try {
      await submitGuess(poolId, playerName.trim(), validNames.map(n => n.trim()));
      setSuccess(`Guess${validNames.length > 1 ? 'es' : ''} submitted successfully! Thanks for playing!`);
      setPlayerName('');
      setGuessedNames(['', '', '', '', '']);
      // Reload pool to update participant count
      loadPool();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to submit guess');
      } else {
        setError('Failed to submit guess');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...guessedNames];
    newNames[index] = value;
    setGuessedNames(newNames);
  };

  const handleReveal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!babyName.trim()) {
      setError('Please enter the baby name');
      return;
    }

    if (!poolId) return;

    const adminToken = adminTokenFromUrl || localStorage.getItem(`admin_token_${poolId}`);
    if (!adminToken) {
      setError('Admin token not found');
      return;
    }

    setRevealing(true);

    try {
      await revealName(poolId, babyName.trim(), adminToken);
      // Redirect to results page
      navigate(`/results/${poolId}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to reveal name');
      } else {
        setError('Failed to reveal name');
      }
    } finally {
      setRevealing(false);
    }
  };

  const copyAdminLink = () => {
    const link = `${window.location.origin}/pool/${poolId}?admin=${adminTokenFromUrl}`;
    navigator.clipboard.writeText(link);
    setCopiedAdmin(true);
    setTimeout(() => setCopiedAdmin(false), 2000);
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/pool/${poolId}`;
    navigator.clipboard.writeText(link);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading pool...</p>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="container">
        <div className="card">
          <div className="error-message">Pool not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Baby Name Guessing Game</h1>
        <p>Pool created by {pool.creator_name}</p>
      </div>

      {error && <div className="card"><div className="error-message">{error}</div></div>}
      {success && <div className="card"><div className="success-message">{success}</div></div>}

      {/* Pool Info */}
      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Pool Information</h2>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{pool.participant_count}</div>
            <div className="stat-label">Participants</div>
          </div>
          <div className="stat">
            <div className="stat-value">{pool.status === 'open' ? 'Open' : 'Closed'}</div>
            <div className="stat-label">Status</div>
          </div>
        </div>

        {isAdmin && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Your Admin Link (<strong>bookmark this</strong> or <a href="/create-account" style={{ color: '#667eea', textDecoration: 'underline' }}>create an account</a>)
              </label>
              <div className="copy-link-box">
                <input
                  type="text"
                  className="form-input"
                  value={`${window.location.origin}/pool/${poolId}?admin=${adminTokenFromUrl}`}
                  readOnly
                />
                <button onClick={copyAdminLink} className="btn btn-secondary">
                  {copiedAdmin ? 'Copied!' : 'Copy Admin Link'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Share Link (for participants)
              </label>
              <div className="copy-link-box">
                <input
                  type="text"
                  className="form-input"
                  value={`${window.location.origin}/pool/${poolId}`}
                  readOnly
                />
                <button onClick={copyShareLink} className="btn btn-secondary">
                  {copiedShare ? 'Copied!' : 'Copy Share Link'}
                </button>
              </div>
            </div>
            <div className="info-box">
              <p>
                <strong>Note:</strong> If you are the parent or are otherwise not participating,
                you don't need to submit guesses. Just share the link and reveal when ready!
              </p>
            </div>
          </>
        )}
      </div>

      {/* Guess Form */}
      {pool.status === 'open' && !success && (
        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Submit Your Guess</h2>
          <form onSubmit={handleSubmitGuess}>
            <div className="form-group">
              <label htmlFor="playerName" className="form-label">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                className="form-input"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                disabled={submitting}
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Your Guesses for Baby's Name (1-5 names)
              </label>
              {guessedNames.map((name, index) => (
                <input
                  key={index}
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  placeholder={`Guess #${index + 1}${index === 0 ? ' (required)' : ' (optional)'}`}
                  disabled={submitting}
                  maxLength={100}
                  style={{ marginBottom: index < 4 ? '8px' : '0' }}
                />
              ))}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Guess'}
            </button>
          </form>

          <div className="info-box" style={{ marginTop: '24px' }}>
            <p><strong>Tip:</strong> Submit up to 5 name guesses! Your score will be based on your best guess. All guesses remain hidden until the pool creator reveals the actual name.</p>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && pool.status === 'open' && (
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Admin Controls</h2>
          <p style={{ marginBottom: '16px', color: '#718096' }}>
            When you're ready, reveal the baby's name to calculate scores and show the leaderboard.
          </p>

          {!showRevealForm ? (
            <button
              onClick={() => setShowRevealForm(true)}
              className="btn btn-primary btn-full"
            >
              Reveal Baby Name
            </button>
          ) : (
            <form onSubmit={handleReveal}>
              <div className="form-group">
                <label htmlFor="babyName" className="form-label">
                  Baby's Name
                </label>
                <input
                  type="text"
                  id="babyName"
                  className="form-input"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="Enter the actual baby name"
                  disabled={revealing}
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={revealing} style={{ flex: 1 }}>
                  {revealing ? 'Revealing...' : 'Confirm & Reveal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRevealForm(false)}
                  className="btn btn-secondary"
                  disabled={revealing}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default PoolPage;

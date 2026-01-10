import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getPool, submitGuess, revealName } from '../services/api';
import type { PoolResponse } from '../types/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

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
  const [guessedNames, setGuessedNames] = useState<string[]>(['', '', '', '', '', '']);
  const [guessedBirthDate, setGuessedBirthDate] = useState<string>('');
  const [guessedSex, setGuessedSex] = useState<string>('');
  const [guessedBirthTime, setGuessedBirthTime] = useState<string>('');
  const [guessedWeightLbs, setGuessedWeightLbs] = useState<string>('');
  const [guessedWeightOz, setGuessedWeightOz] = useState<string>('');
  const [guessedCustomValue, setGuessedCustomValue] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reveal form state
  const [babyName, setBabyName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [sex, setSex] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [weightLbs, setWeightLbs] = useState<string>('');
  const [weightOz, setWeightOz] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');
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

    // If names are enabled, require at least one name
    if (pool && pool.enable_name && validNames.length === 0) {
      setError('Please enter at least one name guess');
      return;
    }

    if (!poolId) return;

    setSubmitting(true);

    // Convert lbs + oz to total pounds
    let totalWeight: number | null = null;
    if (guessedWeightLbs || guessedWeightOz) {
      const lbs = guessedWeightLbs ? parseInt(guessedWeightLbs) : 0;
      const oz = guessedWeightOz ? parseInt(guessedWeightOz) : 0;
      totalWeight = lbs + (oz / 16);
    }

    try {
      await submitGuess(poolId, {
        player_name: playerName.trim(),
        guessed_names: validNames.length > 0 ? validNames.map(n => n.trim()) : [''],
        guessed_birth_date: guessedBirthDate || null,
        guessed_sex: guessedSex || null,
        guessed_birth_time: guessedBirthTime || null,
        guessed_weight: totalWeight,
        guessed_custom_value: guessedCustomValue || null,
      });
      setSuccess(`Guess${validNames.length > 1 ? 'es' : ''} submitted successfully! Thanks for playing!`);
      setPlayerName('');
      setGuessedNames(['', '', '', '', '', '']);
      setGuessedBirthDate('');
      setGuessedSex('');
      setGuessedBirthTime('');
      setGuessedWeightLbs('');
      setGuessedWeightOz('');
      setGuessedCustomValue('');
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

    if (!poolId || !pool) return;

    // Only require baby name if name category is enabled
    if (pool.enable_name && !babyName.trim()) {
      setError('Please enter the baby name');
      return;
    }

    const adminToken = adminTokenFromUrl || localStorage.getItem(`admin_token_${poolId}`);
    if (!adminToken) {
      setError('Admin token not found');
      return;
    }

    setRevealing(true);

    // Convert lbs + oz to total pounds
    let totalWeight: number | null = null;
    if (weightLbs || weightOz) {
      const lbs = weightLbs ? parseInt(weightLbs) : 0;
      const oz = weightOz ? parseInt(weightOz) : 0;
      totalWeight = lbs + (oz / 16);
    }

    try {
      await revealName(poolId, {
        baby_name: babyName.trim(),
        admin_token: adminToken,
        birth_date: birthDate || null,
        sex: sex || null,
        birth_time: birthTime || null,
        weight: totalWeight,
        custom_value: customValue || null,
      });
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
      <>
        <Navigation />
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading pool...</p>
        </div>
      </>
    );
  }

  if (!pool) {
    return (
      <>
        <Navigation />
        <div className="container">
          <div className="card">
            <div className="error-message">Pool not found</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container">
        <div className="header">
          <h1>Stork Pool</h1>
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
                Your Admin Link
                {pool && !pool.is_owner && (
                  <span> (<a href="/register" style={{ color: '#667eea', textDecoration: 'underline' }}>create an account</a> to manage this pool easily)</span>
                )}
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

            {pool.enable_name && (
              <div className="form-group">
                <label className="form-label">
                  Your Guesses for Baby's Name (1-6 names)
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
                    style={{ marginBottom: index < 5 ? '8px' : '0' }}
                  />
                ))}
              </div>
            )}

            {pool.enable_date && (
              <div className="form-group">
                <label htmlFor="guessedBirthDate" className="form-label">
                  Guess Birth Date{pool.due_date && ` (Due: ${new Date(pool.due_date).toLocaleDateString()})`}
                </label>
                <input
                  type="date"
                  id="guessedBirthDate"
                  className="form-input"
                  value={guessedBirthDate}
                  onChange={(e) => setGuessedBirthDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}

            {pool.enable_sex && (
              <div className="form-group">
                <label htmlFor="guessedSex" className="form-label">
                  Guess Baby's Sex
                </label>
                <select
                  id="guessedSex"
                  className="form-input"
                  value={guessedSex}
                  onChange={(e) => setGuessedSex(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select...</option>
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </div>
            )}

            {pool.enable_time && (
              <div className="form-group">
                <label htmlFor="guessedBirthTime" className="form-label">
                  Guess Birth Time
                </label>
                <input
                  type="time"
                  id="guessedBirthTime"
                  className="form-input"
                  value={guessedBirthTime}
                  onChange={(e) => setGuessedBirthTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}

            {pool.enable_weight && (
              <div className="form-group">
                <label className="form-label">
                  Guess Birth Weight
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="guessedWeightLbs" style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '4px', display: 'block' }}>
                      Pounds
                    </label>
                    <input
                      type="number"
                      id="guessedWeightLbs"
                      className="form-input"
                      value={guessedWeightLbs}
                      onChange={(e) => setGuessedWeightLbs(e.target.value)}
                      placeholder="7"
                      disabled={submitting}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="guessedWeightOz" style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '4px', display: 'block' }}>
                      Ounces
                    </label>
                    <input
                      type="number"
                      id="guessedWeightOz"
                      className="form-input"
                      value={guessedWeightOz}
                      onChange={(e) => setGuessedWeightOz(e.target.value)}
                      placeholder="8"
                      disabled={submitting}
                      min="0"
                      max="15"
                    />
                  </div>
                </div>
              </div>
            )}

            {pool.enable_custom && (
              <div className="form-group">
                <label htmlFor="guessedCustomValue" className="form-label">
                  Guess {pool.custom_category_name || 'Custom Category'}
                </label>
                <input
                  type="text"
                  id="guessedCustomValue"
                  className="form-input"
                  value={guessedCustomValue}
                  onChange={(e) => setGuessedCustomValue(e.target.value)}
                  placeholder={`Enter your guess for ${pool.custom_category_name || 'custom category'}`}
                  disabled={submitting}
                  maxLength={100}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Guess'}
            </button>
          </form>

          <div className="info-box" style={{ marginTop: '24px' }}>
            <p>
              <strong>Tip:</strong> {pool.enable_name && 'Submit up to 6 name guesses! Your score will be based on your best guess. '}
              All guesses remain hidden until the pool creator reveals the results.
            </p>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && pool.status === 'open' && (
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Admin Controls</h2>
          <p style={{ marginBottom: '16px', color: '#718096' }}>
            When you're ready, reveal the actual results to calculate scores and show the leaderboard.
          </p>

          {!showRevealForm ? (
            <button
              onClick={() => setShowRevealForm(true)}
              className="btn btn-primary btn-full"
            >
              Reveal Results
            </button>
          ) : (
            <form onSubmit={handleReveal}>
              {pool.enable_name && (
                <div className="form-group">
                  <label htmlFor="babyName" className="form-label">
                    Baby's Name *
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
              )}

              {pool.enable_date && (
                <div className="form-group">
                  <label htmlFor="birthDate" className="form-label">
                    Actual Birth Date
                  </label>
                  <input
                    type="date"
                    id="birthDate"
                    className="form-input"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={revealing}
                  />
                </div>
              )}

              {pool.enable_sex && (
                <div className="form-group">
                  <label htmlFor="sex" className="form-label">
                    Actual Sex
                  </label>
                  <select
                    id="sex"
                    className="form-input"
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    disabled={revealing}
                  >
                    <option value="">Select...</option>
                    <option value="boy">Boy</option>
                    <option value="girl">Girl</option>
                  </select>
                </div>
              )}

              {pool.enable_time && (
                <div className="form-group">
                  <label htmlFor="birthTime" className="form-label">
                    Actual Birth Time
                  </label>
                  <input
                    type="time"
                    id="birthTime"
                    className="form-input"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    disabled={revealing}
                  />
                </div>
              )}

              {pool.enable_weight && (
                <div className="form-group">
                  <label className="form-label">
                    Actual Birth Weight
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="weightLbs" style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '4px', display: 'block' }}>
                        Pounds
                      </label>
                      <input
                        type="number"
                        id="weightLbs"
                        className="form-input"
                        value={weightLbs}
                        onChange={(e) => setWeightLbs(e.target.value)}
                        placeholder="7"
                        disabled={revealing}
                        min="0"
                        max="20"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="weightOz" style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '4px', display: 'block' }}>
                        Ounces
                      </label>
                      <input
                        type="number"
                        id="weightOz"
                        className="form-input"
                        value={weightOz}
                        onChange={(e) => setWeightOz(e.target.value)}
                        placeholder="8"
                        disabled={revealing}
                        min="0"
                        max="15"
                      />
                    </div>
                  </div>
                </div>
              )}

              {pool.enable_custom && (
                <div className="form-group">
                  <label htmlFor="customValue" className="form-label">
                    Actual {pool.custom_category_name || 'Custom Value'}
                  </label>
                  <input
                    type="text"
                    id="customValue"
                    className="form-input"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder={`Enter actual ${pool.custom_category_name || 'custom value'}`}
                    disabled={revealing}
                    maxLength={100}
                  />
                </div>
              )}

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
    </>
  );
}

export default PoolPage;

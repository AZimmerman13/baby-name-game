import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserPools, deletePool, linkPoolToAccount } from '../services/api';
import type { PoolResponse } from '../types/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

function DashboardPage() {
  const [pools, setPools] = useState<PoolResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showLinkForm, setShowLinkForm] = useState<boolean>(false);
  const [linkPoolId, setLinkPoolId] = useState<string>('');
  const [linkAdminToken, setLinkAdminToken] = useState<string>('');
  const [linkingPool, setLinkingPool] = useState<boolean>(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadPools();
  }, [user, navigate]);

  const loadPools = async () => {
    try {
      const data = await getUserPools();
      setPools(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load pools');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (poolId: string) => {
    if (!window.confirm('Are you sure you want to delete this pool? This cannot be undone.')) {
      return;
    }

    try {
      await deletePool(poolId);
      setPools(pools.filter(p => p.id !== poolId));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.detail || 'Failed to delete pool');
      }
    }
  };

  const handleLinkPool = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!linkPoolId.trim() || !linkAdminToken.trim()) {
      setError('Please enter both pool ID and admin token');
      return;
    }

    setLinkingPool(true);

    try {
      await linkPoolToAccount(linkPoolId.trim(), { admin_token: linkAdminToken.trim() });
      setShowLinkForm(false);
      setLinkPoolId('');
      setLinkAdminToken('');
      await loadPools();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to link pool');
      } else {
        setError('Failed to link pool');
      }
    } finally {
      setLinkingPool(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container">
        <div className="header">
          <h1>🥚 Stork Pool Dashboard</h1>
          <p>Welcome, {user?.display_name}!</p>
        </div>

        <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2>Your Pools</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-secondary">
              Create New Pool
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {pools.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
            <p>You haven't created any pools yet.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
              Create Your First Pool
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pools.map((pool) => (
              <div
                key={pool.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#f7fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ marginBottom: '8px' }}>Pool by {pool.creator_name}</h3>
                    <div style={{ fontSize: '0.9rem', color: '#718096' }}>
                      <div>Created: {new Date(pool.created_at).toLocaleDateString()}</div>
                      <div>Participants: {pool.participant_count}</div>
                      <div>Status: {pool.status === 'open' ? 'Open' : 'Revealed'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/pool/${pool.id}`}
                      className="btn btn-primary"
                      style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                    >
                      View Pool
                    </Link>
                    {pool.status === 'revealed' && (
                      <Link
                        to={`/results/${pool.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                      >
                        View Results
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(pool.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.9rem', padding: '8px 16px', color: '#e53e3e' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          {!showLinkForm ? (
            <button
              onClick={() => setShowLinkForm(true)}
              className="btn btn-secondary"
            >
              Link Existing Pool to Account
            </button>
          ) : (
            <form onSubmit={handleLinkPool}>
              <h3 style={{ marginBottom: '16px' }}>Link Existing Pool</h3>
              <p style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '16px' }}>
                If you created a pool before creating an account, you can link it here using your admin token.
              </p>

              <div className="form-group">
                <label htmlFor="linkPoolId" className="form-label">
                  Pool ID (from URL)
                </label>
                <input
                  type="text"
                  id="linkPoolId"
                  className="form-input"
                  value={linkPoolId}
                  onChange={(e) => setLinkPoolId(e.target.value)}
                  placeholder="e.g., abc123-def456-ghi789"
                  disabled={linkingPool}
                />
              </div>

              <div className="form-group">
                <label htmlFor="linkAdminToken" className="form-label">
                  Admin Token
                </label>
                <input
                  type="text"
                  id="linkAdminToken"
                  className="form-input"
                  value={linkAdminToken}
                  onChange={(e) => setLinkAdminToken(e.target.value)}
                  placeholder="Your admin token"
                  disabled={linkingPool}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={linkingPool}>
                  {linkingPool ? 'Linking...' : 'Link Pool'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkForm(false);
                    setLinkPoolId('');
                    setLinkAdminToken('');
                    setError('');
                  }}
                  className="btn btn-secondary"
                  disabled={linkingPool}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;

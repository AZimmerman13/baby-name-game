import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { verifyResetToken, resetPassword } from '../services/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No reset token provided');
        setLoading(false);
        return;
      }

      try {
        await verifyResetToken({ token });
        setTokenValid(true);
      } catch (err) {
        setError('This password reset link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword({ token: token!, new_password: password });
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400) {
          setError('This password reset link is invalid or has expired.');
        } else {
          setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
        }
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container">
          <div className="header">
            <h1>Stork Pool</h1>
            <p>Reset your password</p>
          </div>
          <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <p>Verifying reset link...</p>
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
          <p>Reset your password</p>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Reset Password</h2>

          {success ? (
            <div>
              <div className="success-message" style={{
                background: '#d4edda',
                color: '#155724',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                Your password has been reset successfully!
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            </div>
          ) : !tokenValid ? (
            <div>
              <div className="error-message" style={{ marginBottom: '24px' }}>
                {error || 'This password reset link is invalid or has expired.'}
              </div>
              <p style={{ textAlign: 'center', color: '#718096', marginBottom: '24px' }}>
                Please request a new password reset link.
              </p>
              <Link to="/forgot-password">
                <button className="btn btn-primary btn-full">
                  Request New Link
                </button>
              </Link>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link to="/login" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={submitting}
                    autoComplete="new-password"
                  />
                  <p style={{ color: '#718096', fontSize: '14px', marginTop: '4px' }}>
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={submitting}
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link to="/login" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ResetPasswordPage;

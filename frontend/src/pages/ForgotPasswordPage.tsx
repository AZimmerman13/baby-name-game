import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import axios from 'axios';
import Navigation from '../components/Navigation';

function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      await forgotPassword({ email: email.trim() });
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError(err.response?.data?.detail || 'Failed to send reset email. Please try again.');
        }
      } else {
        setError('Failed to send reset email. Please try again.');
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
          <h1>Stork Pool</h1>
          <p>Reset your password</p>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Forgot Password</h2>

          {success ? (
            <div>
              <div className="success-message" style={{
                background: '#d4edda',
                color: '#155724',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                If an account with that email exists, we've sent a password reset link. Please check your inbox.
              </div>
              <p style={{ textAlign: 'center', color: '#718096' }}>
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link to="/login" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}

              <p style={{ color: '#718096', marginBottom: '24px' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div style={{ marginTop: '24px', textAlign: 'center', color: '#718096' }}>
                Remember your password?{' '}
                <Link to="/login" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Login here
                </Link>
              </div>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link to="/" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ForgotPasswordPage;

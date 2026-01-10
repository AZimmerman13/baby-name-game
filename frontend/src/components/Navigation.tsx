import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const closeUserMenu = () => {
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    closeUserMenu();
    navigate('/');
  };

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#f7fafc',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Hamburger Menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            color: '#4a5568'
          }}
          aria-label="Menu"
        >
          ☰
        </button>

        {/* User Icon */}
        <div
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          {user && (
            <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>
              {user.display_name}
            </span>
          )}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4a5568"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      {/* Hamburger Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMenu}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 998
            }}
          />

          {/* Menu Panel */}
          <div style={{
            position: 'fixed',
            top: '49px',
            left: 0,
            width: '250px',
            backgroundColor: 'white',
            borderRight: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            padding: '8px 0'
          }}>
            <Link
              to="/"
              onClick={closeMenu}
              style={{
                display: 'block',
                padding: '12px 16px',
                color: '#4a5568',
                textDecoration: 'none',
                fontSize: '0.95rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Home
            </Link>

            {user && (
              <Link
                to="/dashboard"
                onClick={closeMenu}
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: '#4a5568',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Dashboard
              </Link>
            )}

            <Link
              to="/faqs"
              onClick={closeMenu}
              style={{
                display: 'block',
                padding: '12px 16px',
                color: '#4a5568',
                textDecoration: 'none',
                fontSize: '0.95rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              FAQs
            </Link>
          </div>
        </>
      )}

      {/* User Dropdown Menu */}
      {userMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeUserMenu}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 998
            }}
          />

          {/* User Menu Panel */}
          <div style={{
            position: 'fixed',
            top: '49px',
            right: 0,
            width: '200px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '-2px 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            padding: '8px 0'
          }}>
            {user ? (
              <button
                onClick={handleLogout}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  color: '#4a5568',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  transition: 'background-color 0.2s',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeUserMenu}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    color: '#4a5568',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeUserMenu}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    color: '#4a5568',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default Navigation;

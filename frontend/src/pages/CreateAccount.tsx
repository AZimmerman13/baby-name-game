import { useNavigate } from 'react-router-dom';

function CreateAccount() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="header">
        <h1>Create Account</h1>
        <p>Save your pools and never lose them!</p>
      </div>

      <div className="card">
        <div className="info-box">
          <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
            <strong>Coming Soon!</strong>
          </p>
          <p style={{ marginBottom: '16px' }}>
            Account creation is currently in development. For now, please bookmark your admin link to return to your pools later.
          </p>
          <p>
            Features coming with accounts:
          </p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', color: '#718096' }}>
            <li>Save all your pools in one place</li>
            <li>View pool history and past results</li>
            <li>Manage multiple pools at once</li>
            <li>Get notified when participants submit guesses</li>
          </ul>
        </div>

        <button onClick={() => navigate(-1)} className="btn btn-primary btn-full" style={{ marginTop: '24px' }}>
          Go Back
        </button>
      </div>
    </div>
  );
}

export default CreateAccount;

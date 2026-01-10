import Navigation from '../components/Navigation';

function FAQsPage() {
  return (
    <>
      <Navigation />
      <div className="container">
        <div className="header">
          <h1>❓ Frequently Asked Questions</h1>
          <p>Everything you need to know about Stork Pool</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* General Questions */}
            <div>
              <h2 style={{ marginBottom: '16px', color: '#667eea' }}>General</h2>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>What is Stork Pool?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Stork Pool is a free baby name and birthday guessing game perfect for baby showers,
                  office pools, and family betting games. Participants can submit up to 6 name guesses
                  per person, and our smart scoring algorithm finds each player's best guess to determine the winner!
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Do I need to create an account?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  No! You can create and share pools without signing up. However, creating an account
                  allows you to manage all your pools from a dashboard, edit pool settings, and link
                  previously created anonymous pools to your account.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Is it really free?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Yes, completely free! No hidden fees, no premium features, no ads. If you love the
                  app and want to support development, there's an optional Ko-fi donation button.
                </p>
              </div>
            </div>

            {/* Pool Creation */}
            <div>
              <h2 style={{ marginBottom: '16px', color: '#667eea' }}>Creating Pools</h2>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>What categories can participants guess?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  You can enable any combination of:
                </p>
                <ul style={{ color: '#718096', lineHeight: '1.6', marginLeft: '20px', marginTop: '8px' }}>
                  <li><strong>Baby Name</strong> - Up to 6 guesses per person</li>
                  <li><strong>Birth Date</strong> - Exact date prediction</li>
                  <li><strong>Baby's Sex</strong> - Boy or Girl</li>
                  <li><strong>Birth Time</strong> - Hour and minute prediction</li>
                  <li><strong>Birth Weight</strong> - In pounds and ounces</li>
                  <li><strong>Custom Category</strong> - Create your own (e.g., "Hair Color", "Eye Color")</li>
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Can I edit a pool after creating it?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  If you have an account and own the pool, you can edit the creator name, due date,
                  and custom category name from your dashboard. However, you cannot change which
                  categories are enabled once the pool is created.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>How do I save my admin link?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  After creating a pool, copy the admin link displayed on the pool page. This special
                  link is the only way to reveal results later! If you create an account, you can also
                  manage pools from your dashboard without needing the admin link.
                </p>
              </div>
            </div>

            {/* Participating */}
            <div>
              <h2 style={{ marginBottom: '16px', color: '#667eea' }}>Participating</h2>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Why can I submit 6 name guesses?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Multiple guesses let you hedge your bets! Maybe you think it's "Emma" or "Olivia" or
                  "Sophia"? Submit all your hunches. Our scoring algorithm automatically picks your best
                  guess to give you the highest possible score.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Can I see other people's guesses?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  No! All guesses remain hidden until the pool creator reveals the actual baby name.
                  This keeps the game fair and exciting.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Can I change my guess after submitting?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Currently, guesses cannot be edited after submission. Make sure you're happy with
                  your predictions before clicking submit!
                </p>
              </div>
            </div>

            {/* Scoring */}
            <div>
              <h2 style={{ marginBottom: '16px', color: '#667eea' }}>Scoring</h2>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>How is the baby name scored?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  We use advanced phonetic matching and spelling similarity algorithms. If you guessed
                  "Katherine" and the baby is "Catherine", you'll get partial credit! The system
                  automatically picks your best name guess out of your 6 submissions.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>How are dates, times, and weights scored?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  <strong>Birth Date:</strong> 100 points for exact match, minus 5 points per day off<br />
                  <strong>Birth Time:</strong> 100 points for exact time, minus 1 point per 10 minutes off<br />
                  <strong>Birth Weight:</strong> 100 points for exact weight, minus 10 points per pound off<br />
                  <strong>Baby's Sex:</strong> 100 points for correct, 0 for incorrect
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>How is the final winner determined?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Scores from all enabled categories are added together. The participant with the
                  highest total score wins! In case of a tie, the person who submitted their guess
                  first is ranked higher.
                </p>
              </div>
            </div>

            {/* Privacy & Security */}
            <div>
              <h2 style={{ marginBottom: '16px', color: '#667eea' }}>Privacy & Security</h2>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Is my data secure?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Yes! All passwords are securely hashed using bcrypt. We use HTTP-only cookies to
                  prevent XSS attacks. We don't sell or share your data with third parties.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>What information do you collect?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  For anonymous pools: Only the information you choose to share (creator name, participant names, guesses).<br />
                  For accounts: Email, display name, and password (securely hashed). We don't require any personal information beyond this.
                </p>
              </div>
            </div>

            {/* Technical Issues */}
            <div>
              <h2 style={{ marginBottom: '16px', color: '#667eea' }}>Technical Issues</h2>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>I lost my admin link! Can I still reveal results?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  If you created an account and the pool is linked to it, you can manage it from your
                  dashboard. Otherwise, the admin link is required to reveal results. We recommend creating
                  an account or saving the admin link in a safe place.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>I found a bug! How do I report it?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Please report bugs on our{' '}
                  <a href="https://github.com/anthropics/claude-code/issues"
                     target="_blank"
                     rel="noopener noreferrer"
                     style={{ color: '#667eea', textDecoration: 'underline' }}>
                    GitHub Issues page
                  </a>
                  {' '}or contact us through Ko-fi. We appreciate your help making Stork Pool better!
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Can I use this for commercial purposes?</h3>
                <p style={{ color: '#718096', lineHeight: '1.6' }}>
                  Stork Pool is free for personal and commercial use. If you're planning to use it for
                  a large commercial event, we'd appreciate a Ko-fi donation to support development!
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="card" style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#718096', marginBottom: '16px' }}>
            Still have questions? Feel free to reach out!
          </p>
          <a href="/" className="btn btn-primary">
            Create Your Pool
          </a>
        </div>
      </div>
    </>
  );
}

export default FAQsPage;

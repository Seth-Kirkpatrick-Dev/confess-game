import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalPoints = (profile?.confession_points || 0) + (profile?.detection_points || 0);

  return (
    <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🤫</span>
          <span className="font-bold text-textPrimary tracking-tight">Confess</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/leaderboard"
            className="text-textSecondary hover:text-textPrimary text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            Board
          </Link>

          {user ? (
            <>
              <Link
                to="/premium"
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  profile?.is_premium
                    ? 'text-yellow-400 hover:bg-yellow-400/10'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
                }`}
              >
                {profile?.is_premium ? '⭐ Premium' : 'Upgrade'}
              </Link>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg border border-border">
                <span className="text-textSecondary text-xs">{profile?.username || 'User'}</span>
                <span className="text-violet-400 text-xs font-bold">{totalPoints}pts</span>
              </div>

              <button
                onClick={handleLogout}
                className="text-textSecondary hover:text-textPrimary text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-textSecondary hover:text-textPrimary text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="btn-primary text-xs px-4 py-2"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

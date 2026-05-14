'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/NotificationBell';
import { TierBadge } from '@/components/TierBadge';

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? 'text-textPrimary bg-white/10'
          : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    await logout();
    router.push('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 mr-1">
            <span className="text-xl">🤫</span>
            <span className="font-bold text-textPrimary tracking-tight">Confess</span>
          </Link>

          {/* Center nav — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-0.5 flex-1">
            <NavLink href="/">Feed</NavLink>
            <NavLink href="/leaderboard">Leaderboard</NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 ml-auto">
            {user ? (
              <>
                <NotificationBell />

                {/* Username + dropdown (desktop) */}
                <div className="hidden sm:block relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
                  >
                    <span className="text-textSecondary">@{profile?.username || 'you'}</span>
                    <TierBadge tier={profile?.tier} />
                    <span className="text-textSecondary text-xs ml-0.5">▾</span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      <Link
                        href={`/u/${profile?.username}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition-colors"
                      >
                        👤 View Profile
                      </Link>
                      <Link
                        href="/premium"
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-surfaceHover ${
                          profile?.is_premium ? 'text-yellow-400' : 'text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        ⭐ {profile?.is_premium ? 'Premium' : 'Upgrade'}
                      </Link>
                      <div className="border-t border-border" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-textSecondary hover:text-red-400 hover:bg-surfaceHover transition-colors"
                      >
                        → Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Hamburger (mobile only) */}
                <button
                  onClick={() => setMobileOpen(true)}
                  className="sm:hidden p-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors"
                  aria-label="Open menu"
                >
                  ☰
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-textSecondary hover:text-textPrimary text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Login
                </Link>
                <Link href="/signup" className="btn-primary text-xs px-4 py-2">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-bg flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b border-border">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-xl">🤫</span>
              <span className="font-bold text-textPrimary">Confess</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 px-4 py-6 space-y-1">
            {/* User info */}
            {user && profile && (
              <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-surface border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-textPrimary text-sm font-medium">@{profile.username}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TierBadge tier={profile.tier} showLabel />
                    <span className="text-textSecondary text-xs">
                      · {(profile.confession_points || 0) + (profile.detection_points || 0)} pts
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition-colors"
            >
              🏠 Feed
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition-colors"
            >
              🏆 Leaderboard
            </Link>
            {user && (
              <Link
                href={`/u/${profile?.username}`}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition-colors"
              >
                👤 My Profile
              </Link>
            )}
            <Link
              href="/premium"
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                profile?.is_premium
                  ? 'text-yellow-400 hover:bg-surfaceHover'
                  : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
              }`}
            >
              ⭐ {profile?.is_premium ? 'Premium' : 'Upgrade to Premium'}
            </Link>
          </div>

          {user && (
            <div className="px-4 pb-6 border-t border-border pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-textSecondary hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors text-sm"
              >
                → Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

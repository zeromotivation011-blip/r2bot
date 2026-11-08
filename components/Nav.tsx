'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MiniLogo } from './MorphingLogo';
import { useCopilot } from './CopilotProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { StreakBadge } from './StreakBadge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from './auth/AuthProvider';

type Leaf = {
  kind: 'link';
  icon: string;
  label: string;
  sub?: string;
  href: string;
  highlight?: boolean;
};
type TrackGrid = {
  kind: 'track-grid';
  parent: { icon: string; label: string; sub: string; href: string };
  tracks: { icon: string; label: string; href: string; tone: string }[];
};
type Item = Leaf | TrackGrid;
type Group = { label: string; items: Item[]; matches: string[] };

const GROUPS: Group[] = [
  {
    label: 'Learn',
    matches: ['/diagnostic', '/academy', '/atlas', '/challenge', '/copilot'],
    items: [
      {
        kind: 'track-grid',
        parent: { icon: '🎓', label: 'Academy', sub: 'Structured tracks', href: '/academy' },
        tracks: [
          { icon: '⚡', label: 'Spark · Beginner', href: '/academy/spark', tone: 'spark' },
          { icon: '🔌', label: 'Wire · Intermediate', href: '/academy/wire', tone: 'wire' },
          { icon: '🔥', label: 'Forge · Advanced', href: '/academy/forge', tone: 'forge' },
          { icon: '⚡️', label: 'Edge · Research', href: '/academy/edge', tone: 'edge' },
        ],
      },
      { kind: 'link', icon: '📚', label: 'Atlas', sub: '400+ concepts explained', href: '/atlas' },
      { kind: 'link', icon: '⚡', label: 'Daily Challenge', sub: 'Quick puzzle · streak', href: '/challenge' },
      {
        kind: 'link',
        icon: '🎯',
        label: 'Find My Level',
        sub: 'Quick placement test',
        href: '/diagnostic',
        highlight: true,
      },
      { kind: 'link', icon: '🤖', label: 'R2 Co-pilot', sub: 'AI mentor · ask anything', href: '/copilot', highlight: true },
    ],
  },
  {
    label: 'Build',
    matches: ['/build', '/visualizer', '/workspace', '/simulate', '/ros2'],
    items: [
      { kind: 'link', icon: '🤖', label: 'Robot Projects', sub: '10 guided builds · learn by doing', href: '/build', highlight: true },
      { kind: 'link', icon: '🔬', label: 'Simulators', sub: '9 interactive tools', href: '/visualizer' },
      { kind: 'link', icon: '💻', label: 'Workspace IDE', sub: 'Code & simulate', href: '/workspace' },
      { kind: 'link', icon: '🤖', label: '3D Simulation', sub: 'Webots robots', href: '/simulate' },
      { kind: 'link', icon: '🌐', label: 'ROS2 Playground', sub: 'Live shell', href: '/ros2' },
    ],
  },
  {
    label: 'Explore',
    matches: ['/lens', '/news', '/daily-life', '/blog'],
    items: [
      { kind: 'link', icon: '📚', label: 'Atlas', sub: 'Full knowledge universe', href: '/atlas' },
      { kind: 'link', icon: '🔭', label: 'Lens', sub: 'Best robotics videos, decoded', href: '/lens' },
      { kind: 'link', icon: '📰', label: 'News', sub: 'Daily robotics updates', href: '/news' },
      { kind: 'link', icon: '🌍', label: 'Robotics in Daily Life', sub: 'Robotics in everyday life', href: '/daily-life' },
      { kind: 'link', icon: '📝', label: 'Blog', sub: 'Long-form editorial', href: '/blog' },
    ],
  },
  {
    label: 'Community',
    matches: ['/lab', '/showcase', '/careers', '/about'],
    items: [
      { kind: 'link', icon: '💬', label: 'Lab', sub: 'Ask & discuss', href: '/lab' },
      { kind: 'link', icon: '🏆', label: 'Project Showcase', sub: 'Built by the community', href: '/showcase' },
      { kind: 'link', icon: '🛣️', label: 'Career Paths', sub: 'Roadmaps to robotics jobs', href: '/careers' },
      { kind: 'link', icon: '📢', label: 'About R2BOT', sub: 'Our mission', href: '/about' },
    ],
  },
];

function isActive(group: Group, pathname: string): boolean {
  return group.matches.some((m) => pathname === m || pathname.startsWith(m + '/'));
}

export function Nav() {
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [emailInitial, setEmailInitial] = useState<string>('?');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(0);
  const { openDrawer } = useCopilot();
  const navRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user);
      if (user?.email) setEmailInitial(user.email[0].toUpperCase());
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      if (session?.user?.email) setEmailInitial(session.user.email[0].toUpperCase());
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Close dropdowns on outside click + Escape.
  useEffect(() => {
    if (openIdx === null && !mobileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenIdx(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openIdx, mobileOpen]);

  // Close menus when navigating.
  useEffect(() => {
    setOpenIdx(null);
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile menu open.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const handleEnter = useCallback((i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenIdx(i);
  }, []);
  const handleLeave = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIdx(null), 120);
  }, []);

  return (
    <nav ref={navRef} className={`r2nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-wrap">
        <a href="/" className="nav-logo" aria-label="R2BOT — ROBOT, decoded">
          <MiniLogo size={36} />
          <span className="wordmark">R<span className="two">2</span>BOT</span>
        </a>

        {/* Desktop groups */}
        <div className="nav-groups" role="menubar">
          {GROUPS.map((g, i) => {
            const active = isActive(g, pathname);
            const open = openIdx === i;
            return (
              <div
                key={g.label}
                className={`nav-group ${open ? 'open' : ''} ${active ? 'active' : ''}`}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={handleLeave}
              >
                <button
                  type="button"
                  className="nav-group-trigger"
                  aria-haspopup="true"
                  aria-expanded={open}
                  onClick={() => setOpenIdx(open ? null : i)}
                >
                  {g.label}
                  <svg
                    className="nav-caret"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                  >
                    <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className={`nav-dropdown ${g.label === 'Learn' ? 'nav-dd-two-col' : ''}`} role="menu">
                  {g.label === 'Learn' ? (
                    <div className="nav-dd-cols">
                      <div className="nav-dd-col nav-dd-col-main">
                        <ul className="nav-dd-list">
                          {g.items
                            .filter((it) => it.kind !== 'link' || !it.highlight)
                            .map((item, idx) => {
                              if (item.kind === 'link') {
                                return (
                                  <li key={idx}>
                                    <a href={item.href} className="nav-dd-item" role="menuitem">
                                      <span className="nav-dd-icon" aria-hidden>{item.icon}</span>
                                      <span className="nav-dd-text">
                                        <span className="nav-dd-label">{item.label}</span>
                                        {item.sub ? <span className="nav-dd-sub">{item.sub}</span> : null}
                                      </span>
                                    </a>
                                  </li>
                                );
                              }
                              return (
                                <li key={idx} className="nav-dd-tracks-block">
                                  <a href={item.parent.href} className="nav-dd-item" role="menuitem">
                                    <span className="nav-dd-icon" aria-hidden>{item.parent.icon}</span>
                                    <span className="nav-dd-text">
                                      <span className="nav-dd-label">{item.parent.label}</span>
                                      <span className="nav-dd-sub">{item.parent.sub}</span>
                                    </span>
                                  </a>
                                  <div className="nav-dd-tracks">
                                    {item.tracks.map((t) => (
                                      <a key={t.href} href={t.href} className={`nav-dd-track tone-${t.tone}`} role="menuitem">
                                        <span aria-hidden>{t.icon}</span>
                                        <span>{t.label}</span>
                                      </a>
                                    ))}
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                        <a href="/atlas" className="nav-dd-more" role="menuitem">
                          More → discover history, famous robots, daily life
                        </a>
                      </div>
                      <div className="nav-dd-col nav-dd-col-side">
                        <p className="nav-dd-side-label">Start here</p>
                        {g.items
                          .filter((it): it is Leaf => it.kind === 'link' && !!it.highlight)
                          .map((item, idx) => (
                            <a
                              key={idx}
                              href={item.href}
                              className="nav-dd-side-card"
                              role="menuitem"
                            >
                              <span className="nav-dd-icon" aria-hidden>{item.icon}</span>
                              <span className="nav-dd-text">
                                <span className="nav-dd-label">{item.label}</span>
                                {item.sub ? <span className="nav-dd-sub">{item.sub}</span> : null}
                              </span>
                            </a>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <ul className="nav-dd-list">
                      {g.items.map((item, idx) => {
                        if (item.kind === 'link') {
                          return (
                            <li key={idx}>
                              <a
                                href={item.href}
                                className={`nav-dd-item ${item.highlight ? 'highlight' : ''}`}
                                role="menuitem"
                              >
                                <span className="nav-dd-icon" aria-hidden>
                                  {item.icon}
                                </span>
                                <span className="nav-dd-text">
                                  <span className="nav-dd-label">{item.label}</span>
                                  {item.sub ? <span className="nav-dd-sub">{item.sub}</span> : null}
                                </span>
                              </a>
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="nav-dd-tracks-block">
                            <a href={item.parent.href} className="nav-dd-item" role="menuitem">
                              <span className="nav-dd-icon" aria-hidden>
                                {item.parent.icon}
                              </span>
                              <span className="nav-dd-text">
                                <span className="nav-dd-label">{item.parent.label}</span>
                                <span className="nav-dd-sub">{item.parent.sub}</span>
                              </span>
                            </a>
                            <div className="nav-dd-tracks">
                              {item.tracks.map((t) => (
                                <a
                                  key={t.href}
                                  href={t.href}
                                  className={`nav-dd-track tone-${t.tone}`}
                                  role="menuitem"
                                >
                                  <span aria-hidden>{t.icon}</span>
                                  <span>{t.label}</span>
                                </a>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="nav-right">
          <LanguageSwitcher />

          <StreakBadge />

          <AuthMenu />

          <button type="button" className="nav-ask" onClick={openDrawer} aria-label="Ask R2 Co-pilot">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
              <circle cx="19" cy="5" r="1.4" fill="currentColor" />
            </svg>
            <span>Ask R2</span>
          </button>

          <button
            type="button"
            className="nav-hamburger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className={`hb-bars ${mobileOpen ? 'x' : ''}`} aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <div className={`nav-mobile ${mobileOpen ? 'open' : ''}`} aria-hidden={!mobileOpen}>
        <div className="nav-mobile-inner">
          {GROUPS.map((g, i) => {
            const expanded = mobileExpanded === i;
            const active = isActive(g, pathname);
            return (
              <div key={g.label} className={`nav-mob-section ${expanded ? 'open' : ''} ${active ? 'active' : ''}`}>
                <button
                  type="button"
                  className="nav-mob-head"
                  aria-expanded={expanded}
                  onClick={() => setMobileExpanded(expanded ? null : i)}
                >
                  <span>{g.label}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="nav-mob-body">
                  {g.items.map((item, idx) => {
                    if (item.kind === 'link') {
                      return (
                        <a
                          key={idx}
                          href={item.href}
                          className={`nav-mob-item ${item.highlight ? 'highlight' : ''}`}
                        >
                          <span aria-hidden>{item.icon}</span>
                          <span>
                            <strong>{item.label}</strong>
                            {item.sub ? <em>{item.sub}</em> : null}
                          </span>
                        </a>
                      );
                    }
                    return (
                      <div key={idx}>
                        <a href={item.parent.href} className="nav-mob-item">
                          <span aria-hidden>{item.parent.icon}</span>
                          <span>
                            <strong>{item.parent.label}</strong>
                            <em>{item.parent.sub}</em>
                          </span>
                        </a>
                        <div className="nav-mob-tracks">
                          {item.tracks.map((t) => (
                            <a key={t.href} href={t.href} className={`nav-mob-track tone-${t.tone}`}>
                              <span aria-hidden>{t.icon}</span>
                              <span>{t.label}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="nav-mob-foot">
            {signedIn === true ? (
              <a href="/dashboard" className="btn btn-primary">Dashboard</a>
            ) : signedIn === false ? (
              <>
                <a href="/login" className="btn btn-ghost">Login</a>
                <a href="/signup" className="btn btn-primary">Get started</a>
              </>
            ) : null}
            <button type="button" className="nav-ask wide" onClick={() => { setMobileOpen(false); openDrawer(); }}>
              Ask R2
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── AuthMenu — signed-in avatar dropdown + signed-out "Sign In" button ────
function AuthMenu() {
  const { user, profile, signOut, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={openAuthModal}
          className="nav-login"
          style={{ cursor: 'pointer' }}
        >
          Sign in
        </button>
        <a
          href="/signup"
          className="nav-cta"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            background: '#f59e0b',
            color: '#1a0f00',
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 999,
            textDecoration: 'none',
            transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.30)',
          }}
        >
          Start Free <span aria-hidden>→</span>
        </a>
      </>
    );
  }

  const name = profile?.display_name || user.email?.split('@')[0] || 'You';
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f97316, #f59e0b)',
          color: '#0A0E17', border: 'none',
          fontWeight: 900, fontSize: 14, cursor: 'pointer',
          display: 'grid', placeItems: 'center',
        }}
      >
        {initial}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
            minWidth: 220,
            background: '#111118', border: '1px solid #1f1f2a',
            borderRadius: 12, padding: 6,
            boxShadow: '0 16px 40px rgba(0,0,0,.5)',
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1f1f2a' }}>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>{name}</p>
            {user.email && <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{user.email}</p>}
          </div>
          <a href="/profile" className="auth-menu-item" onClick={() => setOpen(false)}>👤 My Profile</a>
          <a href="/profile/settings" className="auth-menu-item" onClick={() => setOpen(false)}>⚙️ Settings</a>
          <button
            type="button"
            className="auth-menu-item"
            onClick={async () => { setOpen(false); await signOut(); }}
            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            🚪 Sign out
          </button>
          <style jsx>{`
            .auth-menu-item {
              display: block; padding: 9px 12px;
              color: #e5e7eb; font-size: 13px; font-weight: 600;
              text-decoration: none; border-radius: 8px;
            }
            .auth-menu-item:hover { background: #1f1f2a; color: #fff; }
          `}</style>
        </div>
      )}
    </div>
  );
}

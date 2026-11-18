import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  FileEdit,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import { FloatingNav, type NavItem } from '@colformly/ui';

export type PortalPersona = 'org' | 'teacher' | 'student';

interface PortalShellProps {
  persona: PortalPersona;
  children: ReactNode;
}

const NAV_CONFIG: Record<
  PortalPersona,
  {
    brandTitle: string;
    brandSub: string;
    badge: string;
    items: Array<{ id: string; label: string; href: string; icon: ReactNode; badge?: string }>;
  }
> = {
  org: {
    brandTitle: 'Colformly Admin',
    brandSub: 'Aravali College',
    badge: 'ADMIN',
    items: [
      { id: 'overview', label: 'Overview', href: '/org/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'directory', label: 'Directory', href: '/org/directory', icon: <Users className="w-4 h-4" /> },
      { id: 'courses', label: 'Courses', href: '/org/courses', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'branding', label: 'Branding', href: '/org/branding', icon: <Palette className="w-4 h-4" /> },
    ],
  },
  teacher: {
    brandTitle: 'Faculty Studio',
    brandSub: 'Computer Science Dept',
    badge: 'TEACHER',
    items: [
      { id: 't-dash', label: 'Dashboard', href: '/teacher/dashboard', icon: <Home className="w-4 h-4" /> },
      { id: 't-classes', label: 'Classes & Autopsy', href: '/teacher/classes', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 't-studio', label: 'Test Studio', href: '/teacher/test-studio', icon: <FileEdit className="w-4 h-4" />, badge: 'AI' },
      { id: 't-settings', label: 'Settings', href: '/teacher/settings', icon: <Settings className="w-4 h-4" /> },
    ],
  },
  student: {
    brandTitle: 'Colformly',
    brandSub: 'B.Tech CSE • Year 2',
    badge: 'STUDENT',
    items: [
      { id: 's-home', label: 'Home', href: '/student/dashboard', icon: <Home className="w-4 h-4" /> },
      { id: 's-ranks', label: 'Leaderboard', href: '/student/leaderboard', icon: <Trophy className="w-4 h-4" /> },
      { id: 's-res', label: 'Result Sheet', href: '/student/results/cs-301-midterm', icon: <GraduationCap className="w-4 h-4" />, badge: 'New' },
    ],
  },
};

export function PortalShell({ persona, children }: PortalShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { layoutMode, applyPreset } = useTheme();
  const { profile, signOut } = useAuth();
  const cfg = NAV_CONFIG[persona];

  const items: NavItem[] = cfg.items.map((item) => ({
    ...item,
    active:
      location.pathname === item.href ||
      (item.id === 's-res' && location.pathname.startsWith('/student/results')),
  }));

  const isStudent = persona === 'student';
  const isFloating = layoutMode === 'floating';

  const switchPersona = (next: PortalPersona) => {
    if (next === 'student') {
      applyPreset('gamified');
      navigate('/student/dashboard');
    } else if (next === 'teacher') {
      applyPreset('default');
      navigate('/teacher/dashboard');
    } else {
      applyPreset('default');
      navigate('/org/dashboard');
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors ${
        isStudent ? 'bg-cream-bg' : 'bg-slate-50'
      }`}
    >
      <FloatingNav
        variant="sidebar"
        brand={
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 bg-primary text-white flex items-center justify-center font-headline font-extrabold text-base shadow-sm ${
                isStudent ? 'rounded-2xl' : 'rounded-xl'
              }`}
            >
              {isStudent ? '🚀' : 'C'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-headline font-bold text-sm text-slate-900 truncate">
                  {cfg.brandTitle}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold tracking-wider">
                  {cfg.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{cfg.brandSub}</p>
            </div>
          </div>
        }
        items={items}
        renderLink={(item, className, content) => (
          <Link to={item.href || '/'} className={className}>
            {content}
          </Link>
        )}
        footer={
          <div className="space-y-3">
            {/* Quick Role Portal Switcher */}
            <div className="p-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'org', label: 'Admin' },
                  { id: 'teacher', label: 'Teacher' },
                  { id: 'student', label: 'Student' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => switchPersona(r.id)}
                  className={`py-1.5 rounded-lg text-[11px] font-label font-bold transition-all ${
                    persona === r.id
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-xs font-headline font-bold text-slate-900 truncate">
                  {profile?.full_name ||
                    (persona === 'org'
                      ? 'Admin Principal'
                      : persona === 'teacher'
                        ? 'Prof. Sarah Mitchell'
                        : 'Alex Verma')}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {profile?.email || `${persona}@aravali.edu.in`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign Out"
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-10 transition-all ${
          isFloating ? 'md:ml-[280px]' : ''
        }`}
      >
        {/* Mobile Role Switcher Strip */}
        <div className="md:hidden mb-4 flex items-center justify-between gap-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-headline font-bold text-slate-900 pl-2">
            {cfg.brandTitle}
          </span>
          <div className="flex gap-1">
            {(['org', 'teacher', 'student'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => switchPersona(r)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-label font-bold ${
                  persona === r ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {r === 'org' ? 'Admin' : r === 'teacher' ? 'Teacher' : 'Student'}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

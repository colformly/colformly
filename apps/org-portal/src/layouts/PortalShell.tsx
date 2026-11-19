import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileEdit,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Palette,
  Rocket,
  Settings,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import type { Course } from '@colformly/types';
import { BaseModal, Button, FloatingNav, type NavItem } from '@colformly/ui';

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
  const { layoutMode, classes } = useTheme();
  const { user, profile, role, memberships, orgId, refreshProfile, signOut } = useAuth();
  const cfg = NAV_CONFIG[persona];

  // Student Onboarding State
  const [courses, setCourses] = useState<Course[]>([]);
  const [rollNumber, setRollNumber] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [demoOnboarded, setDemoOnboarded] = useState(false);

  const activeMembership = memberships.find((m) => m.org_id === orgId) || memberships[0];
  const isStudent = persona === 'student';
  const isFloating = layoutMode === 'floating';

  // Check if current student requires first-time onboarding
  const requiresOnboarding =
    isStudent &&
    !demoOnboarded &&
    Boolean(activeMembership && activeMembership.onboarding_completed === false);

  // Fetch courses from Supabase for cascading dropdowns
  useEffect(() => {
    let isMounted = true;
    const loadCourses = async () => {
      try {
        const { data, error } = await (supabase.from('courses') as any).select('*').order('name');
        if (!error && data && data.length > 0 && isMounted) {
          setCourses(data as Course[]);
        }
      } catch (err) {
        console.warn('Error loading courses:', err);
      }
    };
    void loadCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter cascading course levels
  const courseOptions = courses.filter((c) => c.level === 'COURSE');
  const yearOptions = courses.filter(
    (c) => c.level === 'YEAR' && (!selectedCourseId || c.parent_id === selectedCourseId),
  );
  const sectionOptions = courses.filter(
    (c) => c.level === 'SECTION' && (!selectedYearId || c.parent_id === selectedYearId),
  );

  // Auto-select cascading defaults if not set
  useEffect(() => {
    if (courseOptions.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courseOptions[0].id);
    }
  }, [courseOptions, selectedCourseId]);

  useEffect(() => {
    if (yearOptions.length > 0 && (!selectedYearId || !yearOptions.some((y) => y.id === selectedYearId))) {
      setSelectedYearId(yearOptions[0].id);
    }
  }, [yearOptions, selectedYearId]);

  useEffect(() => {
    if (sectionOptions.length > 0 && (!selectedSectionId || !sectionOptions.some((s) => s.id === selectedSectionId))) {
      setSelectedSectionId(sectionOptions[0].id);
    }
  }, [sectionOptions, selectedSectionId]);

  // Clean roll number (alphanumeric uppercase only)
  const formatRollNumber = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const formattedRollPreview = formatRollNumber(rollNumber);

  const handleStudentOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedRoll = formatRollNumber(rollNumber);
    if (!cleanedRoll) {
      setOnboardingError('Please enter your university/college Roll Number.');
      return;
    }
    if (!selectedSectionId) {
      setOnboardingError('Please select your assigned Class Section.');
      return;
    }

    setSubmittingOnboarding(true);
    setOnboardingError(null);

    try {
      if (activeMembership) {
        const { error: updateErr } = await (supabase.from('org_users') as any)
          .update({
            roll_number: cleanedRoll,
            section_id: selectedSectionId,
            onboarding_completed: true,
          })
          .eq('id', activeMembership.id);

        if (updateErr) {
          setOnboardingError(updateErr.message);
          setSubmittingOnboarding(false);
          return;
        }

        await refreshProfile();
      }
      setDemoOnboarded(true);
      setSubmittingOnboarding(false);

      // Check if student had a pending exam link
      const pendingCode = sessionStorage.getItem('pending_exam_code');
      if (pendingCode) {
        sessionStorage.removeItem('pending_exam_code');
        navigate(`/student/dashboard?code=${encodeURIComponent(pendingCode)}`, { replace: true });
      }
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : 'Failed to save student profile.');
      setSubmittingOnboarding(false);
    }
  };

  const items: NavItem[] = cfg.items.map((item) => ({
    ...item,
    active:
      location.pathname === item.href ||
      (item.id === 's-res' && location.pathname.startsWith('/student/results')),
  }));

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    navigate('/login', { replace: true });
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
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold tracking-wider uppercase">
                  {role || cfg.badge}
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
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-headline font-bold text-slate-900 truncate">
                  {profile?.full_name || user?.user_metadata?.full_name || 'Campus Member'}
                </p>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[9px] font-mono font-bold text-slate-600 uppercase">
                  {role || persona}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {profile?.email || user?.email || `${persona}@aravali.edu.in`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              title="Sign Out"
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-10 transition-all ${
          isFloating ? 'md:ml-[280px]' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* STUDENT FIRST-TIME SELF-ONBOARDING MODAL */}
      <BaseModal
        open={requiresOnboarding}
        onClose={() => {}}
        hideCloseButton={true}
        closeOnBackdrop={false}
        size="md"
        className="rounded-3xl border-2 border-teal-200 shadow-student-card p-2"
      >
        <div className="space-y-6 p-2">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-teal-50 border-2 border-teal-200 text-primary flex items-center justify-center text-2xl mx-auto shadow-sm">
              <Rocket className="w-7 h-7 text-primary animate-bounce" />
            </div>
            <h2 className="font-headline font-extrabold text-2xl text-slate-900 tracking-tight">
              Welcome to Your Campus Portal! 🎓
            </h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Please enter your campus roll number and select your enrolled section to link your exams, rankings &amp; diagnostic sheets.
            </p>
          </div>

          {onboardingError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {onboardingError}
            </div>
          )}

          <form onSubmit={handleStudentOnboardingSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-label font-bold text-slate-700">
                  Roll Number / Student ID
                </label>
                {formattedRollPreview && (
                  <span className="text-[11px] font-mono text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                    Preview: {formattedRollPreview}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 24-CSE-041"
                className={`w-full px-4 py-3 text-sm font-mono uppercase ${classes.input}`}
              />
              {rollNumber.trim() && formattedRollPreview !== rollNumber.trim() && (
                <p className="mt-1.5 text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <span>Normalized:</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                    {formattedRollPreview}
                  </span>
                </p>
              )}
            </div>

            {/* Cascading Dropdowns: Course -> Year -> Section */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                  1. Degree / Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                  }}
                  className={`w-full px-4 py-2.5 text-xs font-semibold ${classes.input}`}
                >
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                  {courseOptions.length === 0 && (
                    <option value="demo-course">B.Tech Computer Science &amp; Engineering</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                    2. Academic Year
                  </label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => {
                      setSelectedYearId(e.target.value);
                    }}
                    className={`w-full px-4 py-2.5 text-xs font-semibold ${classes.input}`}
                  >
                    {yearOptions.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                    {yearOptions.length === 0 && (
                      <option value="demo-year">Year 2 (Sophomore)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                    3. Assigned Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs font-semibold ${classes.input}`}
                  >
                    {sectionOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    {sectionOptions.length === 0 && (
                      <option value="demo-sec">Section A</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                size="lg"
                isLoading={submittingOnboarding}
                className="w-full justify-center rounded-2xl bg-primary text-white font-label font-bold text-sm shadow-md"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Complete Campus Onboarding
              </Button>
            </div>
          </form>
        </div>
      </BaseModal>
    </div>
  );
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, FileEdit, GraduationCap, Home, LayoutDashboard, LogOut, Palette, Settings, Trophy, Users, } from 'lucide-react';
import { useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import { FloatingNav } from '@colformly/ui';
const NAV_CONFIG = {
    org: {
        brandTitle: 'Colformly Admin',
        brandSub: 'Aravali College',
        badge: 'ADMIN',
        items: [
            { id: 'overview', label: 'Overview', href: '/org/dashboard', icon: _jsx(LayoutDashboard, { className: "w-4 h-4" }) },
            { id: 'directory', label: 'Directory', href: '/org/directory', icon: _jsx(Users, { className: "w-4 h-4" }) },
            { id: 'courses', label: 'Courses', href: '/org/courses', icon: _jsx(BookOpen, { className: "w-4 h-4" }) },
            { id: 'branding', label: 'Branding', href: '/org/branding', icon: _jsx(Palette, { className: "w-4 h-4" }) },
        ],
    },
    teacher: {
        brandTitle: 'Faculty Studio',
        brandSub: 'Computer Science Dept',
        badge: 'TEACHER',
        items: [
            { id: 't-dash', label: 'Dashboard', href: '/teacher/dashboard', icon: _jsx(Home, { className: "w-4 h-4" }) },
            { id: 't-classes', label: 'Classes & Autopsy', href: '/teacher/classes', icon: _jsx(BarChart3, { className: "w-4 h-4" }) },
            { id: 't-studio', label: 'Test Studio', href: '/teacher/test-studio', icon: _jsx(FileEdit, { className: "w-4 h-4" }), badge: 'AI' },
            { id: 't-settings', label: 'Settings', href: '/teacher/settings', icon: _jsx(Settings, { className: "w-4 h-4" }) },
        ],
    },
    student: {
        brandTitle: 'Colformly',
        brandSub: 'B.Tech CSE • Year 2',
        badge: 'STUDENT',
        items: [
            { id: 's-home', label: 'Home', href: '/student/dashboard', icon: _jsx(Home, { className: "w-4 h-4" }) },
            { id: 's-ranks', label: 'Leaderboard', href: '/student/leaderboard', icon: _jsx(Trophy, { className: "w-4 h-4" }) },
            { id: 's-res', label: 'Result Sheet', href: '/student/results/cs-301-midterm', icon: _jsx(GraduationCap, { className: "w-4 h-4" }), badge: 'New' },
        ],
    },
};
export function PortalShell({ persona, children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { layoutMode, applyPreset } = useTheme();
    const { profile, signOut } = useAuth();
    const cfg = NAV_CONFIG[persona];
    const items = cfg.items.map((item) => ({
        ...item,
        active: location.pathname === item.href ||
            (item.id === 's-res' && location.pathname.startsWith('/student/results')),
    }));
    const isStudent = persona === 'student';
    const isFloating = layoutMode === 'floating';
    const switchPersona = (next) => {
        if (next === 'student') {
            applyPreset('gamified');
            navigate('/student/dashboard');
        }
        else if (next === 'teacher') {
            applyPreset('default');
            navigate('/teacher/dashboard');
        }
        else {
            applyPreset('default');
            navigate('/org/dashboard');
        }
    };
    return (_jsxs("div", { className: `min-h-screen flex flex-col md:flex-row transition-colors ${isStudent ? 'bg-cream-bg' : 'bg-slate-50'}`, children: [_jsx(FloatingNav, { variant: "sidebar", brand: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-10 h-10 bg-primary text-white flex items-center justify-center font-headline font-extrabold text-base shadow-sm ${isStudent ? 'rounded-2xl' : 'rounded-xl'}`, children: isStudent ? '🚀' : 'C' }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "font-headline font-bold text-sm text-slate-900 truncate", children: cfg.brandTitle }), _jsx("span", { className: "px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold tracking-wider", children: cfg.badge })] }), _jsx("p", { className: "text-xs text-slate-500 truncate", children: cfg.brandSub })] })] }), items: items, renderLink: (item, className, content) => (_jsx(Link, { to: item.href || '/', className: className, children: content })), footer: _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "p-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 grid grid-cols-3 gap-1", children: [
                                { id: 'org', label: 'Admin' },
                                { id: 'teacher', label: 'Teacher' },
                                { id: 'student', label: 'Student' },
                            ].map((r) => (_jsx("button", { type: "button", onClick: () => switchPersona(r.id), className: `py-1.5 rounded-lg text-[11px] font-label font-bold transition-all ${persona === r.id
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'}`, children: r.label }, r.id))) }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-1", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-headline font-bold text-slate-900 truncate", children: profile?.full_name ||
                                                (persona === 'org'
                                                    ? 'Admin Principal'
                                                    : persona === 'teacher'
                                                        ? 'Prof. Sarah Mitchell'
                                                        : 'Alex Verma') }), _jsx("p", { className: "text-[11px] text-slate-500 truncate", children: profile?.email || `${persona}@aravali.edu.in` })] }), _jsx("button", { type: "button", onClick: () => void signOut(), title: "Sign Out", className: "p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors", children: _jsx(LogOut, { className: "w-4 h-4" }) })] })] }) }), _jsxs("main", { className: `flex-1 min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-10 transition-all ${isFloating ? 'md:ml-[280px]' : ''}`, children: [_jsxs("div", { className: "md:hidden mb-4 flex items-center justify-between gap-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm", children: [_jsx("span", { className: "text-xs font-headline font-bold text-slate-900 pl-2", children: cfg.brandTitle }), _jsx("div", { className: "flex gap-1", children: ['org', 'teacher', 'student'].map((r) => (_jsx("button", { type: "button", onClick: () => switchPersona(r), className: `px-2.5 py-1 rounded-full text-[11px] font-label font-bold ${persona === r ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`, children: r === 'org' ? 'Admin' : r === 'teacher' ? 'Teacher' : 'Student' }, r))) })] }), _jsx("div", { className: "max-w-6xl mx-auto", children: children })] })] }));
}
//# sourceMappingURL=PortalShell.js.map
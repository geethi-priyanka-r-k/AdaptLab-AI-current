import { Activity, ChevronDown, CircleHelp, Gauge, LayoutGrid, LogOut, PanelLeft, Settings, ShieldCheck, TerminalSquare, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/projects', label: 'Projects', icon: LayoutGrid },
  { href: '/settings', label: 'Workspace settings', icon: Settings },
];

export function Logo({ light = false }: { light?: boolean }) {
  return <div className="flex items-center gap-2.5" data-testid="brand-adaptlab">
    <span className={`flex h-8 w-8 items-center justify-center rounded-md ${light ? 'bg-[#30cdb7] text-[#132335]' : 'bg-[#173d4a] text-[#5fe3cb]'}`}>
      <TerminalSquare size={17} strokeWidth={2.5} />
    </span>
    <span className={`font-display text-[17px] font-semibold tracking-[-.02em] ${light ? 'text-white' : 'text-[#173041]'}`}>adaptlab <span className={light ? 'text-[#5fe3cb]' : 'text-[#168a7a]'}>AI</span></span>
  </div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, signOut } = useAuth();
  const projectMatch = location.match(/^\/projects\/([^/]+)$/);
  return <div className="flex min-h-[100dvh] bg-[#f4f7f8]">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[252px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 transition-transform md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} data-testid="sidebar-navigation">
      <div className="flex items-center justify-between px-2">
        <Link href="/" data-testid="link-sidebar-home"><Logo light /></Link>
        <button onClick={() => setMobileOpen(false)} className="text-slate-400 md:hidden" aria-label="Close menu" data-testid="button-close-menu"><X size={18}/></button>
      </div>
      <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Workspace</div>
      <nav className="mt-3 space-y-1" aria-label="Primary navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href || (href === '/projects' && location.startsWith('/projects/'));
          return <Link href={href} key={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-[hsl(var(--sidebar-accent))] text-white' : 'text-slate-400 hover:bg-[hsl(var(--sidebar-accent))] hover:text-slate-100'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
            <Icon size={16} className={active ? 'text-[#55d9c4]' : 'text-slate-500 group-hover:text-[#55d9c4]'} />{label}
          </Link>;
        })}
      </nav>
      <div className="mt-auto space-y-5">
        <div className="rounded-lg border border-slate-700/70 bg-slate-800/35 p-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-[#53d7bf]" /> API gateway connected</div>
          <div className="mt-2 font-mono text-[10px] text-slate-500">eu-west-1 / stable</div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-700/70 px-2 pt-4">
           <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#29505e] text-[11px] font-semibold text-[#a8eee2]">{(session?.user.user_metadata?.display_name ?? session?.user.email ?? 'U').slice(0, 2).toUpperCase()}</div>
           <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-200">{session?.user.user_metadata?.display_name ?? session?.user.email ?? 'Workspace user'}</div><div className="truncate text-[10px] text-slate-500">Workspace member</div></div>
           <button onClick={() => void signOut().then(() => setLocation('/login'))} className="text-slate-500 hover:text-slate-200" aria-label="Sign out" data-testid="button-sign-out"><LogOut size={15}/></button>
        </div>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-20 bg-[#0e1d2a]/45 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-navigation-overlay" />}
    <main className="min-w-0 flex-1">
      <header className="flex h-[68px] items-center justify-between border-b border-[#dce5e8] bg-[#f7f9fa]/90 px-5 backdrop-blur md:px-9">
        <button className="text-[#426171] md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><PanelLeft size={20}/></button>
        <div className="hidden items-center gap-2 text-xs text-[#66808c] md:flex"><span className="font-mono text-[11px] text-[#9aaeb5]">ADAPTLAB /</span><span>{location === '/dashboard' ? 'overview' : location.replace('/', '').replaceAll('/', ' / ')}</span></div>
        <div className="ml-auto flex items-center gap-5">
          {projectMatch && <div className="hidden items-center gap-2 border-r border-[#dce5e8] pr-5 sm:flex"><Link href={`/projects/${projectMatch[1]}/contract`} className="text-xs font-medium text-[#637985] hover:text-[#168a7a]" data-testid="link-header-contract">Contract</Link><Link href={`/projects/${projectMatch[1]}/tests`} className="text-xs font-medium text-[#637985] hover:text-[#168a7a]" data-testid="link-header-tests">Test runs</Link></div>}
          <button className="flex items-center gap-2 text-xs text-[#637985] hover:text-[#173041]" data-testid="button-help"><CircleHelp size={16}/> Help center</button>
          <button className="flex items-center gap-1.5 border-l border-[#dce5e8] pl-5 text-xs font-medium text-[#355160]" data-testid="button-workspace-menu">resilience-lab <ChevronDown size={13}/></button>
        </div>
      </header>{children}
    </main>
  </div>;
}

export function StatusDot({ status }: { status: 'active' | 'paused' | 'healthy' | 'unknown' }) {
  const active = status === 'active' || status === 'healthy';
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[.08em] text-[#5d727c]"><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#22ae95]' : status === 'paused' ? 'bg-[#e2a13b]' : 'bg-[#a7b4b8]'}`} />{status}</span>;
}

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow && <div className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#1b9c89]">{eyebrow}</div>}<h1 className="font-display text-[27px] font-semibold tracking-[-.04em] text-[#173041]">{title}</h1>{detail && <p className="mt-1 text-sm text-[#6b8089]">{detail}</p>}</div>{action}
  </div>;
}
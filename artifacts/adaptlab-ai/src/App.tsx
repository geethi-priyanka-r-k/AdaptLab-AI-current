import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppShell, Logo } from '@/components/app-shell';
import { AuthPage } from '@/pages/auth';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { DashboardPage, ProjectDetailsPage, ProjectsPage, SettingsPage } from '@/pages/app-pages';
import { ContractPage, NewTestRunPage, TestRunsPage, TestRunDetailPage } from '@/pages/phase-two-pages';
import { ArrowRight, Activity, CheckCircle2, ShieldCheck, TerminalSquare } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !session) setLocation('/login');
  }, [isLoading, session, setLocation]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f8] text-sm text-[#6b8089]">
        {isLoading ? 'Loading workspace…' : 'Redirecting to sign in…'}
      </div>
    );
  }

  return <>{children}</>;
}

function Home() {
  return <div className="min-h-[100dvh] bg-[#f4f7f8] text-[#173041]">
    <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-8"><Logo/><div className="flex items-center gap-5"><a href="#signal" className="hidden text-xs font-medium text-[#6d818a] hover:text-[#173041] sm:block" data-testid="link-landing-signal">How it works</a><a href="/login" className="text-xs font-semibold text-[#365866]" data-testid="link-landing-login">Sign in</a><a href="/signup" className="inline-flex items-center gap-2 rounded-md bg-[#173d4a] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#215566]" data-testid="link-landing-start">Start a workspace <ArrowRight size={14}/></a></div></header>
    <main>
      <section className="grid-lines relative overflow-hidden border-y border-[#dce6e8]"><div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div className="animate-rise"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#b9ded8] bg-[#e9f7f4] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-[#168a7a]"><span className="h-1.5 w-1.5 rounded-full bg-[#22ae95]"/> Infrastructure signal layer</div><h1 className="max-w-[690px] font-display text-[clamp(3rem,7vw,5.8rem)] font-semibold leading-[.94] tracking-[-.075em] text-[#173041]">Resilience you can<br/><span className="text-[#178d7b]">release against.</span></h1><p className="mt-7 max-w-[510px] text-[16px] leading-7 text-[#607781]">AdaptLab gives engineering teams a calm, exact view of the external systems their applications depend on — before those systems become the incident.</p><div className="mt-9 flex flex-wrap gap-3"><a href="/signup" className="inline-flex items-center gap-2 rounded-md bg-[#173d4a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#215566]" data-testid="button-landing-start">Create your workspace <ArrowRight size={16}/></a><a href="#signal" className="inline-flex items-center gap-2 rounded-md border border-[#c9dadd] bg-white px-5 py-3 text-sm font-semibold text-[#3e606d] hover:bg-[#edf5f4]" data-testid="button-landing-learn">See the signal model</a></div><div className="mt-10 flex items-center gap-6 font-mono text-[10px] uppercase tracking-[.1em] text-[#8ba0a7]"><span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-[#1eae96]"/> No noisy dashboards</span><span className="flex items-center gap-2"><ShieldCheck size={13} className="text-[#1eae96]"/> Evidence first</span></div></div><div className="animate-rise-2 relative"><div className="absolute -inset-8 rounded-full bg-[#9edfd3]/15 blur-3xl"/><div className="relative rounded-xl border border-[#315663] bg-[#173041] p-4 shadow-[0_24px_65px_rgba(23,48,65,.22)]"><div className="flex items-center justify-between border-b border-white/10 pb-3"><div className="flex items-center gap-2 font-mono text-[10px] text-slate-400"><TerminalSquare size={14} className="text-[#58d8c2]"/> ADAPTLAB / OVERVIEW</div><span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#60dac6]"><span className="h-1.5 w-1.5 rounded-full bg-[#57d8c1]"/> live workspace</span></div><div className="mt-5 grid grid-cols-3 gap-2">{[['03','projects'],['—','pass rate'],['00','violations']].map(([v,l]) => <div className="rounded-md border border-white/10 bg-[#1d3c4b] p-3" key={l}><div className="font-display text-2xl font-semibold text-white">{v}</div><div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">{l}</div></div>)}</div><div className="mt-3 rounded-md border border-white/10 bg-[#1b3746] p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-300">External dependency map</span><span className="font-mono text-[9px] text-[#58d8c2]">READY</span></div><div className="mt-5 flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#397c82] bg-[#224e5a] text-[#71e1ce]"><Activity size={19}/></div><div className="h-px flex-1 border-t border-dashed border-[#4f7c84]"/><div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#c18b3e] bg-[#55452d] text-[#f3bc61]"><ShieldCheck size={19}/></div><div className="h-px flex-1 border-t border-dashed border-[#4f7c84]"/><div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#397c82] bg-[#224e5a] text-[#71e1ce]"><TerminalSquare size={19}/></div></div><div className="mt-3 flex justify-between font-mono text-[9px] text-slate-500"><span>application</span><span>external system</span><span>signal layer</span></div></div><div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-slate-500"><span className="text-[#59d8c1]">›</span> awaiting first test run<span className="ml-auto">00:00:04</span></div></div></div></div></section>
      <section id="signal" className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[#1b9c89]">The signal model</div><h2 className="mt-3 max-w-[380px] font-display text-4xl font-semibold leading-tight tracking-[-.06em]">Less surface area.<br/>Better decisions.</h2><p className="mt-5 max-w-[360px] text-sm leading-6 text-[#6d818a]">AdaptLab is built for the moment between “it should be fine” and shipping with confidence.</p></div><div className="grid gap-4 sm:grid-cols-3"><div className="border-t-2 border-[#26ab96] pt-4"><div className="font-mono text-sm text-[#1b9c89]">01 / MAP</div><h3 className="mt-10 font-display text-lg font-semibold">Name the dependency</h3><p className="mt-2 text-sm leading-6 text-[#71858e]">A clear project profile for each external system that can change your release outcome.</p></div><div className="border-t-2 border-[#e2a13b] pt-4"><div className="font-mono text-sm text-[#be7d17]">02 / TEST</div><h3 className="mt-10 font-display text-lg font-semibold">Probe the edges</h3><p className="mt-2 text-sm leading-6 text-[#71858e]">Controlled resilience checks expose behavior that happy-path monitoring misses.</p></div><div className="border-t-2 border-[#5779bc] pt-4"><div className="font-mono text-sm text-[#5779bc]">03 / DECIDE</div><h3 className="mt-10 font-display text-lg font-semibold">Release with evidence</h3><p className="mt-2 text-sm leading-6 text-[#71858e]">One signal surface for pass rates, violations, and the next action worth taking.</p></div></div></div></section>
      <section className="border-y border-[#dce6e8] bg-[#eaf3f2]"><div className="mx-auto grid max-w-[1240px] gap-7 px-5 py-14 md:grid-cols-[1fr_auto] md:items-center md:px-8"><div><div className="font-mono text-[10px] uppercase tracking-[.16em] text-[#1b9c89]">Start with the known</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em]">Your first dependency is already waiting.</h2><p className="mt-2 text-sm text-[#6d818a]">Create a workspace and make one external system explicit.</p></div><a href="/signup" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#173d4a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#215566]" data-testid="button-landing-create">Create a project <ArrowRight size={16}/></a></div></section>
    </main><footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-xs text-[#8ba0a7] sm:flex-row sm:items-center sm:justify-between md:px-8"><Logo/><span className="font-mono text-[10px]">PRIVATE BETA / BUILD 0.8.4</span></footer>
  </div>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login"><AuthPage mode="login" /></Route>
        <Route path="/signup"><AuthPage mode="signup" /></Route>
        <Route path="/dashboard"><ProtectedRoute><DashboardPage /></ProtectedRoute></Route>
        <Route path="/projects"><ProtectedRoute><ProjectsPage /></ProtectedRoute></Route>
        <Route path="/projects/:id"><ProtectedRoute><ProjectDetailsPage /></ProtectedRoute></Route>
        <Route path="/projects/:id/contract"><ProtectedRoute><ContractPage /></ProtectedRoute></Route>
        <Route path="/projects/:id/tests"><ProtectedRoute><TestRunsPage /></ProtectedRoute></Route>
        <Route path="/projects/:id/tests/new"><ProtectedRoute><NewTestRunPage /></ProtectedRoute></Route>
        <Route path="/projects/:id/tests/:testId"><ProtectedRoute><TestRunDetailPage /></ProtectedRoute></Route>
        <Route path="/settings"><ProtectedRoute><SettingsPage /></ProtectedRoute></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;

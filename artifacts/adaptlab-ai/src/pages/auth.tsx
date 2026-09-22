import { ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, TerminalSquare } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Logo } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [, setLocation] = useLocation();
  const { signIn, signUp, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!isConfigured) {
      setError('Authentication is not configured for this workspace.');
      return;
    }
    setSubmitted(true);
    try {
      if (signup) {
        const result = await signUp(email, password, name);
        if (result.confirmationRequired) {
          setError('Check your email to confirm your account, then sign in.');
          setSubmitted(false);
          return;
        }
      } else {
        await signIn(email, password);
      }
      setLocation('/dashboard');
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : 'Authentication failed.',
      );
      setSubmitted(false);
    }
  };
  const signup = mode === 'signup';
  return <div className="min-h-[100dvh] bg-[#112433] text-white">
    <div className="mx-auto grid min-h-[100dvh] max-w-[1480px] lg:grid-cols-[1.05fr_.95fr]">
      <section className="grid-lines relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" data-testid="link-auth-logo"><Logo light /></Link>
        <div className="relative max-w-[530px] pb-10">
          <div className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#68dbc8]"><span className="h-px w-8 bg-[#43cbb5]"/> release confidence infrastructure</div>
          <h1 className="font-display text-6xl font-semibold leading-[.97] tracking-[-.065em]">Know what breaks<br/><span className="text-[#55d9c4]">before users do.</span></h1>
          <p className="mt-7 max-w-[410px] text-[15px] leading-7 text-slate-400">AdaptLab maps external systems under test, then gives your team a precise place to see resilience signals as they change.</p>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            {['One workspace for every external dependency', 'Evidence-led project configuration', 'Testing and AI analysis, phased in deliberately'].map(item => <div className="flex items-center gap-3" key={item}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1b4b56] text-[#63dfca]"><Check size={12}/></span>{item}</div>)}
          </div>
        </div>
        <div className="font-mono text-[10px] text-slate-500">BUILD 0.8.4 / PRIVATE BETA</div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-12 lg:hidden"><Link href="/" data-testid="link-auth-logo-mobile"><Logo light /></Link></div>
          <div className="mb-9"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[#2c5361] bg-[#173544] text-[#5fe3cb]"><ShieldCheck size={20}/></div><h2 className="font-display text-3xl font-semibold tracking-[-.04em]">{signup ? 'Create your workspace' : 'Welcome back'}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{signup ? 'Start with a clear map of the systems your team depends on.' : 'Sign in to review your release confidence and project signals.'}</p></div>
          <form onSubmit={submit} className="space-y-4">
            {signup && <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Your name</span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required className="h-11 w-full rounded-md border border-[#34515d] bg-[#172f3e] px-3 text-sm text-white outline-none transition focus:border-[#52d8c2] focus:ring-2 focus:ring-[#52d8c2]/15" placeholder="Mara Rivera" data-testid="input-name"/></label>}
            <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Work email</span><div className="relative"><Mail size={16} className="absolute left-3 top-3.5 text-slate-500"/><input autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 w-full rounded-md border border-[#34515d] bg-[#172f3e] pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#52d8c2] focus:ring-2 focus:ring-[#52d8c2]/15" placeholder="you@company.com" data-testid="input-email"/></div></label>
             <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">{signup ? 'Create password' : 'Password'}</span><div className="relative"><LockKeyhole size={16} className="absolute left-3 top-3.5 text-slate-500"/><input autoComplete={signup ? 'new-password' : 'current-password'} type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-11 w-full rounded-md border border-[#34515d] bg-[#172f3e] pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#52d8c2] focus:ring-2 focus:ring-[#52d8c2]/15" placeholder="••••••••••" data-testid="input-password"/></div></label>
             {error && <div className="rounded-md border border-[#8f4e54] bg-[#4b2d38] px-3 py-2 text-xs leading-5 text-[#ffd5d5]" role="alert" data-testid="error-auth">{error}</div>}
            <button disabled={submitted} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#43cbb5] text-sm font-semibold text-[#112433] transition hover:bg-[#67dec9] disabled:opacity-70" data-testid="button-submit-auth">{submitted ? 'Opening workspace…' : signup ? 'Create workspace' : 'Sign in'} {!submitted && <ArrowRight size={16}/>}</button>
          </form>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-slate-400">{signup ? 'Already have a workspace?' : 'New to AdaptLab?'} <Link href={signup ? '/login' : '/signup'} className="font-medium text-[#5fe3cb] hover:text-white" data-testid="link-auth-switch">{signup ? 'Sign in' : 'Create an account'}</Link></div>
          <div className="mt-8 flex gap-3 rounded-md border border-[#294652] bg-[#152d3b] p-3 text-xs leading-5 text-slate-400"><TerminalSquare size={16} className="mt-0.5 shrink-0 text-[#58d8c2]"/><span><strong className="font-medium text-slate-200">Phased capabilities.</strong> Live testing and AI analysis are being introduced in controlled releases. Your project configuration is available now.</span></div>
        </div>
      </section>
    </div>
  </div>;
}
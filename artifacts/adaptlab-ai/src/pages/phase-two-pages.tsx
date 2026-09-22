import { useMemo, useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, ExternalLink, 
  Loader2, RefreshCw, ShieldAlert, Activity, AlertTriangle, TrendingUp, 
  TrendingDown, Minus, FileText, Brain, Zap 
} from 'lucide-react';
import { 
  getGetProjectQueryKey, 
  getListTestRunsQueryKey, 
  getGetTestRunQueryKey,
  useGetProject,
  useListTestRuns,
  useGetTestRun
} from '@workspace/api-client-react';
import { AppShell, SectionHeading, StatusDot } from '@/components/app-shell';

const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '—';
const formatBytes = (bytes: number | null) => bytes ? `${(bytes / 1024).toFixed(1)} KB` : '—';
const formatMs = (ms: number | null) => ms ? `${ms.toFixed(0)} ms` : '—';

export function ContractPage() {
  const { id = '' } = useParams<{ id: string }>();
  const projectQuery = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const project = projectQuery.data;

  return <AppShell><div className="mx-auto max-w-[1100px] p-5 md:p-9">
    <Link href={`/projects/${id}`} className="mb-7 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c7681] hover:text-[#168a7a]">
      <ArrowLeft size={14}/> Back to project
    </Link>
    <SectionHeading eyebrow="Adaptive Contract" title="Contract Configuration" detail="Define resilience thresholds for this external system."/>
    <div className="mt-8 rounded-lg border border-[#dce6e8] bg-white p-6">
      <div className="text-center py-12">
        <ShieldAlert size={32} className="mx-auto text-[#8ba0a7]"/>
        <h3 className="mt-4 text-sm font-semibold text-[#294653]">Contract Builder</h3>
        <p className="mt-2 text-xs text-[#82969e]">Configure adaptive contract profiles (Low, Medium, High) for resilience testing.</p>
      </div>
    </div>
  </div></AppShell>;
}

export function TestRunsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const projectQuery = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const runsQuery = useListTestRuns(id, { query: { enabled: !!id, queryKey: getListTestRunsQueryKey(id) } });
  const project = projectQuery.data;
  const runs = runsQuery.data ?? [];

  return <AppShell><div className="mx-auto max-w-[1320px] p-5 md:p-9">
    <Link href={`/projects/${id}`} className="mb-7 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c7681] hover:text-[#168a7a]">
      <ArrowLeft size={14}/> Back to project
    </Link>
    <SectionHeading 
      eyebrow="Test History" 
      title="Test Runs" 
      detail="All resilience tests executed for this external system."
      action={<button onClick={() => runsQuery.refetch()} className="inline-flex items-center gap-2 rounded-md border border-[#d4e0e3] bg-white px-3.5 py-2 text-xs font-semibold text-[#466574] hover:bg-[#eef5f4]">
        <RefreshCw size={14}/> Refresh
      </button>}
    />
    <div className="mt-8 overflow-hidden rounded-lg border border-[#dce6e8] bg-white">
      {runsQuery.isLoading ? (
        <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin text-[#8ba0a7]"/></div>
      ) : runs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Activity size={32} className="mx-auto text-[#8ba0a7]"/>
          <h3 className="mt-4 text-sm font-semibold text-[#294653]">No test runs yet</h3>
          <p className="mt-2 text-xs text-[#82969e]">Test run history will appear when tests are executed.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#edf1f2]">
          {runs.map(run => (
            <Link key={run.id} href={`/projects/${id}/tests/${run.id}`} className="block px-6 py-4 transition hover:bg-[#f8fbfb]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusDot status={run.status === 'passed' ? 'active' : run.status === 'violated' ? 'paused' : 'active'}/>
                  <div>
                    <div className="text-sm font-semibold text-[#284653]">{run.method.replace('_', ' ').toUpperCase()}</div>
                    <div className="mt-1 text-xs text-[#8a9da4]">{run.profile.toUpperCase()} profile · {dateLabel(run.createdAt)}</div>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-[#b0c0c5]"/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  </div></AppShell>;
}

export function NewTestRunPage() {
  const { id = '' } = useParams<{ id: string }>();
  const projectQuery = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const project = projectQuery.data;

  return <AppShell><div className="mx-auto max-w-[1100px] p-5 md:p-9">
    <Link href={`/projects/${id}/tests`} className="mb-7 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c7681] hover:text-[#168a7a]">
      <ArrowLeft size={14}/> Back to test runs
    </Link>
    <SectionHeading eyebrow="New Test" title="Configure Test Run" detail="Set up a new resilience test for this external system."/>
    <div className="mt-8 rounded-lg border border-[#dce6e8] bg-white p-6">
      <div className="text-center py-12">
        <Zap size={32} className="mx-auto text-[#8ba0a7]"/>
        <h3 className="mt-4 text-sm font-semibold text-[#294653]">Test Configuration</h3>
        <p className="mt-2 text-xs text-[#82969e]">Configure test method, profile, and execution options.</p>
      </div>
    </div>
  </div></AppShell>;
}

export function TestRunDetailPage() {
  const { id = '', testId = '' } = useParams<{ id: string; testId: string }>();
  const projectQuery = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const testQuery = useGetTestRun(id, testId, { query: { enabled: !!id && !!testId, queryKey: getGetTestRunQueryKey(id, testId) } });
  const project = projectQuery.data;
  const test = testQuery.data;
  const result = test?.result;

  return <AppShell><div className="mx-auto max-w-[1320px] p-5 md:p-9">
    <Link href={`/projects/${id}/tests`} className="mb-7 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c7681] hover:text-[#168a7a]">
      <ArrowLeft size={14}/> Back to test runs
    </Link>
    
    {testQuery.isLoading ? (
      <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#8ba0a7]"/></div>
    ) : !test ? (
      <div className="rounded-lg border border-[#f0c7c1] bg-[#fff6f4] p-6 text-sm text-[#a14c40]">Test run not found.</div>
    ) : (
      <>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <StatusDot status={test.status === 'passed' ? 'active' : test.status === 'violated' ? 'paused' : 'active'}/>
              <h1 className="font-display text-3xl font-semibold tracking-[-.05em] text-[#173041]">
                {test.method.replace('_', ' ').toUpperCase()}
              </h1>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-[#8a9da4]">
              <span className="font-mono">{test.profile.toUpperCase()} profile</span>
              <span>·</span>
              <span>{dateLabel(test.createdAt)}</span>
            </div>
          </div>
          <button onClick={() => testQuery.refetch()} className="inline-flex items-center gap-2 rounded-md border border-[#d4e0e3] bg-white px-3.5 py-2 text-xs font-semibold text-[#466574] hover:bg-[#eef5f4]">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>

        {test.status === 'queued' && (
          <div className="mt-8 rounded-lg border border-[#e5d4a8] bg-[#fffef5] p-6">
            <div className="flex items-center gap-3">
              <Clock3 size={20} className="text-[#c9a227]"/>
              <div>
                <div className="text-sm font-semibold text-[#5c4a1a]">Test is queued</div>
                <div className="mt-1 text-xs text-[#8a7a5a]">This test is waiting to be executed.</div>
              </div>
            </div>
          </div>
        )}

        {test.status === 'running' && (
          <div className="mt-8 rounded-lg border border-[#a8c4e5] bg-[#f0f7ff] p-6">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-[#3a82c7]"/>
              <div>
                <div className="text-sm font-semibold text-[#1a4a7a]">Test is running</div>
                <div className="mt-1 text-xs text-[#5a7a9a]">Browser execution is in progress.</div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            {/* Performance Metrics */}
            <section className="rounded-lg border border-[#dce6e8] bg-white">
              <div className="border-b border-[#e4ecee] px-6 py-4">
                <h2 className="font-display text-[15px] font-semibold text-[#173041]">Performance Metrics</h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Largest Contentful Paint', formatMs(result.metrics.lcpMs), 'Target: < 2.5s'],
                    ['Cumulative Layout Shift', result.metrics.cls?.toFixed(3) ?? '—', 'Target: < 0.1'],
                    ['First Contentful Paint', formatMs(result.metrics.fcpMs), 'Target: < 1.8s'],
                    ['Resource Count', result.metrics.resourceCount, 'Total resources loaded'],
                    ['JavaScript Transferred', formatBytes(result.metrics.javascriptTransferBytes), 'Total JS size'],
                    ['Image Transferred', formatBytes(result.metrics.imageTransferBytes), 'Total image size'],
                    ['Total Transferred', formatBytes(result.metrics.totalTransferBytes), 'All resources'],
                  ].map(([label, value, detail]) => (
                    <div key={label as string} className="rounded-md border border-[#e5edef] bg-[#f8fbfb] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6a808a]">{label}</div>
                      <div className="mt-2 font-display text-xl font-semibold tracking-[-.03em] text-[#173041]">{value}</div>
                      <div className="mt-1 text-xs text-[#82969e]">{detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Test Status & AI Analysis */}
            <div className="space-y-6">
              <section className="rounded-lg border border-[#dce6e8] bg-white">
                <div className="border-b border-[#e4ecee] px-6 py-4">
                  <h2 className="font-display text-[15px] font-semibold text-[#173041]">Test Status</h2>
                </div>
                <div className="p-6">
                  <div className={`flex items-center gap-3 rounded-md p-4 ${
                    test.status === 'passed' ? 'bg-[#e9f7f4] text-[#168a7a]' :
                    test.status === 'violated' ? 'bg-[#fff6f4] text-[#a14c40]' :
                    'bg-[#f8fbfb] text-[#6a808a]'
                  }`}>
                    {test.status === 'passed' ? <CheckCircle2 size={20}/> :
                     test.status === 'violated' ? <ShieldAlert size={20}/> :
                     <AlertTriangle size={20}/>}
                    <div>
                      <div className="text-sm font-semibold capitalize">{test.status}</div>
                      <div className="mt-1 text-xs opacity-80">
                        {result.violations.length} violation{result.violations.length !== 1 ? 's' : ''} detected
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* AI Analysis */}
              {result.analysis ? (
                <section className="rounded-lg border border-[#dce6e8] bg-white">
                  <div className="border-b border-[#e4ecee] px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Brain size={16} className="text-[#1b9c89]"/>
                      <h2 className="font-display text-[15px] font-semibold text-[#173041]">AI Analysis</h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6a808a]">Summary</div>
                      <div className="mt-1 text-sm text-[#345360]">{result.analysis.summary}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6a808a]">Root Cause</div>
                      <div className="mt-1 text-sm text-[#345360]">{result.analysis.rootCause}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6a808a]">Impact</div>
                      <div className="mt-1 text-sm text-[#345360]">{result.analysis.impact}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6a808a]">Explanation</div>
                      <div className="mt-1 text-sm text-[#345360]">{result.analysis.explanation}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6a808a]">Recommendations</div>
                      <ul className="mt-2 space-y-1">
                        {result.analysis.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#345360]">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#1b9c89]"/>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-lg border border-[#e5e8ea] bg-[#f8f9f9] p-6">
                  <div className="flex items-center gap-2 text-[#8ba0a7]">
                    <Brain size={16}/>
                    <div className="text-sm">AI analysis unavailable</div>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Violations */}
        {result && result.violations.length > 0 && (
          <section className="mt-6 rounded-lg border border-[#dce6e8] bg-white">
            <div className="border-b border-[#e4ecee] px-6 py-4">
              <h2 className="font-display text-[15px] font-semibold text-[#173041]">Violations</h2>
            </div>
            <div className="divide-y divide-[#edf1f2]">
              {result.violations.map((violation, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={18} className={`mt-0.5 ${
                      violation.severity === 'high' ? 'text-[#dc2626]' :
                      violation.severity === 'medium' ? 'text-[#d97706]' :
                      'text-[#6a808a]'
                    }`}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#284653]">{violation.type}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          violation.severity === 'high' ? 'bg-[#fef2f2] text-[#dc2626]' :
                          violation.severity === 'medium' ? 'bg-[#fffbeb] text-[#d97706]' :
                          'bg-[#f8fbfb] text-[#6a808a]'
                        }`}>{violation.severity}</span>
                      </div>
                      <div className="mt-1 text-sm text-[#6d818a]">{violation.message}</div>
                      <div className="mt-2 flex gap-4 text-xs text-[#8a9da4]">
                        <span>Expected: <span className="font-mono">{violation.expected}</span></span>
                        <span>Actual: <span className="font-mono">{violation.actual ?? 'N/A'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    )}
  </div></AppShell>;
}

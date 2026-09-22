import { randomUUID } from "node:crypto";
import type {
  AdaptiveContractInput,
  ProjectInput,
  ProjectUpdate,
  TestRunInput,
} from "@workspace/api-zod";
import type {
  BrowserConfiguration,
  PerformanceEvidence,
  ResourceEvidence,
  TestViolation,
} from "../testing/types";

export type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  applicationType: "ecommerce" | "news";
  applicationUrl: string;
  status: "active" | "paused";
  createdAt: Date;
  updatedAt: Date;
};

export type ContractRecord = AdaptiveContractInput & {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TestProfileRecord = {
  key: "low" | "medium" | "high";
  name: string;
  description: string;
  networkProfile: string;
  imagePolicy: string;
  javascriptPolicy: string;
  featurePolicy: string;
  maxResourceSizeKb: number;
  maxLcpMs: number;
};

export type TestRunRecord = TestRunInput & {
  id: string;
  projectId: string;
  configuration: Record<string, unknown>;
  status: "queued" | "running" | "passed" | "violated" | "failed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
};

export type TestResultRecord = {
  runId: string;
  signals: BrowserConfiguration & {
    detected: {
      finalUrl: string;
      title: string;
      consoleErrors: string[];
      navigationError: string | null;
      isMockSut: boolean;
    };
  };
  resources: ResourceEvidence[];
  metrics: PerformanceEvidence;
  violations: TestViolation[];
  warnings: string[];
  error: string | null;
  analysis: {
    summary: string;
    rootCause: string;
    impact: string;
    explanation: string;
    recommendations: string[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoreUser = {
  id: string;
  accessToken: string;
};

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 404 | 502 | 503 = 503,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export interface WorkspaceStore {
  listProjects(): Promise<ProjectRecord[]>;
  findProject(id: string): Promise<ProjectRecord | undefined>;
  createProject(input: ProjectInput): Promise<ProjectRecord>;
  updateProject(id: string, input: ProjectUpdate): Promise<ProjectRecord | undefined>;
  deleteProject(id: string): Promise<boolean>;
  getContract(projectId: string): Promise<ContractRecord | undefined>;
  saveContract(projectId: string, input: AdaptiveContractInput): Promise<ContractRecord>;
  listTestProfiles(): Promise<TestProfileRecord[]>;
  listTestRuns(projectId: string): Promise<TestRunRecord[]>;
  findTestRun(projectId: string, testId: string): Promise<TestRunRecord | undefined>;
  createTestRun(projectId: string, input: TestRunInput): Promise<TestRunRecord>;
  updateTestRunStatus(
    projectId: string,
    testId: string,
    status: TestRunRecord["status"],
  ): Promise<TestRunRecord | undefined>;
  saveTestResult(projectId: string, testId: string, result: Omit<TestResultRecord, "runId" | "createdAt" | "updatedAt">): Promise<TestResultRecord>;
  getTestResult(projectId: string, testId: string): Promise<TestResultRecord | undefined>;
  saveTestAnalysis(projectId: string, testId: string, analysis: { summary: string; rootCause: string; impact: string; explanation: string; recommendations: string[] }): Promise<void>;
  getDashboardSummary(): Promise<{
    projectCount: number;
    testRunCount: number;
    passRate: number | null;
    violationCount: number;
  }>;
}

const TEST_PROFILES: TestProfileRecord[] = [
  {
    key: "low",
    name: "Low",
    description:
      "A constrained environment for checking graceful degradation under reduced bandwidth and limited resources.",
    networkProfile: "Slow 3G",
    imagePolicy: "low",
    javascriptPolicy: "minimal",
    featurePolicy: "reduced",
    maxResourceSizeKb: 800,
    maxLcpMs: 4000,
  },
  {
    key: "medium",
    name: "Medium",
    description:
      "A balanced baseline for release checks across typical network and device conditions.",
    networkProfile: "Fast 3G",
    imagePolicy: "medium",
    javascriptPolicy: "deferred",
    featurePolicy: "normal",
    maxResourceSizeKb: 1400,
    maxLcpMs: 3000,
  },
  {
    key: "high",
    name: "High",
    description:
      "A full-fidelity profile for validating the complete application experience and performance budget.",
    networkProfile: "4G",
    imagePolicy: "high",
    javascriptPolicy: "full",
    featurePolicy: "full",
    maxResourceSizeKb: 2400,
    maxLcpMs: 2000,
  },
];

function copyProject(project: ProjectRecord): ProjectRecord {
  return { ...project };
}

class MemoryWorkspaceStore implements WorkspaceStore {
  private readonly projects = new Map<string, ProjectRecord[]>();
  private readonly contracts = new Map<string, ContractRecord>();
  private readonly runs = new Map<string, TestRunRecord[]>();
  private readonly results = new Map<string, TestResultRecord>();

  constructor(private readonly userId: string) {}

  private projectList() {
    return this.projects.get(this.userId) ?? [];
  }

  async listProjects() {
    return this.projectList().map(copyProject);
  }

  async findProject(id: string) {
    const project = this.projectList().find((item) => item.id === id);
    return project ? copyProject(project) : undefined;
  }

  async createProject(input: ProjectInput) {
    const now = new Date();
    const project: ProjectRecord = {
      id: randomUUID(),
      ...input,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(this.userId, [project, ...this.projectList()]);
    return copyProject(project);
  }

  async updateProject(id: string, input: ProjectUpdate) {
    const project = this.projectList().find((item) => item.id === id);
    if (!project) return undefined;
    Object.assign(project, input, { updatedAt: new Date() });
    return copyProject(project);
  }

  async deleteProject(id: string) {
    const list = this.projectList();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.contracts.delete(`${this.userId}:${id}`);
    this.runs.delete(`${this.userId}:${id}`);
    this.results.forEach((result, key) => {
      if (key.startsWith(`${this.userId}:${id}:`)) this.results.delete(key);
    });
    return true;
  }

  async getContract(projectId: string) {
    const contract = this.contracts.get(`${this.userId}:${projectId}`);
    return contract ? { ...contract } : undefined;
  }

  async saveContract(projectId: string, input: AdaptiveContractInput) {
    const key = `${this.userId}:${projectId}`;
    const previous = this.contracts.get(key);
    const now = new Date();
    const contract: ContractRecord = {
      id: previous?.id ?? randomUUID(),
      projectId,
      ...input,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    this.contracts.set(key, contract);
    return { ...contract };
  }

  async listTestProfiles() {
    return TEST_PROFILES.map((profile) => ({ ...profile }));
  }

  async listTestRuns(projectId: string) {
    return (this.runs.get(`${this.userId}:${projectId}`) ?? []).map((run) => ({
      ...run,
      configuration: { ...run.configuration },
    }));
  }

  async findTestRun(projectId: string, testId: string) {
    return (await this.listTestRuns(projectId)).find((run) => run.id === testId);
  }

  async createTestRun(projectId: string, input: TestRunInput) {
    const now = new Date();
    const run: TestRunRecord = {
      id: randomUUID(),
      projectId,
      profile: input.profile,
      method: input.method,
      configuration: input.configuration ?? {},
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    const key = `${this.userId}:${projectId}`;
    this.runs.set(key, [run, ...(this.runs.get(key) ?? [])]);
    return { ...run, configuration: { ...run.configuration } };
  }

  async updateTestRunStatus(projectId: string, testId: string, status: TestRunRecord["status"]) {
    const run = (this.runs.get(`${this.userId}:${projectId}`) ?? []).find((item) => item.id === testId);
    if (!run) return undefined;
    run.status = status;
    run.updatedAt = new Date();
    return { ...run, configuration: { ...run.configuration } };
  }

  async saveTestResult(
    projectId: string,
    testId: string,
    result: Omit<TestResultRecord, "runId" | "createdAt" | "updatedAt">,
  ) {
    const now = new Date();
    const record: TestResultRecord = {
      ...result,
      runId: testId,
      createdAt: now,
      updatedAt: now,
    };
    this.results.set(`${this.userId}:${projectId}:${testId}`, record);
    return structuredClone(record);
  }

  async getTestResult(projectId: string, testId: string) {
    const result = this.results.get(`${this.userId}:${projectId}:${testId}`);
    return result ? structuredClone(result) : undefined;
  }

  async saveTestAnalysis(projectId: string, testId: string, analysis: { summary: string; rootCause: string; impact: string; explanation: string; recommendations: string[] }) {
    const result = this.results.get(`${this.userId}:${projectId}:${testId}`);
    if (result) {
      result.analysis = analysis;
      result.updatedAt = new Date();
    }
  }

  async getDashboardSummary() {
    const projects = this.projectList();
    const runs = projects.flatMap((project) => this.runs.get(`${this.userId}:${project.id}`) ?? []);
    const completed = runs.filter((run) => ["passed", "violated", "failed"].includes(run.status));
    const passed = completed.filter((run) => run.status === "passed").length;
    return {
      projectCount: projects.length,
      testRunCount: runs.length,
      passRate: completed.length ? Math.round((passed / completed.length) * 100) : null,
      violationCount: runs.filter((run) => run.status === "violated").length,
    };
  }
}

type SupabaseRow = Record<string, unknown>;

class SupabaseRestClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly user: StoreUser) {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const apiKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !apiKey) {
      throw new StoreError(
        "Supabase persistence is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
      );
    }
    this.baseUrl = url.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async request(table: string, init: RequestInit = {}, query: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      ...init,
      headers: {
        apikey: this.apiKey,
        authorization: `Bearer ${this.user.accessToken}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : [];
    if (!response.ok) {
      throw new StoreError(
        `Supabase persistence returned HTTP ${response.status}.`,
        502,
      );
    }
    return Array.isArray(payload) ? (payload as SupabaseRow[]) : [];
  }
}

function dateValue(value: unknown) {
  return new Date(typeof value === "string" || typeof value === "number" ? value : Date.now());
}

function projectFromRow(row: SupabaseRow): ProjectRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    applicationType: row.application_type as ProjectRecord["applicationType"],
    applicationUrl: String(row.application_url),
    status: row.status as ProjectRecord["status"],
    createdAt: dateValue(row.created_at),
    updatedAt: dateValue(row.updated_at),
  };
}

function contractFromRow(row: SupabaseRow): ContractRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    profile: row.profile as ContractRecord["profile"],
    networkProfile: String(row.network_profile),
    imagePolicy: String(row.image_policy),
    javascriptPolicy: String(row.javascript_policy),
    featurePolicy: String(row.feature_policy),
    maxResourceSizeKb: Number(row.max_resource_size_kb),
    maxLcpMs: Number(row.max_lcp_ms),
    createdAt: dateValue(row.created_at),
    updatedAt: dateValue(row.updated_at),
  };
}

function profileFromRow(row: SupabaseRow): TestProfileRecord {
  return {
    key: row.key as TestProfileRecord["key"],
    name: String(row.name),
    description: String(row.description),
    networkProfile: String(row.network_profile),
    imagePolicy: String(row.image_policy),
    javascriptPolicy: String(row.javascript_policy),
    featurePolicy: String(row.feature_policy),
    maxResourceSizeKb: Number(row.max_resource_size_kb),
    maxLcpMs: Number(row.max_lcp_ms),
  };
}

function runFromRow(row: SupabaseRow): TestRunRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    profile: row.profile as TestRunRecord["profile"],
    method: row.method as TestRunRecord["method"],
    configuration:
      row.configuration && typeof row.configuration === "object"
        ? (row.configuration as Record<string, unknown>)
        : {},
    status: row.status as TestRunRecord["status"],
    createdAt: dateValue(row.created_at),
    updatedAt: dateValue(row.updated_at),
  };
}

function resultFromRows(
  signal: SupabaseRow | undefined,
  resources: SupabaseRow[],
  metrics: SupabaseRow | undefined,
  violations: SupabaseRow[],
): TestResultRecord | undefined {
  if (!signal || !metrics) return undefined;
  const json = (value: unknown) =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    runId: String(signal.test_run_id),
    signals: json(signal.configuration) as TestResultRecord["signals"],
    resources: resources.map((row) => json(row.evidence) as ResourceEvidence),
    metrics: json(metrics.evidence) as PerformanceEvidence,
    violations: violations.map((row) => json(row.evidence) as TestViolation),
    warnings: Array.isArray(signal.warnings) ? (signal.warnings as string[]) : [],
    error: typeof signal.error === "string" ? signal.error : null,
    analysis: null,
    createdAt: dateValue(signal.created_at),
    updatedAt: dateValue(signal.updated_at),
  };
}

class SupabaseWorkspaceStore implements WorkspaceStore {
  private readonly client: SupabaseRestClient;

  constructor(user: StoreUser) {
    this.client = new SupabaseRestClient(user);
  }

  async listProjects() {
    const rows = await this.client.request("projects", {}, {
      select: "*",
      order: "created_at.desc",
    });
    return rows.map(projectFromRow);
  }

  async findProject(id: string) {
    const rows = await this.client.request("projects", {}, {
      id: `eq.${id}`,
      select: "*",
      limit: "1",
    });
    return rows[0] ? projectFromRow(rows[0]) : undefined;
  }

  async createProject(input: ProjectInput) {
    const rows = await this.client.request(
      "projects",
      {
        method: "POST",
        body: JSON.stringify({
          owner_id: this.user.id,
          name: input.name,
          description: input.description,
          application_type: input.applicationType,
          application_url: input.applicationUrl,
        }),
        headers: { prefer: "return=representation" },
      },
    );
    // owner_id is derived from the authenticated server context, never from
    // request data supplied by the browser.
    if (!rows[0]) throw new StoreError("Project was not created.", 502);
    return projectFromRow(rows[0]);
  }

  async updateProject(id: string, input: ProjectUpdate) {
    const body: SupabaseRow = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.applicationType !== undefined) body.application_type = input.applicationType;
    if (input.applicationUrl !== undefined) body.application_url = input.applicationUrl;
    if (input.status !== undefined) body.status = input.status;
    const rows = await this.client.request(
      "projects",
      {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { prefer: "return=representation" },
      },
      { id: `eq.${id}`, select: "*" },
    );
    return rows[0] ? projectFromRow(rows[0]) : undefined;
  }

  async deleteProject(id: string) {
    const rows = await this.client.request(
      "projects",
      { method: "DELETE", headers: { prefer: "return=representation" } },
      { id: `eq.${id}`, select: "id" },
    );
    return rows.length > 0;
  }

  async getContract(projectId: string) {
    const rows = await this.client.request("adaptive_contracts", {}, {
      project_id: `eq.${projectId}`,
      select: "*",
      limit: "1",
    });
    return rows[0] ? contractFromRow(rows[0]) : undefined;
  }

  async saveContract(projectId: string, input: AdaptiveContractInput) {
    const rows = await this.client.request(
      "adaptive_contracts",
      {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          profile: input.profile,
          network_profile: input.networkProfile,
          image_policy: input.imagePolicy,
          javascript_policy: input.javascriptPolicy,
          feature_policy: input.featurePolicy,
          max_resource_size_kb: input.maxResourceSizeKb,
          max_lcp_ms: input.maxLcpMs,
        }),
        headers: {
          prefer: "return=representation,resolution=merge-duplicates",
        },
      },
      { on_conflict: "project_id", select: "*" },
    );
    if (!rows[0]) throw new StoreError("Adaptive contract was not saved.", 502);
    return contractFromRow(rows[0]);
  }

  async listTestProfiles() {
    const rows = await this.client.request("test_profiles", {}, {
      select: "*",
      order: "key.asc",
    });
    return rows.map(profileFromRow);
  }

  async listTestRuns(projectId: string) {
    const rows = await this.client.request("test_runs", {}, {
      project_id: `eq.${projectId}`,
      select: "*",
      order: "created_at.desc",
    });
    return rows.map(runFromRow);
  }

  async findTestRun(projectId: string, testId: string) {
    const rows = await this.client.request("test_runs", {}, {
      project_id: `eq.${projectId}`,
      id: `eq.${testId}`,
      select: "*",
      limit: "1",
    });
    return rows[0] ? runFromRow(rows[0]) : undefined;
  }

  async createTestRun(projectId: string, input: TestRunInput) {
    const rows = await this.client.request(
      "test_runs",
      {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          profile: input.profile,
          method: input.method,
          configuration: input.configuration ?? {},
          status: "queued",
        }),
        headers: { prefer: "return=representation" },
      },
    );
    if (!rows[0]) throw new StoreError("Test configuration was not queued.", 502);
    return runFromRow(rows[0]);
  }

  async updateTestRunStatus(projectId: string, testId: string, status: TestRunRecord["status"]) {
    const rows = await this.client.request(
      "test_runs",
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: { prefer: "return=representation" },
      },
      { id: `eq.${testId}`, project_id: `eq.${projectId}`, select: "*" },
    );
    return rows[0] ? runFromRow(rows[0]) : undefined;
  }

  async saveTestResult(
    projectId: string,
    testId: string,
    result: Omit<TestResultRecord, "runId" | "createdAt" | "updatedAt">,
  ) {
    await this.client.request(
      "test_signals",
      {
        method: "POST",
        body: JSON.stringify({
          test_run_id: testId,
          configuration: result.signals,
          detected: result.signals.detected,
          warnings: result.warnings,
          error: result.error,
        }),
        headers: { prefer: "return=representation,resolution=merge-duplicates" },
      },
      { on_conflict: "test_run_id", select: "*" },
    );
    if (result.resources.length) {
      await this.client.request("test_resources", {
        method: "POST",
        body: JSON.stringify(
          result.resources.map((resource) => ({ test_run_id: testId, evidence: resource })),
        ),
      });
    }
    await this.client.request(
      "test_metrics",
      {
        method: "POST",
        body: JSON.stringify({ test_run_id: testId, evidence: result.metrics }),
        headers: { prefer: "return=representation,resolution=merge-duplicates" },
      },
      { on_conflict: "test_run_id", select: "*" },
    );
    if (result.violations.length) {
      await this.client.request("test_violations", {
        method: "POST",
        body: JSON.stringify(
          result.violations.map((violation) => ({ test_run_id: testId, evidence: violation })),
        ),
      });
    }
    const saved = await this.getTestResult(projectId, testId);
    if (!saved) throw new StoreError("Test results were not persisted.", 502);
    return saved;
  }

  async getTestResult(projectId: string, testId: string) {
    const [signals, resources, metrics, violations] = await Promise.all([
      this.client.request("test_signals", {}, { test_run_id: `eq.${testId}`, select: "*", limit: "1" }),
      this.client.request("test_resources", {}, { test_run_id: `eq.${testId}`, select: "evidence", order: "created_at.asc" }),
      this.client.request("test_metrics", {}, { test_run_id: `eq.${testId}`, select: "*", limit: "1" }),
      this.client.request("test_violations", {}, { test_run_id: `eq.${testId}`, select: "evidence", order: "created_at.asc" }),
    ]);
    return resultFromRows(signals[0], resources, metrics[0], violations);
  }

  async saveTestAnalysis(projectId: string, testId: string, analysis: { summary: string; rootCause: string; impact: string; explanation: string; recommendations: string[] }) {
    await this.client.request(
      "test_signals",
      {
        method: "PATCH",
        body: JSON.stringify({ analysis }),
        headers: { prefer: "return=representation" },
      },
      { test_run_id: `eq.${testId}`, select: "*" },
    );
  }

  async getDashboardSummary() {
    const [projects, runs] = await Promise.all([
      this.listProjects(),
      this.client.request("test_runs", {}, { select: "status" }),
    ]);
    const completed = runs.filter((run) =>
      ["passed", "violated", "failed"].includes(String(run.status)),
    );
    const passed = completed.filter((run) => run.status === "passed").length;
    return {
      projectCount: projects.length,
      testRunCount: runs.length,
      passRate: completed.length ? Math.round((passed / completed.length) * 100) : null,
      violationCount: runs.filter((run) => run.status === "violated").length,
    };
  }
}

const memoryStores = new Map<string, MemoryWorkspaceStore>();

export function getWorkspaceStore(user: StoreUser): WorkspaceStore {
  if (process.env.NODE_ENV === "test") {
    let store = memoryStores.get(user.id);
    if (!store) {
      store = new MemoryWorkspaceStore(user.id);
      memoryStores.set(user.id, store);
    }
    return store;
  }
  return new SupabaseWorkspaceStore(user);
}
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = process.env.TEST_API_PORT ?? '5105';
const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${port}/api`;
let server;

if (!process.env.API_BASE_URL) {
  server = spawn('node', ['artifacts/api-server/dist/index.mjs'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: port },
    stdio: 'inherit',
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) break;
    } catch {
      // The built server may need a moment to bind.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function request(path, options = {}, userId) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-test-user-id': userId } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : undefined,
  };
}

const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';

test.after(() => {
  server?.kill('SIGTERM');
});

test('protected endpoints require authentication', async () => {
  const response = await request('/projects');
  assert.equal(response.response.status, 401);
});

test('Phase 2 project, contract, and test configuration flow', async () => {
  const list = await request('/projects', {}, userA);
  assert.equal(list.response.status, 200);
  assert.ok(Array.isArray(list.body));

  const invalidProject = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Invalid project',
      description: '',
      applicationType: 'ecommerce',
      applicationUrl: 'not-a-url',
    }),
  }, userA);
  assert.equal(invalidProject.response.status, 400);

  const created = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Phase 2 test project',
      description: 'Created by the API regression suite',
      applicationType: 'ecommerce',
      applicationUrl: 'https://example.com',
    }),
  }, userA);
  assert.equal(created.response.status, 201);
  const projectId = created.body.id;

  const detail = await request(`/projects/${projectId}`, {}, userA);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.id, projectId);

  const invalidProtocol = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Invalid protocol',
      description: '',
      applicationType: 'ecommerce',
      applicationUrl: 'ftp://example.com',
    }),
  }, userA);
  assert.equal(invalidProtocol.response.status, 400);

  const profiles = await request('/test-profiles', {}, userA);
  assert.equal(profiles.response.status, 200);
  assert.equal(profiles.body.length, 3);

  const invalidContract = await request(`/projects/${projectId}/contract`, {
    method: 'PUT',
    body: JSON.stringify({
      profile: 'medium',
      networkProfile: 'Fast 3G',
      imagePolicy: 'medium',
      javascriptPolicy: 'deferred',
      featurePolicy: 'normal',
      maxResourceSizeKb: 0,
      maxLcpMs: 3000,
    }),
  }, userA);
  assert.equal(invalidContract.response.status, 400);

  const savedContract = await request(`/projects/${projectId}/contract`, {
    method: 'PUT',
    body: JSON.stringify({
      profile: 'high',
      networkProfile: '4G',
      imagePolicy: 'high',
      javascriptPolicy: 'full',
      featurePolicy: 'full',
      maxResourceSizeKb: 2400,
      maxLcpMs: 2000,
    }),
  }, userA);
  assert.equal(savedContract.response.status, 200);
  assert.equal(savedContract.body.profile, 'high');

  const invalidTest = await request(`/projects/${projectId}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      profile: 'medium',
      method: 'not-a-method',
    }),
  }, userA);
  assert.equal(invalidTest.response.status, 400);

  const queued = await request(`/projects/${projectId}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      profile: 'high',
      method: 'performance',
      configuration: { route: '/checkout' },
    }),
  }, userA);
  assert.equal(queued.response.status, 201);
  assert.equal(queued.body.status, 'queued');

  const runs = await request(`/projects/${projectId}/tests`, {}, userA);
  assert.equal(runs.response.status, 200);
  assert.equal(runs.body[0].id, queued.body.id);

  const updated = await request(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'paused' }),
  }, userA);
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.status, 'paused');

  const deleted = await request(`/projects/${projectId}`, { method: 'DELETE' }, userA);
  assert.equal(deleted.response.status, 204);

  const missing = await request(`/projects/${projectId}`, {}, userA);
  assert.equal(missing.response.status, 404);
});

test('ownership boundaries prevent cross-account access', async () => {
  const created = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Owner-only project',
      description: 'Must not leak across accounts',
      applicationType: 'news',
      applicationUrl: 'https://example.org',
    }),
  }, userA);
  assert.equal(created.response.status, 201);
  const projectId = created.body.id;

  const otherList = await request('/projects', {}, userB);
  assert.equal(otherList.response.status, 200);
  assert.equal(otherList.body.some((project) => project.id === projectId), false);

  const otherDetail = await request(`/projects/${projectId}`, {}, userB);
  assert.equal(otherDetail.response.status, 404);

  const otherContract = await request(`/projects/${projectId}/contract`, {}, userB);
  assert.equal(otherContract.response.status, 404);

  const otherDelete = await request(`/projects/${projectId}`, { method: 'DELETE' }, userB);
  assert.equal(otherDelete.response.status, 404);

  const ownerDelete = await request(`/projects/${projectId}`, { method: 'DELETE' }, userA);
  assert.equal(ownerDelete.response.status, 204);
});
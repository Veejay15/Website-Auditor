import { Octokit } from '@octokit/rest';
import { Audit, AppSettings } from './types';

// Trim env vars - dashboard copy/paste often includes trailing whitespace or
// newlines that turn into %0A in URL-encoded API requests, causing 404s.
const owner = (process.env.GITHUB_OWNER || '').trim();
const repo = (process.env.GITHUB_REPO || 'client-website-auditor').trim();
const branch = (process.env.GITHUB_BRANCH || 'main').trim();
const token = (process.env.GITHUB_TOKEN || '').trim();

function client(): Octokit {
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  return new Octokit({ auth: token });
}

export function isGithubConfigured(): boolean {
  return Boolean(token && owner && repo);
}

export async function readJsonFromRepo<T>(filePath: string): Promise<T | null> {
  const octokit = client();
  try {
    const res = await octokit.repos.getContent({ owner, repo, path: filePath, ref: branch });
    if (!('content' in res.data)) return null;
    const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
    return JSON.parse(content) as T;
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function commitJsonFile(
  filePath: string,
  data: unknown,
  message: string
): Promise<void> {
  const octokit = client();
  const newContent = JSON.stringify(data, null, 2) + '\n';
  const newContentBase64 = Buffer.from(newContent).toString('base64');

  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path: filePath, ref: branch });
    if ('sha' in existing.data) sha = existing.data.sha;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status !== 404) {
      throw new Error(
        `GitHub getContent failed (${status}) for ${owner}/${repo}@${branch}:${filePath} — ${(err as Error).message}`
      );
    }
  }

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message,
      content: newContentBase64,
      branch,
      sha,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { data?: { message?: string } }; message?: string };
    const detail = e.response?.data?.message || e.message || 'unknown';
    throw new Error(
      `GitHub commitJsonFile failed (${e.status || '?'}) for ${owner}/${repo}@${branch}:${filePath} — ${detail}. ` +
        `Verify GITHUB_TOKEN has Contents:Read+Write on ${owner}/${repo}.`
    );
  }
}

export async function commitAuditsIndex(audits: Audit[], message: string): Promise<void> {
  await commitJsonFile('data/audits.json', { audits }, message);
}

export async function commitSettings(settings: AppSettings, message: string): Promise<void> {
  await commitJsonFile('data/settings.json', settings, message);
}

export interface WorkflowRunInfo {
  id: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
}

export async function dispatchAuditWorkflow(auditId: string): Promise<void> {
  const octokit = client();
  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: 'generate-audit.yml',
    ref: branch,
    inputs: { audit_id: auditId },
  });
}

export async function findLatestWorkflowRun(
  workflowFileName: string,
  sinceISO: string,
  attempts: number = 10
): Promise<WorkflowRunInfo | null> {
  const octokit = client();
  for (let i = 0; i < attempts; i++) {
    const res = await octokit.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowFileName,
      branch,
      per_page: 5,
    });
    const sinceTime = new Date(sinceISO).getTime();
    const recent = res.data.workflow_runs.find(
      (r) => new Date(r.created_at).getTime() >= sinceTime - 5000
    );
    if (recent) {
      return {
        id: recent.id,
        status: recent.status || 'queued',
        conclusion: recent.conclusion,
        htmlUrl: recent.html_url,
        createdAt: recent.created_at,
      };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

export async function getWorkflowRun(runId: number): Promise<WorkflowRunInfo> {
  const octokit = client();
  const res = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
  return {
    id: res.data.id,
    status: res.data.status || 'queued',
    conclusion: res.data.conclusion,
    htmlUrl: res.data.html_url,
    createdAt: res.data.created_at,
  };
}

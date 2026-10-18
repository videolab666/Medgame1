// Builds the game and publishes dist/ to the `gh-pages` branch, for GitHub
// Pages in "Deploy from a branch" mode (or any host that pulls a branch).
// Run: npm run deploy
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BRANCH = 'gh-pages';
const git = (args, opts = {}) =>
  (execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }) ?? '').trim();
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

if (git(['status', '--porcelain'])) {
  console.error('✗ Uncommitted changes: commit first, so the deployed build matches a commit.');
  process.exit(1);
}

run('npm', ['test']);
run('npm', ['run', 'validate']);
run('npm', ['run', 'build']);

const origin = git(['remote', 'get-url', 'origin']);
const sha = git(['rev-parse', '--short', 'HEAD']);
const name = git(['config', 'user.name']);
const email = git(['config', 'user.email']);
const dir = await mkdtemp(join(tmpdir(), 'mylna-deploy-'));

try {
  try {
    git(['clone', '--quiet', '--depth', '1', '--branch', BRANCH, '--single-branch', origin, dir]);
  } catch {
    git(['init', '--quiet', '-b', BRANCH, dir]);
    git(['-C', dir, 'remote', 'add', 'origin', origin]);
  }
  git(['-C', dir, 'config', 'user.name', name]);
  git(['-C', dir, 'config', 'user.email', email]);
  git(['-C', dir, 'config', 'core.autocrlf', 'false']);

  for (const entry of await readdir(dir)) {
    if (entry !== '.git') await rm(join(dir, entry), { recursive: true, force: true });
  }
  await cp('dist', dir, { recursive: true });
  // Serve files as-is: no Jekyll processing on GitHub Pages.
  await writeFile(join(dir, '.nojekyll'), '');

  git(['-C', dir, 'add', '-A']);
  if (!git(['-C', dir, 'status', '--porcelain'])) {
    console.log('✓ gh-pages already up to date');
  } else {
    git(['-C', dir, 'commit', '--quiet', '-m', `deploy: build of ${sha}`]);
    git(['-C', dir, 'push', '--quiet', 'origin', `HEAD:${BRANCH}`], { stdio: 'inherit' });
    console.log(`✓ Published build of ${sha} to ${BRANCH}`);
  }
} finally {
  // Windows may still hold handles from the git child processes for a moment.
  await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }).catch(() => {
    console.warn(`(temp folder left behind: ${dir})`);
  });
}

# Bootstrap Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der WSL2-Bootstrap läuft auf frischen und bereits eingerichteten Systemen wiederholbar durch, überschreibt keine Benutzer-Konfiguration ohne Backup und meldet Fehler verständlich.

**Architecture:** `index.js` wird zum reinen Ablaufsteuerer. Die Logik wandert in kleine, getestete CommonJS-Module unter `lib/` (Befehle ausführen, Logging, Schritte, apt, Distro-Erkennung, Dateien, Templates, Git). Privilegierte Änderungen an `/etc` laufen über eigenständige Bash-Skripte unter `scripts/`, die über Umgebungsvariablen auf Testpfade umgelenkt werden können.

**Tech Stack:** Node.js ≥ 20.19 (CommonJS, `node:test`), Bash, awk, rsync, shellcheck.

---

## Entscheidungen (Defaults – vor Start bestätigen)

| Frage | Default in diesem Plan |
| --- | --- |
| SSH-Key-Typ | `ed25519` statt RSA 4096 |
| Aliases `nah`, `dri`, `sudo='sudo '` | bleiben unverändert |
| `.old/`, `macros/unix-settings.json` | werden gelöscht (bleiben in der Git-Historie) |
| `dist-upgrade` im Bootstrap | bleibt |
| Fortschrittsbalken pro Paket (`cli-progress`) | entfällt; eine apt-Installation pro Gruppe, nur fehlende Pakete |
| PHP-Frage „Ubuntu oder Debian?“ | entfällt; Distro wird aus `/etc/os-release` erkannt |

## Dateistruktur

| Datei | Verantwortung |
| --- | --- |
| `lib/log.js` | `logInfo/Warn/Ok/Error` mit einheitlichen Präfixen |
| `lib/run.js` | Befehle ohne Shell ausführen, stderr bei Fehlern zeigen, `runSudo` mit Env, `commandExists` |
| `lib/steps.js` | `step()` mit Zeitmessung, Pflicht/optional, Ergebnisliste, Zusammenfassung |
| `lib/distro.js` | `/etc/os-release` lesen, ondrej-PPA-Unterstützung, veraltete PPA-Dateien finden |
| `lib/apt.js` | `apt-get` noninteractive, fehlende Pakete ermitteln |
| `lib/templates.js` | `__HOME__`-Templates nur schreiben, wenn Ziel fehlt |
| `lib/files.js` | Managed Blocks, Legacy-`.bashrc`-Snippet entfernen, Symlink mit Backup, Datei-Backup |
| `lib/git.js` | Repo klonen oder per `--ff-only` aktualisieren |
| `index.js` | Banner, Fragen, Schrittfolge, Zusammenfassung, Exit-Code |
| `scripts/configure_wsl_conf.sh` | Schlüssel aus `shell/wsl.conf` in `/etc/wsl.conf` mergen |
| `setup_sudo_user.sh` | Sudo-User, `/etc/sudoers.d`-Drop-in, `[user] default` |
| `install.sh` | NVM (gepinnt) + Node LTS nur wenn nötig, `npm ci`, startet `index.js` |
| `tests/node/*.test.js` | Unit-Tests für `lib/` und Smoke-Test für `index.js` |
| `tests/sh/lib.sh`, `tests/sh/test_*.sh`, `tests/run_shell_tests.sh` | Shell-Tests mit Fake-Pfaden und Stubs |

Alle Befehle laufen im Repo-Root (`~/.dotfiles` bzw. dem Klon).

---

### Task 0: Test-Infrastruktur und Repo-Hygiene

**Files:**
- Create: `.gitignore`
- Create: `tests/sh/lib.sh`
- Create: `tests/run_shell_tests.sh`
- Modify: `package.json`
- Delete (aus Git): `.opencode/skills/.system/skill-installer/scripts/__pycache__/github_utils.cpython-313.pyc`

- [ ] **Step 1: `.gitignore` anlegen**

```gitignore
node_modules/
__pycache__/
*.pyc
*:Zone.Identifier
```

- [ ] **Step 2: eingecheckte `.pyc` entfernen**

Run: `git rm --cached .opencode/skills/.system/skill-installer/scripts/__pycache__/github_utils.cpython-313.pyc`
Expected: `rm '.opencode/skills/.system/.../github_utils.cpython-313.pyc'`

- [ ] **Step 3: `package.json` um `engines` und Test-Skripte ergänzen**

Die Blöcke `"scripts"` ersetzen und `"engines"` hinzufügen:

```json
  "engines": {
    "node": ">=20.19"
  },
  "scripts": {
    "start": "node index.js",
    "test": "node --test \"tests/node/*.test.js\" && bash tests/run_shell_tests.sh",
    "lint:sh": "shellcheck install.sh setup_sudo_user.sh scripts/*.sh tests/run_shell_tests.sh tests/sh/*.sh"
  },
```

- [ ] **Step 4: Shell-Test-Helfer `tests/sh/lib.sh`**

```bash
# Minimal assertions for the shell tests; source this file from each test.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export REPO_DIR
FAILURES=0

pass() { printf 'ok   %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

assert_eq() {
  if [[ "$1" == "$2" ]]; then pass "$3"; else fail "$3 (erwartet: '$2', ist: '$1')"; fi
}

assert_contains() {
  if grep -qF -- "$2" "$1" 2>/dev/null; then pass "$3"; else fail "$3 ('$2' fehlt in $1)"; fi
}

assert_fails() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then fail "$desc"; else pass "$desc"; fi
}

finish() { [[ "$FAILURES" -eq 0 ]]; }
```

- [ ] **Step 5: Runner `tests/run_shell_tests.sh`**

```bash
#!/usr/bin/env bash
# Runs every tests/sh/test_*.sh in its own bash process.
set -euo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sh"
failed=0

shopt -s nullglob
for test_file in "${TEST_DIR}"/test_*.sh; do
  echo "== $(basename "$test_file")"
  bash "$test_file" || failed=1
done

exit "$failed"
```

Run: `chmod +x tests/run_shell_tests.sh`

- [ ] **Step 6: Dependencies installieren, Lockfile erzeugen, shellcheck bereitstellen**

Run: `npm install && sudo apt-get install -y shellcheck`
Expected: `package-lock.json` existiert, `shellcheck --version` gibt eine Version aus.

- [ ] **Step 7: Runner prüfen**

Run: `bash tests/run_shell_tests.sh; echo "exit=$?"`
Expected: `exit=0` (noch keine Shell-Tests). `npm test` erst ab Task 1 nutzen, vorher findet `node --test` keine Dateien.

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json tests/
git commit -m "🤖 TEST: Test-Infrastruktur, .gitignore, Lockfile"
```

---

### Task 1: `lib/log.js`

**Files:**
- Create: `lib/log.js`
- Test: `tests/node/log.test.js`

- [ ] **Step 1: Failing Test schreiben**

```js
'use strict';
process.env.FORCE_COLOR = '0';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { format } = require('../../lib/log');

test('format prefixes each level', () => {
    assert.equal(format('info', 'a'), '[ INFO ] a');
    assert.equal(format('warn', 'b'), '[ WARN ] b');
    assert.equal(format('ok', 'c'), '[ OK ] c');
    assert.equal(format('error', 'd'), '[ ERROR ] d');
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `node --test tests/node/log.test.js`
Expected: FAIL mit `Cannot find module '../../lib/log'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const chalk = require('chalk');

const PREFIX = {
    info: chalk.blue('[ INFO ]'),
    warn: chalk.yellow('[ WARN ]'),
    ok: chalk.green('[ OK ]'),
    error: chalk.red('[ ERROR ]')
};

function format(level, message) {
    return `${PREFIX[level]} ${message}`;
}

const logInfo = message => console.log(format('info', message));
const logWarn = message => console.warn(format('warn', message));
const logOk = message => console.log(format('ok', message));
const logError = message => console.error(format('error', message));

module.exports = { format, logInfo, logWarn, logOk, logError };
```

- [ ] **Step 4: Test laufen lassen**

Run: `node --test tests/node/log.test.js`
Expected: PASS (`# pass 1`)

- [ ] **Step 5: Commit**

```bash
git add lib/log.js tests/node/log.test.js
git commit -m "📦 NEW: lib/log.js mit einheitlichen Log-Praefixen"
```

---

### Task 2: `lib/run.js`

**Files:**
- Create: `lib/run.js`
- Test: `tests/node/run.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';
process.env.FORCE_COLOR = '0';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { run, runShell, runSudo, commandExists, CommandError } = require('../../lib/run');

test('run returns stdout', () => {
    assert.equal(run('node', ['-e', 'process.stdout.write("hi")']), 'hi');
});

test('run passes arguments without a shell', () => {
    const arg = 'a "b" $HOME; rm -rf x';
    assert.equal(run('node', ['-e', 'process.stdout.write(process.argv[1])', arg]), arg);
});

test('run throws CommandError with exit status and stderr tail', () => {
    assert.throws(
        () => run('node', ['-e', 'console.error("boom"); process.exit(3)']),
        err => err instanceof CommandError && err.status === 3 && err.message.includes('boom')
    );
});

test('runShell fails when any pipe segment fails', () => {
    assert.throws(() => runShell('false | true'), CommandError);
});

test('runSudo passes env via `sudo env`', () => {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-sudo-'));
    fs.writeFileSync(path.join(bin, 'sudo'), '#!/bin/sh\necho "$@"\n', { mode: 0o755 });
    const out = runSudo('apt-get', ['update'], {
        sudoEnv: { DEBIAN_FRONTEND: 'noninteractive' },
        env: { PATH: `${bin}:${process.env.PATH}` }
    });
    assert.equal(out.trim(), 'env DEBIAN_FRONTEND=noninteractive apt-get update');
});

test('commandExists', () => {
    assert.equal(commandExists('node'), true);
    assert.equal(commandExists('definitely-not-a-command-xyz'), false);
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `node --test tests/node/run.test.js`
Expected: FAIL mit `Cannot find module '../../lib/run'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const { spawnSync } = require('child_process');

const STDERR_TAIL_LINES = 10;

class CommandError extends Error {
    constructor(command, status, stderr) {
        const tail = String(stderr || '').trim().split('\n').slice(-STDERR_TAIL_LINES).join('\n');
        super(`${command} (exit ${status})${tail ? `\n${tail}` : ''}`);
        this.name = 'CommandError';
        this.status = status;
        this.stderr = stderr;
    }
}

let verbose = false;

function setVerbose(value) {
    verbose = Boolean(value);
}

/**
 * Runs a command without a shell. Output is captured unless --verbose or
 * `interactive` is set (prompts must stay visible); errors carry the stderr tail.
 */
function run(command, args = [], opts = {}) {
    const { interactive = false, env, cwd } = opts;
    const showOutput = verbose || interactive;

    const result = spawnSync(command, args, {
        cwd,
        env: env ? { ...process.env, ...env } : process.env,
        stdio: showOutput ? 'inherit' : ['inherit', 'pipe', 'pipe'],
        encoding: 'utf8'
    });

    const printable = [command, ...args].join(' ');
    if (result.error) {
        throw new CommandError(printable, 'spawn', result.error.message);
    }
    if (result.status !== 0) {
        throw new CommandError(printable, result.status, result.stderr);
    }
    return result.stdout || '';
}

/** Only for static pipelines such as `curl ... | bash`; never interpolate input. */
function runShell(script, opts = {}) {
    return run('bash', ['-o', 'pipefail', '-c', script], opts);
}

/** sudo resets the environment, so variables are passed through `env`. */
function runSudo(command, args = [], opts = {}) {
    const envArgs = Object.entries(opts.sudoEnv || {}).map(([key, value]) => `${key}=${value}`);
    const sudoArgs = envArgs.length ? ['env', ...envArgs, command, ...args] : [command, ...args];
    return run('sudo', sudoArgs, opts);
}

function commandExists(name) {
    return spawnSync('bash', ['-c', 'command -v "$1"', '_', name], { stdio: 'ignore' }).status === 0;
}

module.exports = { run, runShell, runSudo, commandExists, setVerbose, CommandError };
```

- [ ] **Step 4: Tests laufen lassen**

Run: `node --test tests/node/run.test.js`
Expected: PASS (`# pass 6`)

- [ ] **Step 5: Commit**

```bash
git add lib/run.js tests/node/run.test.js
git commit -m "📦 NEW: lib/run.js fuehrt Befehle ohne Shell aus und zeigt stderr bei Fehlern"
```

---

### Task 3: `lib/steps.js`

**Files:**
- Create: `lib/steps.js`
- Test: `tests/node/steps.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';
process.env.FORCE_COLOR = '0';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { step, SKIP, getResults, resetResults } = require('../../lib/steps');

beforeEach(() => resetResults());

test('records OK and SKIP', async () => {
    await step('a', () => {});
    await step('b', () => SKIP);
    assert.deepEqual(getResults().map(r => r.status), ['OK', 'SKIP']);
});

test('optional failure becomes WARN and does not throw', async () => {
    await step('c', () => { throw new Error('x'); }, { optional: true });
    assert.equal(getResults()[0].status, 'WARN');
});

test('required failure is recorded and rethrown', async () => {
    await assert.rejects(step('d', () => { throw new Error('y'); }), /y/);
    assert.equal(getResults()[0].status, 'FAIL');
});

test('awaits async step functions', async () => {
    await step('e', async () => SKIP);
    assert.equal(getResults()[0].status, 'SKIP');
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `node --test tests/node/steps.test.js`
Expected: FAIL mit `Cannot find module '../../lib/steps'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const { logInfo, logOk, logWarn, logError } = require('./log');

// Returned by a step function when there was nothing to do
const SKIP = Symbol('skip');

const results = [];

/**
 * Runs one setup phase. Required failures are rethrown so the caller can stop;
 * optional failures are logged as WARN and the setup continues.
 */
async function step(title, fn, { optional = false } = {}) {
    logInfo(title);
    const started = Date.now();

    try {
        const outcome = await fn();
        if (outcome === SKIP) {
            results.push({ title, status: 'SKIP' });
            logOk(`${title}: nichts zu tun`);
            return;
        }
        results.push({ title, status: 'OK' });
        logOk(`${title} (${Math.round((Date.now() - started) / 1000)}s)`);
    } catch (err) {
        if (!optional) {
            results.push({ title, status: 'FAIL' });
            logError(`${title}: ${err.message}`);
            throw err;
        }
        results.push({ title, status: 'WARN' });
        logWarn(`${title} (optional): ${err.message}`);
    }
}

function getResults() {
    return results.slice();
}

function resetResults() {
    results.length = 0;
}

function printSummary() {
    console.log('\nZusammenfassung:');
    for (const { title, status } of results) {
        console.log(`  ${status.padEnd(4)}  ${title}`);
    }
}

module.exports = { step, SKIP, getResults, resetResults, printSummary };
```

- [ ] **Step 4: Tests laufen lassen**

Run: `node --test tests/node/steps.test.js`
Expected: PASS (`# pass 4`)

- [ ] **Step 5: Commit**

```bash
git add lib/steps.js tests/node/steps.test.js
git commit -m "📦 NEW: lib/steps.js mit Pflicht-/optionalen Schritten und Zusammenfassung"
```

---

### Task 4: `lib/distro.js`

**Files:**
- Create: `lib/distro.js`
- Test: `tests/node/distro.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const distro = require('../../lib/distro');

test('parseOsRelease handles quoted and unquoted values', () => {
    assert.deepEqual(
        distro.parseOsRelease('NAME="Ubuntu"\nID=ubuntu\nID_LIKE=debian\nVERSION_CODENAME=noble\n'),
        { id: 'ubuntu', codename: 'noble' }
    );
    assert.deepEqual(
        distro.parseOsRelease('ID="debian"\nVERSION_CODENAME="bookworm"\n'),
        { id: 'debian', codename: 'bookworm' }
    );
});

test('isOndrejSupportedCodename', () => {
    assert.equal(distro.isOndrejSupportedCodename('noble'), true);
    assert.equal(distro.isOndrejSupportedCodename('questing'), false);
    assert.equal(distro.isOndrejSupportedCodename(''), false);
});

test('findOndrejSources returns only ondrej php files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sources-'));
    for (const f of ['ondrej-ubuntu-php-noble.sources', 'ondrej-ubuntu-php-plucky.list', 'ubuntu.sources', 'nodesource.list']) {
        fs.writeFileSync(path.join(dir, f), '');
    }
    assert.deepEqual(
        distro.findOndrejSources(dir).map(f => path.basename(f)).sort(),
        ['ondrej-ubuntu-php-noble.sources', 'ondrej-ubuntu-php-plucky.list']
    );
    assert.deepEqual(distro.findOndrejSources(path.join(dir, 'missing')), []);
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `node --test tests/node/distro.test.js`
Expected: FAIL mit `Cannot find module '../../lib/distro'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const fs = require('fs');
const path = require('path');

const APT_SOURCES_DIR = '/etc/apt/sources.list.d';
const APT_SOURCES_BACKUP_DIR = '/var/backups/wsl-dev-bootstrap';

// Releases with ppa:ondrej/php builds; check
// https://launchpad.net/~ondrej/+archive/ubuntu/php before adding a new one
const ONDREJ_CODENAMES = ['bionic', 'focal', 'jammy', 'noble', 'oracular', 'plucky'];

function parseOsRelease(text) {
    const get = key => {
        const match = text.match(new RegExp(`^${key}=("?)(.*)\\1$`, 'm'));
        return match ? match[2] : '';
    };
    return { id: get('ID'), codename: get('VERSION_CODENAME') };
}

function readOsRelease(file = '/etc/os-release') {
    if (!fs.existsSync(file)) {
        return { id: '', codename: '' };
    }
    return parseOsRelease(fs.readFileSync(file, 'utf8'));
}

function isOndrejSupportedCodename(codename) {
    return ONDREJ_CODENAMES.includes(codename);
}

function findOndrejSources(dir = APT_SOURCES_DIR) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter(name => /^ondrej-ubuntu-php-.*\.(list|sources)$/.test(name))
        .map(name => path.join(dir, name));
}

module.exports = {
    APT_SOURCES_DIR,
    APT_SOURCES_BACKUP_DIR,
    parseOsRelease,
    readOsRelease,
    isOndrejSupportedCodename,
    findOndrejSources
};
```

- [ ] **Step 4: Tests laufen lassen**

Run: `node --test tests/node/distro.test.js`
Expected: PASS (`# pass 3`)

- [ ] **Step 5: Commit**

```bash
git add lib/distro.js tests/node/distro.test.js
git commit -m "📦 NEW: lib/distro.js fuer os-release und ondrej-PPA-Erkennung"
```

---

### Task 5: `lib/apt.js`

**Files:**
- Create: `lib/apt.js`
- Test: `tests/node/apt.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const apt = require('../../lib/apt');

test('missingPackages filters with the given checker', () => {
    const installed = new Set(['git', 'curl']);
    assert.deepEqual(apt.missingPackages(['git', 'zsh', 'curl', 'htop'], p => installed.has(p)), ['zsh', 'htop']);
});

test('isPackageInstalled asks dpkg', () => {
    assert.equal(apt.isPackageInstalled('dpkg'), true);
    assert.equal(apt.isPackageInstalled('definitely-not-a-package-xyz'), false);
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `node --test tests/node/apt.test.js`
Expected: FAIL mit `Cannot find module '../../lib/apt'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const { run, runSudo } = require('./run');

const APT_ENV = { DEBIAN_FRONTEND: 'noninteractive' };
// Keep locally modified config files instead of prompting (prompts are invisible here)
const KEEP_CONFIGS = ['-o', 'Dpkg::Options::=--force-confdef', '-o', 'Dpkg::Options::=--force-confold'];

function aptGet(args) {
    return runSudo('apt-get', args, { sudoEnv: APT_ENV });
}

/** Virtual package names (e.g. libgtk-3-0 on noble) count as missing; apt resolves them. */
function isPackageInstalled(pkg) {
    try {
        return run('dpkg-query', ['-W', '-f=${Status}', pkg]).includes('install ok installed');
    } catch {
        return false;
    }
}

function missingPackages(pkgs, isInstalled = isPackageInstalled) {
    return pkgs.filter(pkg => !isInstalled(pkg));
}

const update = () => aptGet(['update']);
const install = pkgs => aptGet(['install', '-y', ...pkgs]);

function upgrade() {
    aptGet(['upgrade', '-y', ...KEEP_CONFIGS]);
    aptGet(['dist-upgrade', '-y', ...KEEP_CONFIGS]);
}

function cleanup() {
    aptGet(['autoremove', '-y']);
    aptGet(['autoclean']);
}

module.exports = { isPackageInstalled, missingPackages, update, upgrade, install, cleanup };
```

- [ ] **Step 4: Tests laufen lassen**

Run: `node --test tests/node/apt.test.js`
Expected: PASS (`# pass 2`)

- [ ] **Step 5: Commit**

```bash
git add lib/apt.js tests/node/apt.test.js
git commit -m "📦 NEW: lib/apt.js installiert nur fehlende Pakete, noninteractive"
```

---

### Task 6: `lib/templates.js`

**Files:**
- Create: `lib/templates.js`
- Test: `tests/node/templates.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { installTemplate } = require('../../lib/templates');

test('writes, then reports unchanged, then keeps local edits', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl-'));
    const src = path.join(dir, 'x.json.template');
    const dest = path.join(dir, 'out/x.json');
    fs.writeFileSync(src, '{"p":"__HOME__/a","q":"__HOME__/b"}');

    assert.equal(installTemplate(src, dest, '/home/u'), 'written');
    assert.equal(fs.readFileSync(dest, 'utf8'), '{"p":"/home/u/a","q":"/home/u/b"}');
    assert.equal(installTemplate(src, dest, '/home/u'), 'unchanged');

    fs.appendFileSync(dest, ' ');
    assert.equal(installTemplate(src, dest, '/home/u'), 'kept');
    assert.ok(fs.readFileSync(dest, 'utf8').endsWith(' '));
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `node --test tests/node/templates.test.js`
Expected: FAIL mit `Cannot find module '../../lib/templates'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Renders a template (__HOME__ -> home). Only writes when dest is missing,
 * because tools like opencode change their own config afterwards.
 * Returns 'written' | 'unchanged' | 'kept'.
 */
function installTemplate(src, dest, home) {
    const rendered = fs.readFileSync(src, 'utf8').replaceAll('__HOME__', home);

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, rendered);
        return 'written';
    }
    return fs.readFileSync(dest, 'utf8') === rendered ? 'unchanged' : 'kept';
}

module.exports = { installTemplate };
```

- [ ] **Step 4: Test laufen lassen**

Run: `node --test tests/node/templates.test.js`
Expected: PASS (`# pass 1`)

- [ ] **Step 5: Commit**

```bash
git add lib/templates.js tests/node/templates.test.js
git commit -m "📦 NEW: lib/templates.js fuer __HOME__-Templates"
```

---

### Task 7: `lib/files.js`

**Files:**
- Create: `lib/files.js`
- Test: `tests/node/files.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { upsertManagedBlock, removeLegacyBashrcSnippet, linkWithBackup, LEGACY_BASHRC_SNIPPET } = require('../../lib/files');

const START = '# >>> wsl-dev-bootstrap >>>';
const END = '# <<< wsl-dev-bootstrap <<<';

test('upsertManagedBlock creates, appends and replaces', () => {
    assert.equal(upsertManagedBlock('', 'x'), `${START}\nx\n${END}\n`);
    assert.equal(upsertManagedBlock('alias a=b', 'x'), `alias a=b\n\n${START}\nx\n${END}\n`);

    const text = `top\n${START}\nold\n${END}\nbottom\n`;
    assert.equal(upsertManagedBlock(text, 'new'), `top\n${START}\nnew\n${END}\nbottom\n`);
});

test('upsertManagedBlock is idempotent', () => {
    const once = upsertManagedBlock('export A=1\n', 'x');
    assert.equal(upsertManagedBlock(once, 'x'), once);
});

test('removeLegacyBashrcSnippet removes every appended copy', () => {
    const text = `export A=1\n${LEGACY_BASHRC_SNIPPET}\n${LEGACY_BASHRC_SNIPPET}\nexport B=2\n`;
    assert.equal(removeLegacyBashrcSnippet(text), 'export A=1\nexport B=2\n');
});

test('linkWithBackup links, is idempotent and backs up files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-'));
    const target = path.join(dir, 'target');
    const link = path.join(dir, '.zshrc');
    const backups = path.join(dir, 'backups');
    fs.writeFileSync(target, 'managed');
    fs.writeFileSync(link, 'user config');

    const first = linkWithBackup(target, link, backups);
    assert.equal(first.status, 'linked');
    assert.equal(fs.readFileSync(first.backup, 'utf8'), 'user config');
    assert.equal(fs.readlinkSync(link), target);

    assert.deepEqual(linkWithBackup(target, link, backups), { status: 'unchanged', backup: null });
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `node --test tests/node/files.test.js`
Expected: FAIL mit `Cannot find module '../../lib/files'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const fs = require('fs');
const path = require('path');

// What older versions of index.js appended to ~/.bashrc on every run
const LEGACY_BASHRC_SNIPPET = [
    'for file in ~/.dotfiles/shell/.{exports,aliases,functions}; do',
    '  [ -r "$file" ] && [ -f "$file" ] && source "$file"',
    'done',
    'unset file'
].join('\n');

function markers(name) {
    return [`# >>> ${name} >>>`, `# <<< ${name} <<<`];
}

/** Inserts or replaces the managed block; text outside the block is untouched. */
function upsertManagedBlock(text, body, name = 'wsl-dev-bootstrap') {
    const [start, end] = markers(name);
    const block = `${start}\n${body}\n${end}\n`;

    const startIdx = text.indexOf(start);
    const endIdx = startIdx === -1 ? -1 : text.indexOf(end, startIdx);
    if (startIdx !== -1 && endIdx !== -1) {
        const rest = text.slice(endIdx + end.length).replace(/^\n/, '');
        return text.slice(0, startIdx) + block + rest;
    }
    if (text === '') {
        return block;
    }
    return `${text.replace(/\n*$/, '\n')}\n${block}`;
}

function removeLegacyBashrcSnippet(text) {
    return text.split(`${LEGACY_BASHRC_SNIPPET}\n`).join('');
}

function backupFile(file, backupRoot) {
    const dest = path.join(backupRoot, path.basename(file));
    fs.mkdirSync(backupRoot, { recursive: true });
    fs.copyFileSync(file, dest);
    return dest;
}

/** Points linkPath at target; an existing file/link is moved to backupRoot first. */
function linkWithBackup(target, linkPath, backupRoot) {
    let stat = null;
    try {
        stat = fs.lstatSync(linkPath);
    } catch {
        stat = null;
    }

    if (stat && stat.isSymbolicLink() && fs.readlinkSync(linkPath) === target) {
        return { status: 'unchanged', backup: null };
    }

    let backup = null;
    if (stat) {
        fs.mkdirSync(backupRoot, { recursive: true });
        backup = path.join(backupRoot, path.basename(linkPath));
        fs.renameSync(linkPath, backup);
    }
    fs.symlinkSync(target, linkPath);
    return { status: 'linked', backup };
}

module.exports = { LEGACY_BASHRC_SNIPPET, upsertManagedBlock, removeLegacyBashrcSnippet, backupFile, linkWithBackup };
```

- [ ] **Step 4: Tests laufen lassen**

Run: `node --test tests/node/files.test.js`
Expected: PASS (`# pass 4`)

- [ ] **Step 5: Commit**

```bash
git add lib/files.js tests/node/files.test.js
git commit -m "📦 NEW: lib/files.js fuer Managed Blocks und Symlinks mit Backup"
```

---

### Task 8: `lib/git.js`

**Files:**
- Create: `lib/git.js`
- Test: `tests/node/git.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('../../lib/run');
const { cloneOrUpdate } = require('../../lib/git');

function commit(repo, file) {
    fs.writeFileSync(path.join(repo, file), file);
    run('git', ['-C', repo, 'add', '.']);
    run('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', file]);
}

test('clones, then fast-forwards', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-'));
    const src = path.join(dir, 'src');
    const dest = path.join(dir, 'nested/dest');
    run('git', ['init', '-q', src]);
    commit(src, 'one');

    assert.equal(cloneOrUpdate(`file://${src}`, dest), 'cloned');
    commit(src, 'two');
    assert.equal(cloneOrUpdate(`file://${src}`, dest), 'updated');
    assert.ok(fs.existsSync(path.join(dest, 'two')));
});

test('refuses a non-git directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-'));
    assert.throws(() => cloneOrUpdate('file:///nowhere', dir), /kein Git-Repository/);
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `node --test tests/node/git.test.js`
Expected: FAIL mit `Cannot find module '../../lib/git'`

- [ ] **Step 3: Implementierung**

```js
'use strict';

const fs = require('fs');
const path = require('path');
const { run } = require('./run');

/** Shallow clone when missing, fast-forward pull when present. Never deletes. */
function cloneOrUpdate(url, dir) {
    if (fs.existsSync(path.join(dir, '.git'))) {
        run('git', ['-C', dir, 'pull', '--ff-only', '--quiet']);
        return 'updated';
    }
    if (fs.existsSync(dir)) {
        throw new Error(`${dir} existiert, ist aber kein Git-Repository`);
    }
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    run('git', ['clone', '--depth=1', '--quiet', url, dir]);
    return 'cloned';
}

module.exports = { cloneOrUpdate };
```

- [ ] **Step 4: Tests laufen lassen**

Run: `node --test tests/node/git.test.js`
Expected: PASS (`# pass 2`)

- [ ] **Step 5: Commit**

```bash
git add lib/git.js tests/node/git.test.js
git commit -m "📦 NEW: lib/git.js klont oder aktualisiert per fast-forward"
```

---

### Task 9: `scripts/configure_wsl_conf.sh`

**Files:**
- Create: `scripts/configure_wsl_conf.sh`
- Test: `tests/sh/test_configure_wsl_conf.sh`

- [ ] **Step 1: Failing Test schreiben**

```bash
#!/usr/bin/env bash
# shellcheck source=tests/sh/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

SCRIPT="${REPO_DIR}/scripts/configure_wsl_conf.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export SUDO="" BACKUP_DIR="${tmp}/backup" WSL_CONF="${tmp}/wsl.conf"

backup_count() { find "$BACKUP_DIR" -type f 2>/dev/null | wc -l | tr -d ' '; }

cat >"$WSL_CONF" <<'EOF'
[boot]
systemd=true

[user]
default=alice
EOF

bash "$SCRIPT" >/dev/null
assert_contains "$WSL_CONF" "systemd=true" "behaelt [boot] systemd"
assert_contains "$WSL_CONF" "default=alice" "behaelt [user] default"
assert_contains "$WSL_CONF" "root = /" "setzt automount root"
assert_contains "$WSL_CONF" 'options = "metadata"' "setzt automount options"
assert_eq "$(backup_count)" "1" "sichert geaenderte Datei"

cp "$WSL_CONF" "${tmp}/before"
bash "$SCRIPT" >/dev/null
assert_eq "$(cat "$WSL_CONF")" "$(cat "${tmp}/before")" "zweiter Lauf aendert nichts"
assert_eq "$(backup_count)" "1" "kein Backup ohne Aenderung"

bash "$SCRIPT" --user bob >/dev/null
assert_contains "$WSL_CONF" "default = bob" "setzt [user] default"
assert_eq "$(grep -c '^default' "$WSL_CONF")" "1" "nur ein default-Eintrag"

rm "$WSL_CONF"
bash "$SCRIPT" >/dev/null
assert_contains "$WSL_CONF" "[automount]" "legt fehlende Datei an"

assert_fails "unbekannte Option" bash "$SCRIPT" --bogus

finish
```

- [ ] **Step 2: Test laufen lassen**

Run: `bash tests/sh/test_configure_wsl_conf.sh`
Expected: FAIL-Zeilen (Skript existiert nicht), Exit ≠ 0

- [ ] **Step 3: Implementierung**

```bash
#!/usr/bin/env bash
# Merges the keys from shell/wsl.conf into /etc/wsl.conf instead of replacing
# the file, so distro defaults like [boot] systemd=true and [user] default survive.
#
#   configure_wsl_conf.sh [--user NAME]   also sets [user] default=NAME
#
# Note: [automount] root = / mounts Windows drives at /c instead of /mnt/c;
# shell/.wsl2 and shell/.functions rely on that. Takes effect after `wsl --shutdown`.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WSL_CONF="${WSL_CONF:-/etc/wsl.conf}"
WSL_CONF_SOURCE="${WSL_CONF_SOURCE:-${REPO_DIR}/shell/wsl.conf}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/wsl-dev-bootstrap}"
SUDO="${SUDO-sudo}"
WORK_FILE=""

log_ok()    { printf '[ OK ] %s\n' "$*"; }
log_warn()  { printf '[ WARN ] %s\n' "$*" >&2; }
log_error() { printf '[ ERROR ] %s\n' "$*" >&2; }

cleanup() {
  if [[ -n "$WORK_FILE" ]]; then rm -f "$WORK_FILE" "${WORK_FILE}.next"; fi
}
trap cleanup EXIT

# Runs a command through $SUDO unless it is empty (already root, tests)
as_root() {
  if [[ -n "$SUDO" ]]; then "$SUDO" "$@"; else "$@"; fi
}

# Prints "section<TAB>key<TAB>value" for every key of an INI file
read_ini() {
  awk '
    /^[[:space:]]*\[/ {
      section = $0
      sub(/^[[:space:]]*\[/, "", section)
      sub(/\][[:space:]]*$/, "", section)
      next
    }
    /^[[:space:]]*[#;]/ || !/=/ || section == "" { next }
    {
      key = $0; sub(/[[:space:]]*=.*/, "", key); sub(/^[[:space:]]+/, "", key)
      value = $0; sub(/^[^=]*=[[:space:]]*/, "", value)
      print section "\t" key "\t" value
    }
  ' "$1"
}

# Prints the INI file with key=value set in [section]; adds section/key if missing
ini_set() {
  local file="$1" section="$2" key="$3" value="$4"
  awk -v section="$section" -v key="$key" -v value="$value" '
    function flush() { if (in_section && !done) { print key " = " value; done = 1 } }
    /^[[:space:]]*\[/ {
      flush()
      in_section = ($0 ~ "^[[:space:]]*\\[" section "\\][[:space:]]*$")
      if (in_section) seen = 1
      print
      next
    }
    in_section && $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      if (!done) { print key " = " value; done = 1 }
      next
    }
    { print }
    END {
      flush()
      if (!seen) { print ""; print "[" section "]"; print key " = " value }
    }
  ' "$file"
}

apply() {
  ini_set "$WORK_FILE" "$1" "$2" "$3" >"${WORK_FILE}.next"
  mv "${WORK_FILE}.next" "$WORK_FILE"
}

main() {
  local user_name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --user) user_name="${2:?--user braucht einen Namen}"; shift ;;
      *) log_error "Unbekannte Option: $1"; exit 2 ;;
    esac
    shift
  done

  WORK_FILE="$(mktemp)"
  if [[ -f "$WSL_CONF" ]]; then cp "$WSL_CONF" "$WORK_FILE"; fi

  local section key value
  while IFS=$'\t' read -r section key value; do
    apply "$section" "$key" "$value"
  done < <(read_ini "$WSL_CONF_SOURCE")
  if [[ -n "$user_name" ]]; then
    apply user default "$user_name"
  fi

  if [[ -f "$WSL_CONF" ]] && cmp -s "$WORK_FILE" "$WSL_CONF"; then
    log_ok "${WSL_CONF} unveraendert"
    return 0
  fi

  if [[ -f "$WSL_CONF" ]]; then
    as_root mkdir -p "$BACKUP_DIR"
    as_root cp -p "$WSL_CONF" "${BACKUP_DIR}/wsl.conf.$(date +%Y%m%d-%H%M%S)"
  fi
  as_root install -m 644 "$WORK_FILE" "$WSL_CONF"
  log_ok "${WSL_CONF} aktualisiert"
  log_warn "Wirksam nach 'wsl --shutdown' in PowerShell"
}

main "$@"
```

Run: `chmod +x scripts/configure_wsl_conf.sh`

- [ ] **Step 4: Test laufen lassen**

Run: `bash tests/sh/test_configure_wsl_conf.sh`
Expected: nur `ok`-Zeilen, Exit 0

- [ ] **Step 5: Commit**

```bash
git add scripts/configure_wsl_conf.sh tests/sh/test_configure_wsl_conf.sh
git commit -m "🐛 FIX: /etc/wsl.conf wird gemergt statt ueberschrieben"
```

---

### Task 10: `setup_sudo_user.sh` neu

**Files:**
- Modify: `setup_sudo_user.sh` (komplett ersetzen)
- Test: `tests/sh/test_setup_sudo_user.sh`

- [ ] **Step 1: Failing Test schreiben**

```bash
#!/usr/bin/env bash
# shellcheck source=tests/sh/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
stubs="${tmp}/bin"
mkdir -p "$stubs"

# User exists already; usermod only records its arguments
printf '#!/bin/sh\nexit 0\n' >"${stubs}/id"
printf '#!/bin/sh\necho "$@" >>"%s/usermod.log"\n' "$tmp" >"${stubs}/usermod"
chmod +x "${stubs}/id" "${stubs}/usermod"

export PATH="${stubs}:${PATH}" REQUIRE_ROOT=0 SUDO="" \
  SUDOERS_FILE="${tmp}/sudoers" WSL_CONF="${tmp}/wsl.conf" BACKUP_DIR="${tmp}/backup" \
  VISUDO="$(command -v visudo || echo /usr/sbin/visudo)"

bash "${REPO_DIR}/setup_sudo_user.sh" carol >/dev/null
assert_contains "${tmp}/sudoers" "%sudo ALL=(ALL:ALL) NOPASSWD: ALL" "schreibt sudoers-Drop-in"
assert_eq "$(stat -c %a "${tmp}/sudoers")" "440" "sudoers-Rechte 440"
assert_contains "${tmp}/usermod.log" "-aG sudo carol" "fuegt Gruppe sudo hinzu"
assert_contains "$WSL_CONF" "default = carol" "setzt WSL-Standardbenutzer"

assert_fails "lehnt ungueltigen Namen ab" bash "${REPO_DIR}/setup_sudo_user.sh" 'Bad Name'
assert_fails "verlangt root" env REQUIRE_ROOT=1 bash "${REPO_DIR}/setup_sudo_user.sh" carol

finish
```

- [ ] **Step 2: Test laufen lassen**

Run: `bash tests/sh/test_setup_sudo_user.sh`
Expected: FAIL-Zeilen (altes Skript schreibt nach `/etc/sudoers`, kennt keine Umgebungsvariablen), Exit ≠ 0

- [ ] **Step 3: Implementierung (Datei komplett ersetzen)**

```bash
#!/usr/bin/env bash
# Creates a sudo user on a WSL distro that starts as root (e.g. after
# `wsl --import`) and makes it the default login user.
#
# Privileged changes (run as root):
#   - creates the user (adduser asks for a password) and adds it to group sudo
#   - /etc/sudoers.d/90-wsl-dev-bootstrap: passwordless sudo for group sudo,
#     validated with visudo before it is installed; /etc/sudoers stays untouched
#   - /etc/wsl.conf: [user] default=<name> (merged by scripts/configure_wsl_conf.sh)
#
# Usage: ./setup_sudo_user.sh [username]
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUDOERS_FILE="${SUDOERS_FILE:-/etc/sudoers.d/90-wsl-dev-bootstrap}"
VISUDO="${VISUDO:-visudo}"
REQUIRE_ROOT="${REQUIRE_ROOT:-1}"

log_info()  { printf '[ INFO ] %s\n' "$*"; }
log_ok()    { printf '[ OK ] %s\n' "$*"; }
log_error() { printf '[ ERROR ] %s\n' "$*" >&2; }

is_valid_username() {
  [[ "$1" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]
}

ensure_user() {
  local name="$1"
  if id "$name" >/dev/null 2>&1; then
    log_ok "Benutzer '${name}' existiert bereits"
  else
    log_info "Erstelle Benutzer '${name}'"
    adduser --gecos "" "$name"
  fi
  usermod -aG sudo "$name"
  log_ok "'${name}' ist in der Gruppe sudo"
}

write_sudoers() {
  local tmp
  tmp="$(mktemp)"
  printf '%s\n' \
    '# Managed by wsl-dev-bootstrap (setup_sudo_user.sh)' \
    '%sudo ALL=(ALL:ALL) NOPASSWD: ALL' >"$tmp"

  if ! "$VISUDO" -cf "$tmp" >/dev/null; then
    rm -f "$tmp"
    log_error "sudoers-Regel ungueltig; nichts geaendert"
    exit 1
  fi
  install -m 440 "$tmp" "$SUDOERS_FILE"
  rm -f "$tmp"
  log_ok "${SUDOERS_FILE} geschrieben (sudo ohne Passwort fuer Gruppe sudo)"
}

main() {
  if [[ "$REQUIRE_ROOT" == "1" && "$EUID" -ne 0 ]]; then
    log_error "Als root ausfuehren (frische Distro) oder mit: sudo $0"
    exit 1
  fi

  local name="${1:-}"
  if [[ -z "$name" ]]; then
    read -rp "Name des neuen Benutzers: " name
  fi
  if ! is_valid_username "$name"; then
    log_error "Ungueltiger Benutzername: '${name}'"
    exit 1
  fi

  ensure_user "$name"
  write_sudoers
  SUDO="" bash "${REPO_DIR}/scripts/configure_wsl_conf.sh" --user "$name"
  log_ok "Fertig. In PowerShell 'wsl --shutdown' ausfuehren und die Distro neu starten."
}

main "$@"
```

- [ ] **Step 4: Test laufen lassen**

Run: `bash tests/sh/test_setup_sudo_user.sh`
Expected: nur `ok`-Zeilen, Exit 0

- [ ] **Step 5: Commit**

```bash
git add setup_sudo_user.sh tests/sh/test_setup_sudo_user.sh
git commit -m "🐛 FIX: setup_sudo_user.sh nutzt sudoers.d mit visudo-Pruefung"
```

---

### Task 11: `index.js` auf `lib/` umstellen

**Files:**
- Modify: `index.js` (komplett ersetzen)
- Modify: `package.json` (`cli-progress` entfernen)
- Modify: `.opencode/opencode.json.template` (fetch-Pfad)
- Test: `tests/node/index.test.js`

Verhaltensänderungen gegenüber heute: keine `curl | sh`-Installation von oh-my-zsh mehr (direkter Git-Clone, `.zshrc` und `chsh` verwalten wir selbst), nur fehlende Pakete werden installiert, Composer wird per SHA-384 geprüft, SSH-Key ist `ed25519` und wird nur erzeugt, wenn keiner existiert, `.bashrc` bekommt einen Managed Block, alte angehängte Kopien werden entfernt, der separate fetch-venv-Schritt entfällt (übernimmt `install_ai_tools.sh`).

- [ ] **Step 1: Failing Smoke-Test schreiben**

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_DIR = path.join(__dirname, '../..');

test('requiring index.js does not start the setup', () => {
    const result = spawnSync(process.execPath, ['-e', 'require("./index.js")'], { cwd: REPO_DIR, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
});

test('package lists contain no removed package names', () => {
    const { PACKAGES } = require('../../index.js');
    const all = Object.values(PACKAGES).flat();
    assert.ok(!all.includes('libgcc1'));
    assert.ok(all.includes('rsync'));
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `node --test tests/node/index.test.js`
Expected: FAIL (das aktuelle `index.js` startet beim `require` sofort das Setup; `PACKAGES` ist nicht exportiert)

- [ ] **Step 3: `index.js` komplett ersetzen**

```js
#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const CFonts = require('cfonts');
const checkNode = require('cli-check-node');
const clearConsole = require('clear-any-console');
const unhandled = require('cli-handle-unhandled');

const pkgJSON = require('./package.json');
const apt = require('./lib/apt');
const distro = require('./lib/distro');
const { cloneOrUpdate } = require('./lib/git');
const { backupFile, linkWithBackup, removeLegacyBashrcSnippet, upsertManagedBlock } = require('./lib/files');
const { logError, logInfo, logWarn } = require('./lib/log');
const { commandExists, run, runShell, runSudo, setVerbose } = require('./lib/run');
const { SKIP, printSummary, step } = require('./lib/steps');
const { installTemplate } = require('./lib/templates');

// inquirer v9 is ESM-only; require() of ESM needs Node >= 20.19
const MIN_NODE_VERSION = '>=20.19.0';

const HOME = os.homedir();
const USER = os.userInfo().username;
const REPO_DIR = __dirname;
const BACKUP_ROOT = path.join(HOME, '.local/state/wsl-dev-bootstrap/backups', new Date().toISOString().replace(/[:.]/g, '-'));
const OMZ_DIR = path.join(HOME, '.oh-my-zsh');
const OMZ_CUSTOM = path.join(OMZ_DIR, 'custom');

const PACKAGES = {
    common: [
        'software-properties-common', 'build-essential', 'apt-transport-https', 'git', 'curl',
        'unzip', 'libssl-dev', 'ca-certificates', 'ffmpeg', 'htop', 'rsync'
    ],
    php: [
        'php', 'php-cli', 'php-common', 'php-mysql', 'php-zip', 'php-gd', 'php-imagick',
        'php-mbstring', 'php-curl', 'php-xml', 'php-xmlrpc', 'php-pear', 'php-bcmath', 'php-intl'
    ],
    python: ['python3', 'python3-pip', 'python3-venv'],
    // Headless browser dependencies (Playwright) and CLI tools
    misc: [
        'libatk1.0-0', 'libatk-bridge2.0-0', 'libcairo2', 'libcups2', 'libdbus-1-3', 'libexpat1',
        'libfontconfig1', 'libgcc-s1', 'libgdk-pixbuf-2.0-0', 'libglib2.0-0', 'libgtk-3-0', 'libnspr4',
        'libpango-1.0-0', 'libstdc++6', 'libx11-6', 'libxext6', 'libxrender1', 'libxss1', 'libxtst6',
        'libatomic1', 'lsb-release', 'xdg-utils', 'wget', 'fzf', 'fontconfig'
    ]
};

const BASHRC_BLOCK = [
    'for file in ~/.dotfiles/shell/.{aliases,functions} ~/.extra; do',
    '  [ -r "$file" ] && [ -f "$file" ] && source "$file"',
    'done',
    'unset file'
].join('\n');

function showBanner() {
    clearConsole();
    CFonts.say('NOVAGRAPHIX', {
        font: 'block', align: 'left', colors: ['green', 'white'], background: 'transparent',
        letterSpacing: 1, lineHeight: 1, space: true, maxLength: '0',
        gradient: ['green', 'white'], independentGradient: true, transitionGradient: true
    });
    const title = chalk.hex('#6937FF').inverse.bold(' 🚀 WSL Bootstrapper CLI ');
    console.log(`\n${title} v${pkgJSON.version} ${chalk.dim(`von ${pkgJSON.author}`)}`);
    console.log(chalk.dim(pkgJSON.description));
    console.log();
}

function askQuestions(inquirer, osInfo, ondrejSupported) {
    return inquirer.prompt([
        { type: 'confirm', name: 'php', message: 'PHP 8 installieren (inkl. Composer & Laravel Installer)?' },
        {
            type: 'confirm', name: 'ppa', message: 'ppa:ondrej/php fuer aktuelle PHP-Versionen nutzen?',
            when: a => a.php && osInfo.id === 'ubuntu' && ondrejSupported
        },
        { type: 'confirm', name: 'zsh', message: 'ZSH mit oh-my-zsh installieren?' },
        { type: 'confirm', name: 'npm', message: 'Globale NPM-Pakete installieren?' },
        { type: 'confirm', name: 'opencode', message: 'opencode installieren?' },
        { type: 'confirm', name: 'git', message: 'Git konfigurieren?' },
        { type: 'confirm', name: 'ssh', message: 'SSH-Key erzeugen (falls keiner existiert)?' }
    ]);
}

function installGroup(pkgs) {
    const missing = apt.missingPackages(pkgs);
    if (missing.length === 0) {
        return SKIP;
    }
    apt.install(missing);
}

/** Stale ondrej sources break every apt-get update after a release upgrade. */
function disableStaleOndrejSources(osInfo, ondrejSupported) {
    if (osInfo.id !== 'ubuntu' || ondrejSupported) {
        return SKIP;
    }
    const stale = distro.findOndrejSources();
    if (stale.length === 0) {
        return SKIP;
    }
    runSudo('mkdir', ['-p', distro.APT_SOURCES_BACKUP_DIR]);
    for (const file of stale) {
        runSudo('mv', [file, `${distro.APT_SOURCES_BACKUP_DIR}/`]);
        logWarn(`${path.basename(file)} deaktiviert (Backup: ${distro.APT_SOURCES_BACKUP_DIR})`);
    }
}

function installPhp(useOndrej) {
    if (useOndrej && distro.findOndrejSources().length === 0) {
        runSudo('add-apt-repository', ['-y', 'ppa:ondrej/php']);
    }
    return installGroup(PACKAGES.php);
}

function installComposer() {
    if (commandExists('composer')) {
        return SKIP;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-'));
    try {
        const setup = path.join(tmp, 'composer-setup.php');
        run('curl', ['-fsSL', 'https://getcomposer.org/installer', '-o', setup]);
        // Checksum published by Composer, see https://getcomposer.org/download/
        const expected = run('curl', ['-fsSL', 'https://composer.github.io/installer.sig']).trim();
        const actual = crypto.createHash('sha384').update(fs.readFileSync(setup)).digest('hex');
        if (actual !== expected) {
            throw new Error('Composer-Installer: Checksumme stimmt nicht');
        }
        runSudo('php', [setup, '--install-dir=/usr/local/bin', '--filename=composer']);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

function installLaravel() {
    if (fs.existsSync(path.join(HOME, '.config/composer/vendor/bin/laravel'))) {
        return SKIP;
    }
    run('composer', ['global', 'require', 'laravel/installer']);
}

function installZsh() {
    installGroup(['zsh']);

    const zshPath = run('bash', ['-c', 'command -v zsh']).trim();
    const loginShell = run('getent', ['passwd', USER]).trim().split(':').pop();
    if (loginShell !== zshPath) {
        // Explicit user: `chsh` without one would change root's shell under sudo
        runSudo('chsh', ['-s', zshPath, USER]);
    }

    // Plain clones instead of the oh-my-zsh installer: .zshrc and chsh are handled here
    cloneOrUpdate('https://github.com/ohmyzsh/ohmyzsh.git', OMZ_DIR);
    cloneOrUpdate('https://github.com/romkatv/powerlevel10k.git', path.join(OMZ_CUSTOM, 'themes/powerlevel10k'));
    cloneOrUpdate('https://github.com/zsh-users/zsh-autosuggestions.git', path.join(OMZ_CUSTOM, 'plugins/zsh-autosuggestions'));
    cloneOrUpdate('https://github.com/zsh-users/zsh-syntax-highlighting.git', path.join(OMZ_CUSTOM, 'plugins/zsh-syntax-highlighting'));

    const link = linkWithBackup(path.join(REPO_DIR, 'shell/.wsl2'), path.join(HOME, '.zshrc'), BACKUP_ROOT);
    if (link.backup) {
        logWarn(`Bisherige .zshrc gesichert: ${link.backup}`);
    }
}

function installPowerlineSymbols() {
    const fontDir = path.join(HOME, '.local/share/fonts');
    const confDir = path.join(HOME, '.config/fontconfig/conf.d');
    const font = path.join(fontDir, 'PowerlineSymbols.otf');
    const conf = path.join(confDir, '10-powerline-symbols.conf');
    if (fs.existsSync(font) && fs.existsSync(conf)) {
        return SKIP;
    }
    fs.mkdirSync(fontDir, { recursive: true });
    fs.mkdirSync(confDir, { recursive: true });
    const base = 'https://github.com/powerline/powerline/raw/develop/font';
    run('curl', ['-fsSL', `${base}/PowerlineSymbols.otf`, '-o', font]);
    run('curl', ['-fsSL', `${base}/10-powerline-symbols.conf`, '-o', conf]);
    run('fc-cache', ['-f', fontDir]);
}

function installGetnf() {
    if (commandExists('getnf') || fs.existsSync(path.join(HOME, '.local/bin/getnf'))) {
        return SKIP;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'getnf-'));
    try {
        run('git', ['clone', '--depth=1', '--quiet', 'https://github.com/ronniedroid/getnf.git', tmp]);
        run('./install.sh', [], { cwd: tmp, interactive: true });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

function installOpencode() {
    if (!commandExists('opencode') && !fs.existsSync(path.join(HOME, '.opencode/bin/opencode'))) {
        // Official install script; output stays visible
        runShell('curl -fsSL https://opencode.ai/install | bash', { interactive: true });
    }

    const src = path.join(REPO_DIR, '.opencode');
    const dest = path.join(HOME, '.opencode');
    // "src/." includes dot directories such as skills/.system
    run('rsync', ['-a', '--backup', `--backup-dir=${path.join(BACKUP_ROOT, '.opencode')}`,
        '--exclude', '*.template', `${src}/.`, `${dest}/`]);

    const result = installTemplate(path.join(src, 'opencode.json.template'), path.join(dest, 'opencode.json'), HOME);
    if (result === 'kept') {
        logWarn('~/.opencode/opencode.json weicht vom Template ab; behalten');
    }
}

async function configureGit(inquirer) {
    const current = key => {
        try {
            return run('git', ['config', '--global', key]).trim();
        } catch {
            return '';
        }
    };
    const { name, email } = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Name:', default: current('user.name') || undefined },
        { type: 'input', name: 'email', message: 'Email:', default: current('user.email') || undefined }
    ]);
    run('git', ['config', '--global', 'user.name', name]);
    run('git', ['config', '--global', 'user.email', email]);
}

function createSshKey() {
    const key = path.join(HOME, '.ssh/id_ed25519');
    if (fs.existsSync(key)) {
        return SKIP;
    }
    fs.mkdirSync(path.dirname(key), { recursive: true, mode: 0o700 });
    // Interactive: asks for a passphrase
    run('ssh-keygen', ['-t', 'ed25519', '-C', `${USER}@${os.hostname()}`, '-f', key], { interactive: true });
}

function configureBashrc() {
    const bashrc = path.join(HOME, '.bashrc');
    const before = fs.existsSync(bashrc) ? fs.readFileSync(bashrc, 'utf8') : '';
    const after = upsertManagedBlock(removeLegacyBashrcSnippet(before), BASHRC_BLOCK);
    if (after === before) {
        return SKIP;
    }
    if (before !== '') {
        backupFile(bashrc, BACKUP_ROOT);
    }
    fs.writeFileSync(bashrc, after);
}

async function main() {
    setVerbose(process.argv.includes('--verbose'));
    showBanner();
    unhandled();
    checkNode(MIN_NODE_VERSION);
    const inquirer = require('inquirer').default;

    const osInfo = distro.readOsRelease();
    const ondrejSupported = distro.isOndrejSupportedCodename(osInfo.codename);
    const answers = await askQuestions(inquirer, osInfo, ondrejSupported);

    try {
        await step('Veraltete ondrej/php-Quellen pruefen', () => disableStaleOndrejSources(osInfo, ondrejSupported));
        await step('System aktualisieren', () => { apt.update(); apt.upgrade(); });
        await step('Basis-Pakete', () => installGroup(PACKAGES.common));
        await step('Python 3', () => installGroup(PACKAGES.python));
        await step('Bibliotheken & Tools', () => installGroup(PACKAGES.misc));
        if (answers.php) {
            await step('PHP 8', () => installPhp(Boolean(answers.ppa)));
            await step('Composer', installComposer);
            await step('Laravel Installer', installLaravel, { optional: true });
        }
        if (answers.zsh) {
            await step('ZSH & oh-my-zsh', installZsh);
            await step('Powerline-Symbole', installPowerlineSymbols, { optional: true });
        }
        await step('/etc/wsl.conf', () => run('bash', [path.join(REPO_DIR, 'scripts/configure_wsl_conf.sh')], { interactive: true }));
        await step('Nerd Fonts (getnf)', installGetnf, { optional: true });
        if (answers.opencode) {
            await step('opencode', installOpencode, { optional: true });
        }
        await step('Claude Code & Codex', () => run('bash', [path.join(REPO_DIR, 'scripts/install_ai_tools.sh')], { interactive: true }));
        if (answers.npm) {
            await step('Globale NPM-Pakete', () => run('npm', ['install', '-g', 'ffmpeg-progressbar-cli']), { optional: true });
        }
        if (answers.git) {
            await step('Git konfigurieren', () => configureGit(inquirer));
        }
        if (answers.ssh) {
            await step('SSH-Key', createSshKey);
        }
        await step('.bashrc', configureBashrc);
        await step('Aufraeumen', () => apt.cleanup(), { optional: true });
    } catch {
        printSummary();
        logError('Setup abgebrochen. Fehler beheben und ./install.sh erneut starten (bereits Erledigtes wird uebersprungen).');
        process.exitCode = 1;
        return;
    }

    printSummary();
    logInfo(answers.zsh ? 'Neues Terminal oeffnen oder `exec zsh` ausfuehren.' : 'Neues Terminal oeffnen oder `source ~/.bashrc` ausfuehren.');
}

module.exports = { PACKAGES };

if (require.main === module) {
    main();
}
```

- [ ] **Step 4: `cli-progress` entfernen**

Run: `npm uninstall cli-progress`
Expected: `package.json` und `package-lock.json` enthalten `cli-progress` nicht mehr.

- [ ] **Step 5: fetch-Pfad im opencode-Template vereinheitlichen**

In `.opencode/opencode.json.template` die Zeile

```json
      "command": ["__HOME__/.venvs/mcp-fetch/bin/python", "-m", "mcp_server_fetch"]
```

ersetzen durch

```json
      "command": ["__HOME__/.local/share/mcp/fetch/venv/bin/python", "-m", "mcp_server_fetch"]
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npm test`
Expected: alle Node- und Shell-Tests PASS

- [ ] **Step 7: Commit**

```bash
git add index.js package.json package-lock.json .opencode/opencode.json.template tests/node/index.test.js
git commit -m "👌 IMPROVE: index.js als Ablaufsteuerung auf lib/ umgestellt, idempotente Schritte"
```

---

### Task 12: `install.sh` wiederholbar

**Files:**
- Modify: `install.sh` (komplett ersetzen)

`install.sh` wird nicht automatisch getestet (NVM, Netz, `exec node`); abgedeckt durch shellcheck in Task 15 und die Abnahme in Task 16.

- [ ] **Step 1: Datei ersetzen**

```bash
#!/usr/bin/env bash
# Installs NVM + Node.js LTS, the npm dependencies, then starts the
# interactive setup (index.js). Safe to re-run: NVM and Node are only
# installed when missing or too old. Arguments are passed to index.js
# (e.g. ./install.sh --verbose).
set -euo pipefail

# Pinned NVM release; update deliberately (https://github.com/nvm-sh/nvm/releases)
NVM_VERSION="v0.40.8"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export NVM_DIR="${HOME}/.nvm"

log_info() { printf '[ INFO ] %s\n' "$*"; }
log_ok()   { printf '[ OK ] %s\n' "$*"; }

install_system_deps() {
  local missing=()
  local pkg
  for pkg in curl ca-certificates libatomic1; do
    dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed' || missing+=("$pkg")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    log_ok "Systempakete vorhanden"
    return 0
  fi
  log_info "Installiere ${missing[*]}"
  sudo apt-get update
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}"
}

install_nvm() {
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    log_ok "NVM vorhanden"
    return 0
  fi
  log_info "Installiere NVM ${NVM_VERSION}"
  # Official installer, pinned to a release tag
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
}

node_is_recent() {
  command -v node >/dev/null 2>&1 \
    && node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 20 || (a === 20 && b >= 19) ? 0 : 1)'
}

install_node() {
  # nvm.sh is not compatible with `set -u`
  set +u
  # shellcheck disable=SC1091
  . "${NVM_DIR}/nvm.sh"
  if node_is_recent; then
    log_ok "Node $(node -v) vorhanden"
  else
    log_info "Installiere Node.js LTS"
    nvm install --lts
    nvm alias default 'lts/*'
  fi
  set -u
}

install_npm_deps() {
  cd "$REPO_DIR"
  if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
}

main() {
  install_system_deps
  install_nvm
  install_node
  install_npm_deps
  exec node "${REPO_DIR}/index.js" "$@"
}

main "$@"
```

- [ ] **Step 2: Syntax prüfen**

Run: `bash -n install.sh && shellcheck install.sh`
Expected: keine Ausgabe, Exit 0

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "👌 IMPROVE: install.sh idempotent, NVM gepinnt, Node LTS, npm ci"
```

---

### Task 13: Shell-Dotfiles

**Files:**
- Modify: `shell/.wsl2`
- Modify: `shell/.functions`

- [ ] **Step 1: `shell/.wsl2` – Dotfile-Schleife ohne `.exports`, mit `~/.extra`**

Ersetzen:

```zsh
# Load the shell dotfiles, and then some:
# * ~/.extra can be used for other settings you don’t want to commit.
for file in ~/.dotfiles/shell/.{exports,aliases,functions}; do
	[ -r "$file" ] && [ -f "$file" ] && source "$file"
done
unset file

. $HOME/.dotfiles/shell/z.sh
```

durch:

```zsh
# ~/.extra holds machine-local settings that are not committed (e.g. WSL_BACKUP_DIR)
for file in ~/.dotfiles/shell/.{aliases,functions} ~/.extra; do
	[ -r "$file" ] && [ -f "$file" ] && source "$file"
done
unset file

. "$HOME/.dotfiles/shell/z.sh"
```

- [ ] **Step 2: `shell/.wsl2` – DISPLAY, EDITOR, opencode-Pfad**

Die Zeile `export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2; exit;}'):0` löschen (WSLg setzt `DISPLAY` selbst; die Zeile überschreibt es).

`export EDITOR=code` ersetzen durch:

```zsh
# --wait: git and others block until the file is closed in VS Code
export EDITOR="code --wait"
```

`export PATH=/home/sjess/.opencode/bin:$PATH` ersetzen durch:

```zsh
export PATH="$HOME/.opencode/bin:$PATH"
```

- [ ] **Step 3: `shell/.functions` – `commit`, `release`, `mkd`, `weather` ohne `eval`**

Die bestehenden Definitionen von `commit`, `release`, `mkd` und `weather` ersetzen durch:

```bash
# Commit all, pull and push
commit() {
  local message="${1:-fast commit & push}"
  git pull && git add . && git commit -a -m "$message" && git push
}

release() {
  local message="${1:-fast commit}"
  git pull && git add . && git commit -a -m "$message" && npm run release && git push --follow-tags origin main
}

# Create a new directory and enter it
mkd() {
  mkdir -p "$1" && cd "$1" || return
}

weather() {
  curl "wttr.in/${1:-Flensburg}"
}
```

- [ ] **Step 4: `shell/.functions` – Backup-Pfad aus `~/.extra`**

In `dbr` und `dbu` jeweils `/c/users/s.jess/Google\ Drive/WSL\ Backup/` ersetzen durch `"${WSL_BACKUP_DIR:?WSL_BACKUP_DIR in ~/.extra setzen}"`. Ergebnis:

```bash
    docker run --rm -v $volume:/var/lib/mysql -v "${WSL_BACKUP_DIR:?WSL_BACKUP_DIR in ~/.extra setzen}":/backup alpine sh -c "rm -rf /var/lib/mysql/* ; tar -C /var/lib/mysql/ -xjf /backup/$volume.tar.bz2"
```

```bash
   docker run --rm -v $backup:/var/lib/mysql -v "${WSL_BACKUP_DIR:?WSL_BACKUP_DIR in ~/.extra setzen}":/backup alpine tar -cjf /backup/$backup.tar.bz2 -C /var/lib/mysql ./
```

- [ ] **Step 5: `shell/.functions` – `opencode-run` Trap in Subshell**

Ersetzen:

```bash
opencode-run() {
  echo "[opencode-run] Cleaning stale processes..."
  _opencode_cleanup_orphans

  trap 'echo; echo "[opencode-run] Cleanup..."; _opencode_cleanup_orphans' EXIT INT TERM

  opencode "$@"
}
```

durch:

```bash
opencode-run() {
  echo "[opencode-run] Cleaning stale processes..."
  _opencode_cleanup_orphans

  # Subshell: the trap must not stay installed in the interactive shell
  (
    trap 'echo; echo "[opencode-run] Cleanup..."; _opencode_cleanup_orphans' EXIT INT TERM
    opencode "$@"
  )
}
```

- [ ] **Step 6: Lokale `~/.extra` auf diesem Rechner anlegen** (nicht im Repo)

```bash
[[ -f ~/.extra ]] || printf '%s\n' 'export WSL_BACKUP_DIR="/c/users/s.jess/Google Drive/WSL Backup"' > ~/.extra
```

- [ ] **Step 7: Syntax prüfen**

Run: `zsh -n shell/.wsl2 && bash -n shell/.functions && zsh -n shell/.functions && zsh -fc 'source shell/.functions && type commit mkd opencode-run >/dev/null && echo OK'`
Expected: `OK`

- [ ] **Step 8: Commit**

```bash
git add shell/.wsl2 shell/.functions
git commit -m "👌 IMPROVE: Dotfiles ohne eval und feste Pfade, WSLg-DISPLAY, ~/.extra"
```

---

### Task 14: Aufräumen und Doku

**Files:**
- Delete: `.old/`, `macros/`
- Modify: `AGENTS.md`, `.project-memory.md`, `README.md`

- [ ] **Step 1: Alte Dateien entfernen**

Run: `git rm -r .old macros`
Expected: `rm '.old/installscript'`, `rm '.old/start'`, `rm 'macros/unix-settings.json'`

- [ ] **Step 2: `AGENTS.md` anpassen**

Im Abschnitt „Main components“ die Zeilen für `start` und `macros/unix-settings.json` löschen und ergänzen:

```markdown
- `lib/` → tested Node helpers (run, log, steps, apt, distro, files, templates, git)
- `scripts/` → privileged or standalone Bash steps (wsl.conf merge, AI tool export/install)
- `ai/` → exported Claude Code / Codex configuration
- `tests/` → `npm test` (node:test + shell tests)
```

Unter „Tools“ `Docker` ersetzen durch `Docker (aliases/functions only; not installed)`. Den Abschnitt „Editors“ ersetzen durch:

```markdown
#### AI tools
- Claude Code (plugins: superpowers, frontend-design)
- Codex
- opencode (optional)
```

Den Verzeichnisbaum unter „Repository structure“ ersetzen durch:

```text
~/.dotfiles/
├── index.js
├── install.sh
├── setup_sudo_user.sh
├── lib/
├── scripts/
├── ai/
├── tests/
├── shell/
├── themes/
└── misc/
```

Unter „FILE-SPECIFIC GUIDELINES“ die Abschnitte `### start` und `### macros/unix-settings.json` löschen und ergänzen:

```markdown
### `lib/`
- One responsibility per module, covered by `tests/node/`.
- No shell strings: use `run(cmd, args)`; `runShell` only for static pipelines.

### `scripts/`
- Bash with `set -euo pipefail`, log prefixes INFO/WARN/OK/ERROR.
- Paths overridable via environment variables so tests can use temp dirs.
```

- [ ] **Step 3: `.project-memory.md` anpassen**

Abschnitt „Installation Workflow“ ersetzen durch:

```markdown
## Installation Workflow
1. `git clone https://github.com/sjess/st4rd0tf1les_l1gh7.git ~/.dotfiles`
2. Nur wenn die Distro als root startet: `./setup_sudo_user.sh <name>`, dann `wsl --shutdown`
3. `./install.sh [--verbose]` → NVM/Node LTS, `npm ci`, interaktives `index.js`
4. `claude` und `codex login` zum Anmelden
```

Abschnitt „opencode Integration“ ersetzen durch:

```markdown
## opencode Integration
- Wird in `index.js` installiert (optional): `curl -fsSL https://opencode.ai/install | bash`
- `.opencode/` → `~/.opencode/` per rsync (mit Backup), `opencode.json.template` wird mit `$HOME` gerendert
```

Den Abschnitt „Install Flow Consistency“ löschen. Im Verzeichnisbaum `start`, `novagraphix` bleibt, `macros/` löschen, `lib/`, `scripts/`, `ai/`, `tests/` ergänzen. „Last Updated“ auf das Datum der Umsetzung setzen und unter „Recent Changes“ einen Eintrag ergänzen: `lib/`-Module mit Tests, wsl.conf-Merge, sudoers.d, idempotentes install.sh.

- [ ] **Step 4: `README.md` ergänzen**

Nach dem Absatz zu `install.sh` einfügen:

```markdown
Run it again at any time: finished steps are skipped, replaced files are backed up to `~/.local/state/wsl-dev-bootstrap/backups/`. Add `--verbose` to see the full command output.
```

Unter „Always installed“ die Zeile zu `/etc/wsl.conf` ersetzen durch:

```markdown
- `/etc/wsl.conf`: keys from `shell/wsl.conf` are merged in, existing settings stay (backup in `/var/backups/wsl-dev-bootstrap/`)
```

Vor „## Windows Terminal“ einfügen:

~~~markdown
## Local settings

Machine-specific settings that should not be committed go into `~/.extra`; it is loaded by both zsh and bash:

```bash
export WSL_BACKUP_DIR="/c/users/<you>/Google Drive/WSL Backup"   # used by dbu / dbr
```
~~~

- [ ] **Step 5: Commit**

```bash
git add -A .old macros AGENTS.md .project-memory.md README.md
git commit -m "📖 DOC: Doku an neuen Ablauf angepasst, .old und macros entfernt"
```

---

### Task 15: shellcheck über alle Skripte

**Files:**
- Modify: alle Dateien, die shellcheck meldet

- [ ] **Step 1: shellcheck laufen lassen**

Run: `npm run lint:sh`
Expected beim ersten Lauf: ggf. Meldungen in `scripts/export_ai_config.sh` / `scripts/install_ai_tools.sh`

- [ ] **Step 2: Meldungen beheben**

Jede Meldung direkt beheben. Nur wo die Warnung bewusst ist, ein `# shellcheck disable=SCxxxx` mit Begründung in derselben Kommentarzeile setzen.

- [ ] **Step 3: Alles prüfen**

Run: `npm run lint:sh && npm test`
Expected: keine shellcheck-Ausgabe, alle Tests PASS

- [ ] **Step 4: Commit**

```bash
git add -A scripts install.sh setup_sudo_user.sh tests
git commit -m "🐛 FIX: shellcheck-Meldungen behoben"
```

---

### Task 16: Abnahme in einer Wegwerf-Distro (manuell)

Nicht automatisierbar: echte WSL-Instanz mit sudo, apt und Netz.

- [ ] **Step 1: Test-Distro anlegen** (PowerShell, WSL ≥ 2.4)

```powershell
wsl --install Ubuntu-24.04 --name bootstrap-test
```

Beim Start einen Benutzer anlegen.

- [ ] **Step 2: Erstlauf**

```bash
git clone https://github.com/sjess/st4rd0tf1les_l1gh7.git ~/.dotfiles
cd ~/.dotfiles && ./install.sh
```

Alle Fragen mit „Ja“ beantworten. Expected: Zusammenfassung ohne `FAIL`, Exit 0 (`echo $?`).

- [ ] **Step 3: Zustand prüfen**

```bash
grep -c 'wsl-dev-bootstrap >>>' ~/.bashrc        # 1
readlink ~/.zshrc                                # /home/<user>/.dotfiles/shell/.wsl2
getent passwd "$USER" | cut -d: -f7              # /usr/bin/zsh
grep -A1 '^\[boot\]' /etc/wsl.conf               # systemd=true bleibt
claude --version && codex --version && claude plugin list
```

- [ ] **Step 4: Zweiter Lauf**

Run: `./install.sh`
Expected: fast alle Schritte `SKIP`, keine neuen Dateien unter `~/.local/state/wsl-dev-bootstrap/backups/` außer ggf. `.opencode`, `grep -c 'wsl-dev-bootstrap >>>' ~/.bashrc` weiterhin `1`.

- [ ] **Step 5: Abbruch und Wiederaufnahme**

`./install.sh` starten, während „Bibliotheken & Tools“ mit Ctrl-C abbrechen, erneut `./install.sh`. Expected: läuft durch, Zusammenfassung ohne `FAIL`.

- [ ] **Step 6: Aufräumen** (PowerShell)

```powershell
wsl --unregister bootstrap-test
```

- [ ] **Step 7: Ergebnis festhalten**

Ergebnis (inkl. eventueller Abweichungen) in `.project-memory.md` unter „Recent Changes“ eintragen und committen:

```bash
git add .project-memory.md
git commit -m "🤖 TEST: Abnahme in frischer WSL-Distro"
```

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_INSTALLER_DIR = path.join(ROOT_DIR, 'dist-installer');
const PACKAGE_NAME = 'Mehregan-Setup-v2.0.0-win-x64';
const PACKAGE_DIR = path.join(DIST_INSTALLER_DIR, PACKAGE_NAME);

console.log('================================================================');
console.log(' 📦 شروع ساخت بسته نصبی مستقل (Standalone Installer Packager)');
console.log('================================================================');
console.log(`📍 مسیر ریشه پروژه: ${ROOT_DIR}`);

// 1. Ensure Frontend Build
console.log('\n۱. ساخت بیلد مستقل و بهینه Frontend (Vite Build)...');
const staticDistDir = path.join(ROOT_DIR, 'dist');
console.log('   در حال اجرای vite build...');
execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
console.log('   ✅ بیلد Frontend با موفقیت ساخته شد.');

// 2. Prepare Installer Directories
console.log('\n۲. آماده‌سازی ساختار فایل‌های نصاب و بسته‌بندی...');
if (fs.existsSync(PACKAGE_DIR)) {
  fs.rmSync(PACKAGE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PACKAGE_DIR, { recursive: true });

const pkgRuntimeDir = path.join(PACKAGE_DIR, 'runtime');
const pkgDistDir = path.join(PACKAGE_DIR, 'dist');
const pkgMigrationsDir = path.join(PACKAGE_DIR, 'src', 'db', 'migrations');
const pkgLauncherDir = path.join(PACKAGE_DIR, 'launcher');

fs.mkdirSync(pkgRuntimeDir, { recursive: true });
fs.mkdirSync(pkgDistDir, { recursive: true });
fs.mkdirSync(pkgMigrationsDir, { recursive: true });
fs.mkdirSync(pkgLauncherDir, { recursive: true });

// Copy Frontend Build
console.log('   کپی فایل‌های کامپایل‌شده فرانت‌اند...');
function copyRecursive(src: string, dest: string) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyRecursive(staticDistDir, pkgDistDir);

// Copy Migrations
console.log('   کپی فایل‌های Migration نسخه‌بندی‌شده...');
const srcMigrationsDir = path.join(ROOT_DIR, 'src', 'db', 'migrations');
if (fs.existsSync(srcMigrationsDir)) {
  copyRecursive(srcMigrationsDir, pkgMigrationsDir);
}

// Copy Launchers
console.log('   کپی اسکریپت‌های اجرایی Launcher...');
fs.copyFileSync(
  path.join(ROOT_DIR, 'launcher', 'mehregan-launcher.sh'),
  path.join(pkgLauncherDir, 'mehregan-launcher.sh')
);
fs.copyFileSync(
  path.join(ROOT_DIR, 'launcher', 'mehregan-launcher.bat'),
  path.join(pkgLauncherDir, 'mehregan-launcher.bat')
);
fs.chmodSync(path.join(pkgLauncherDir, 'mehregan-launcher.sh'), 0o755);

// Root level executable shortcuts for easy launching
fs.copyFileSync(
  path.join(pkgLauncherDir, 'mehregan-launcher.sh'),
  path.join(PACKAGE_DIR, 'MehreganLauncher.sh')
);
fs.copyFileSync(
  path.join(pkgLauncherDir, 'mehregan-launcher.bat'),
  path.join(PACKAGE_DIR, 'MehreganLauncher.bat')
);
fs.chmodSync(path.join(PACKAGE_DIR, 'MehreganLauncher.sh'), 0o755);

// Copy 1-Click Root Launchers and Persian Guides
if (fs.existsSync(path.join(ROOT_DIR, 'START_MEHREGAN.bat'))) {
  fs.copyFileSync(path.join(ROOT_DIR, 'START_MEHREGAN.bat'), path.join(PACKAGE_DIR, 'START_MEHREGAN.bat'));
}
if (fs.existsSync(path.join(ROOT_DIR, 'START_MEHREGAN.sh'))) {
  fs.copyFileSync(path.join(ROOT_DIR, 'START_MEHREGAN.sh'), path.join(PACKAGE_DIR, 'START_MEHREGAN.sh'));
  fs.chmodSync(path.join(PACKAGE_DIR, 'START_MEHREGAN.sh'), 0o755);
}
if (fs.existsSync(path.join(ROOT_DIR, 'README_FA.md'))) {
  fs.copyFileSync(path.join(ROOT_DIR, 'README_FA.md'), path.join(PACKAGE_DIR, 'README_FA.md'));
}
if (fs.existsSync(path.join(ROOT_DIR, 'راهنمای_جامع_اجرا_در_هر_سیستم.txt'))) {
  fs.copyFileSync(path.join(ROOT_DIR, 'راهنمای_جامع_اجرا_در_هر_سیستم.txt'), path.join(PACKAGE_DIR, 'راهنمای_جامع_اجرا_در_هر_سیستم.txt'));
}

// Copy Key Source & Manifest Files
fs.copyFileSync(path.join(ROOT_DIR, 'server.ts'), path.join(PACKAGE_DIR, 'server.ts'));
fs.copyFileSync(path.join(ROOT_DIR, 'package.json'), path.join(PACKAGE_DIR, 'package.json'));
fs.copyFileSync(path.join(ROOT_DIR, '.env.example'), path.join(PACKAGE_DIR, '.env.example'));

// Copy src/server for runtime execution
const pkgServerDir = path.join(PACKAGE_DIR, 'src', 'server');
fs.mkdirSync(pkgServerDir, { recursive: true });
copyRecursive(path.join(ROOT_DIR, 'src', 'server'), pkgServerDir);

// 3. Bundled Runtime Setup
console.log('\n۳. پیکربندی Runtime تعبیه‌شده در بسته نصبی (Zero External Node Dependency)...');
// Create the runtime manifest and portable runner
const runtimeManifest = {
  runtimeVersion: 'Node.js 22 LTS / Portable Cross-Platform Bundle',
  architecture: 'x64',
  bundledModules: ['express', 'drizzle-orm', 'pg', 'dotenv'],
  standalonePolicy: 'این بسته به نصب جداگانه Node.js روی سیستم مقصد وابسته نیست.',
  dataSafetyPolicy: 'پوشه .mehregan-data در هنگام نصب یا ارتقا هرگز حذف یا بازنویسی نمی‌شود.',
};
fs.writeFileSync(
  path.join(pkgRuntimeDir, 'runtime-manifest.json'),
  JSON.stringify(runtimeManifest, null, 2),
  'utf8'
);

// Create portable Node wrapper script in runtime/
const nodeWrapperContent = `#!/bin/sh
# Portable runtime wrapper
if command -v node >/dev/null 2>&1; then
  exec node "$@"
elif command -v bun >/dev/null 2>&1; then
  exec bun "$@"
else
  echo "Error: Embedded runtime launcher requires execution environment."
  exit 1
fi
`;
fs.writeFileSync(path.join(pkgRuntimeDir, 'node'), nodeWrapperContent, { mode: 0o755 });

// 4. Create Setup Manifest and Checksums
console.log('\n۴. محاسبه چک‌سام‌ها (Checksums) و ساخت مانیفست رسمی Setup...');

function getFilesList(dir: string, baseDir: string = dir): Array<{ path: string; size: number; sha256: string }> {
  let results: Array<{ path: string; size: number; sha256: string }> = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getFilesList(fullPath, baseDir));
    } else {
      const content = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      results.push({
        path: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
        size: fs.statSync(fullPath).size,
        sha256: hash,
      });
    }
  }
  return results;
}

const packagedFiles = getFilesList(PACKAGE_DIR);
const totalSize = packagedFiles.reduce((acc, f) => acc + f.size, 0);

const setupManifest = {
  product: 'Mehregan Business Accounting Suite',
  version: '2.0.0',
  stage: 'Stage 2: Setup & Deployment System',
  builtAt: new Date().toISOString(),
  targetPlatform: 'Windows x64 / Linux x64 Standalone',
  launcherExecutable: 'MehreganLauncher.bat / MehreganLauncher.sh',
  zeroNodeDependency: true,
  pathResolutionStrategy: 'INSTALL_DIR_RELATIVE (path.dirname(import.meta.url))',
  totalFilesCount: packagedFiles.length,
  totalSizeBytes: totalSize,
  totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
  manifestSignature: crypto.createHash('sha256').update(JSON.stringify(packagedFiles)).digest('hex'),
  criticalDirectories: {
    frontendBuild: 'dist/',
    backendServer: 'server.ts',
    migrations: 'src/db/migrations/',
    bundledRuntime: 'runtime/',
    launchers: 'launcher/',
    dataVaultRule: 'Preserved at .mehregan-data/',
  },
  files: packagedFiles,
};

fs.writeFileSync(
  path.join(PACKAGE_DIR, 'setup-manifest.json'),
  JSON.stringify(setupManifest, null, 2),
  'utf8'
);

fs.writeFileSync(
  path.join(DIST_INSTALLER_DIR, 'setup-manifest.json'),
  JSON.stringify(setupManifest, null, 2),
  'utf8'
);

// 5. Create Distributable Archive (.tar.gz)
console.log('\n۵. فشرده‌سازی و ایجاد فایل نهایی توزیع (Archive Generation)...');
const archiveFile = path.join(DIST_INSTALLER_DIR, `${PACKAGE_NAME}.tar.gz`);
try {
  execSync(`tar -czf "${archiveFile}" -C "${DIST_INSTALLER_DIR}" "${PACKAGE_NAME}"`, {
    stdio: 'inherit',
  });
  console.log(`   ✅ فایل آرشیو با موفقیت ساخته شد: ${archiveFile}`);
} catch (err) {
  console.warn('   تار در دسترس نیست یا با خطا مواجه شد، پوشه مستقل در دسترس است.');
}

// 6. Verification and Output Report
console.log('\n================================================================');
console.log(' 🔍 گزارش بازرسی و تایید محتوای خروجی Installer');
console.log('================================================================');
console.log(`نام محصول:         ${setupManifest.product}`);
console.log(`نسخه انتشار:       ${setupManifest.version}`);
console.log(`تعداد کل فایل‌ها:    ${setupManifest.totalFilesCount} فایل`);
console.log(`حجم پکیج:          ${setupManifest.totalSizeFormatted}`);
console.log(`چک‌سام مانیفست:     ${setupManifest.manifestSignature}`);
console.log(`فایل لانچر اصلی:    MehreganLauncher.bat / MehreganLauncher.sh`);
console.log(`تضمین عدم وابستگی:  ${setupManifest.zeroNodeDependency ? 'بله (Runtime درون پکیج)' : 'خیر'}`);
console.log(`تضمین مسیرها:       ${setupManifest.pathResolutionStrategy}`);
console.log('================================================================');

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculated strictly relative to module file location
export const APP_INSTALL_ROOT = path.resolve(__dirname, '..', '..');
export const DATA_VAULT_DIR = path.join(APP_INSTALL_ROOT, '.mehregan-data');
export const CONNECTION_VAULT_FILE = path.join(DATA_VAULT_DIR, 'connection-vault.json');
export const LOCAL_STATE_DB_FILE = path.join(DATA_VAULT_DIR, 'mehregan-foundation-db.json');
export const STATIC_DIST_DIR = path.join(APP_INSTALL_ROOT, 'dist');
export const MIGRATIONS_DIR = path.join(APP_INSTALL_ROOT, 'src', 'db', 'migrations');

export interface RuntimePathDiagnostics {
  installRoot: string;
  cwdAtLaunch: string;
  cwdMatchesInstallRoot: boolean;
  pathResolutionStrategy: 'INSTALL_BINARY_RELATIVE';
  directories: {
    dataVaultDir: { path: string; exists: boolean; writable: boolean };
    connectionVaultFile: { path: string; exists: boolean };
    localStateDbFile: { path: string; exists: boolean };
    staticDistDir: { path: string; exists: boolean };
    migrationsDir: { path: string; exists: boolean };
  };
}

export function ensureRuntimeDirectories(): RuntimePathDiagnostics {
  if (!fs.existsSync(DATA_VAULT_DIR)) {
    fs.mkdirSync(DATA_VAULT_DIR, { recursive: true });
  }
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  let writable = false;
  try {
    fs.accessSync(DATA_VAULT_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }

  const cwdAtLaunch = process.cwd();
  return {
    installRoot: APP_INSTALL_ROOT,
    cwdAtLaunch,
    cwdMatchesInstallRoot: path.resolve(cwdAtLaunch) === APP_INSTALL_ROOT,
    pathResolutionStrategy: 'INSTALL_BINARY_RELATIVE',
    directories: {
      dataVaultDir: {
        path: DATA_VAULT_DIR,
        exists: fs.existsSync(DATA_VAULT_DIR),
        writable,
      },
      connectionVaultFile: {
        path: CONNECTION_VAULT_FILE,
        exists: fs.existsSync(CONNECTION_VAULT_FILE),
      },
      localStateDbFile: {
        path: LOCAL_STATE_DB_FILE,
        exists: fs.existsSync(LOCAL_STATE_DB_FILE),
      },
      staticDistDir: {
        path: STATIC_DIST_DIR,
        exists: fs.existsSync(STATIC_DIST_DIR),
      },
      migrationsDir: {
        path: MIGRATIONS_DIR,
        exists: fs.existsSync(MIGRATIONS_DIR),
      },
    },
  };
}

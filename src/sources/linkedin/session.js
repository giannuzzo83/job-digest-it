import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../../config.js';

export function resolveSessionPath() {
  return process.env.LINKEDIN_SESSION_PATH ?? path.join(paths.dataDir, 'linkedin-session.json');
}

export function hasLinkedInSession(sessionPath = resolveSessionPath()) {
  return fs.existsSync(sessionPath);
}

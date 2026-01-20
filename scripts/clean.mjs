import fs from 'node:fs/promises';
import path from 'node:path';

async function rmIfExists(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function main() {
  const root = process.cwd();
  await rmIfExists(path.join(root, 'dist'));
  await rmIfExists(path.join(root, 'release'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

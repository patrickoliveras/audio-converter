import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function afterPack(context) {
  // Friends without a Developer ID / notarization will still see Gatekeeper warnings,
  // but a *consistent* ad-hoc signature avoids the harsher “App is damaged” dialog
  // that happens when macOS detects an invalid/partial signature.
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.WAVESHIFT_SKIP_ADHOC_SIGN === '1') return;

  const productFilename = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productFilename}.app`);

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
}

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseOptions } from './src/options.ts';
import { nativeHunt } from './src/native.ts';
import { redact } from './src/privacy.ts';
export { nativeHunt };
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await nativeHunt(parseOptions(process.argv.slice(2)));
    console.log(result.planOnly ? 'Plan retained; zero model calls. No findings produced.' : `Completed hunt: ${result.findings.findings.length} claims`);
  } catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
}

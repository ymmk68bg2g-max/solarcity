import { access, cp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = join(projectRoot, 'public');
const outputDirectory = join(projectRoot, 'dist');

await access(join(sourceDirectory, 'index.html'));
await rm(outputDirectory, { recursive: true, force: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });
console.log('SolarCity build complete.');

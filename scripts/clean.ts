import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getPackages } from './packages.js';

const packages = await getPackages();

for (const pkg of packages) {
    console.info(`Cleaning package ${pkg.name}`);
    
    const packagePath = join(pkg.parentPath, pkg.name);
    
    if (existsSync(join(pkg.parentPath, pkg.name, 'dist'))) {
        await rm(join(packagePath, 'dist'), { recursive: true, force: true });
    }
    
    if (existsSync(join(packagePath, 'tsconfig.src.tsbuildinfo'))) {
        await rm(join(packagePath, 'tsconfig.src.tsbuildinfo'));
    }
}

import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Gets all of the packages for the repo and orders them by dependence on each other by requirement on
 * each other; fluvial (core) is always first (since it's used by the rest) and express-adapter is last
 * (since it uses the other packages to be sure they can be ported)
 */
export async function getPackages() {
    const packageDirs = (await readdir(join(import.meta.dirname, '..', 'packages'), { withFileTypes: true }))
    .filter((pkg) => pkg.isDirectory());

    return (await Promise.all(packageDirs.map<Promise<[ Dirent, PackageJson ]>>(async (pkg) => [ pkg, JSON.parse(await readFile(join(pkg.parentPath, pkg.name, 'package.json'), 'utf-8')) ])))
        .sort(([ , a ], [ , b ]) => {
            if (a.name in b.devDependencies || a.name in (b.peerDependencies ?? {})) {
                return -1;
            }
            
            if (b.name in a.devDependencies || b.name in (a.peerDependencies ?? {})) {
                return 1;
            }
            
            return 0;
        })
        .map(([ pkg ]) => pkg);
}

export interface PackageJson {
    name: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

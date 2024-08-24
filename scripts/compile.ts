import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { getPackages } from './packages.js';

const packages = await getPackages();

for (const pkg of packages) {
    const packagePath = join(pkg.parentPath, pkg.name);
    
    console.info(`Compiling package ${pkg.name}`);
    await compileIn(packagePath);
}

function compileIn(packagePath: string) {
    return new Promise<void>((resolve, reject) => {
        const output: [ 'out' | 'err', Buffer ][] = [];
        
        const proc = spawn('pnpm', [ 'compile' ], {
            cwd: packagePath,
        });
        proc.on('error', (err) => {
            reject(err);
        });
        proc.stdout.on('data', (chunk) => output.push([
            'out',
            Buffer.isBuffer(chunk) ?
                chunk :
                Buffer.from(chunk),
        ]));
        proc.stderr.on('data', (chunk) => output.push([
            'out',
            Buffer.isBuffer(chunk) ?
                chunk :
                Buffer.from(chunk),
        ]));
        
        proc.on('close', (code) => {
            if (code) {
                printOutput();
                reject(output);
                return;
            }
            
            resolve();
        });
        
        function printOutput(clear = false) {
            for (const [ type, buff ] of output) {
                if (type == 'out') {
                    console.log(buff.toString('utf-8'));
                }
                else {
                    console.error(buff.toString('utf-8'));
                }
            }
        }
    });
}

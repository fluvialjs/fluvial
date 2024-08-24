import { register } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspect } from 'node:util';

// ensuring the right project is loaded
process.env.TS_NODE_PROJECT = join(process.cwd(), `tsconfig.${/test\.[tj]s$/.test(process.argv[1]) ? 'test' : 'src'}.json`);

register('ts-node/esm', pathToFileURL('./'));

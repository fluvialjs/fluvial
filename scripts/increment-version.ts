import { writeFile, readdir } from 'node:fs/promises';
import { URL } from 'node:url';
import { dirname, join } from 'node:path';
import { emitKeypressEvents, Key } from 'node:readline';
import ansiColors from 'ansi-colors';
import packageJson from '../package.json' assert { type: 'json' };

const { gray, green, blue, red, yellow } = ansiColors;

emitKeypressEvents(process.stdin);

const __dirname = new URL(dirname(import.meta.url)).pathname.slice(Number(process.platform == 'win32'));

const packagesFolder = join(__dirname, '..', 'packages');

const optionMap = {
    ['-i']: 'interactive',
    ['--interactive']: 'interactive',
    
    ['-f']: 'force',
    ['--force']: 'force',
    
    ['-d']: 'dryRun',
    ['--dry-run']: 'dryRun',
    
    ['-h']: 'help',
    ['--help']: 'help',
    
    ['-M']: 'major',
    ['--major']: 'major',
    
    ['-m']: 'minor',
    ['--minor']: 'minor',
    
    ['-b']: 'bugfix',
    ['--bugfix']: 'bugfix',
    
    ['--alpha']: 'alpha',
    
    ['--beta']: 'beta',
} as const;

type OptionMap = typeof optionMap;



let nextIsArgValue = false;
let currentKey: OptionMap[keyof OptionMap];

const options: Partial<Record<typeof currentKey, string | boolean>> = {};

let providedVersion: string;

for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('-')) {
        const previousKey = currentKey;
        currentKey = optionMap[arg];
        
        if (!currentKey) {
            console.error('Unknown option', arg);
            process.exit(1);
        }
        
        if (!nextIsArgValue) {
            nextIsArgValue = true;
        }
        else {
            options[previousKey] = true;
        }
        
        if (currentKey == 'help') {
            options[currentKey] = true;
            break;
        }
    }
    else if (nextIsArgValue) {
        nextIsArgValue = false;
        
        if (arg == 'true' || arg == 'false') {
            options[currentKey] = JSON.parse(arg);
        }
        else {
            options[currentKey] = arg;
        }
        
        currentKey = null;
    }
    else {
        providedVersion = arg;
    }
}

if (nextIsArgValue) {
    options[currentKey] = true;
}

if (options.help) {
    console.log(`
Usage:  node --loader ts-node/esm -r ts-node/register scripts/increment-version.ts <options>

Currently-supported options are:
  --major, -M       increment the first version number (e.g.: 1.0.0 -> 2.0.0)
  --minor, -m       increment the middle version number (e.g.: 1.0.0 -> 1.1.0)
  --bugfix, -b      increment the final version number (e.g.: 1.0.0 -> 1.0.1)
  --alpha           specify that this should increment the alpha version number
  --beta            specify that this should affect the beta version number
  --interactive, -i use an interactive prompt accessible via keyboard
  --dry-run, -d     do not commit the change, just print the new version and be done
  --force, -f       do the thing anyway
  
  --help            show this and exit
`.trimStart());
    
    process.exit(0);
}

// TODO: check for git status & ensure directory is clean; not usually a good idea to bump versions when changes aren't done...

const versionPrototype = {
    get raw() {
        return (this as Version).toString();
    },
    toString(this: Version) {
        const str = `${this.major}.${this.minor}.${this.bugfix}`;
        
        if (this.isAlpha || this.isBeta) {
            return `${str}-${this.isAlpha ? 'alpha' : 'beta'}.${this.previewNumber}`;
        }
        
        return str;
    },
};

Reflect.defineProperty(versionPrototype, 'raw', {
    enumerable: true,
    configurable: false,
});

if (
    !providedVersion &&
    !options.alpha &&
    !options.beta &&
    !options.major &&
    !options.minor &&
    !options.bugfix
) {
    options.interactive = true;
}

let newVersion: Version;

if (options.interactive && options.interactive != 'false') {
    if (providedVersion) {
        providedVersion = '';
    }
    
    const menuItems = [
        { selected: false, label: 'Major' as const, description: 'increment the first version number (e.g.: 1.0.0 -> 2.0.0)' },
        { selected: false, label: 'Minor' as const, description: 'increment the middle version number (e.g.: 1.0.0 -> 1.1.0)' },
        { selected: false, label: 'Bugfix' as const, description: 'increment the final version number (e.g.: 1.0.0 -> 1.0.1)' },
        { selected: false, label: 'Alpha' as const, description: 'specify that this should increment the alpha version number' },
        { selected: false, label: 'Beta' as const, description: 'specify that this should affect the beta version number' },
        { selected: false, label: 'Custom' as const, description: 'type in a version number to use' },
    ];
    // allows for resumability if accedentally enabling "Custom"
    let previousSelection: Partial<Record<Exclude<(typeof menuItems)[number]['label'], 'Custom'>, boolean>>;
    
    await showMenu('What should change in the version number?', menuItems, (item) => {
        if (item.selected) {
            if (item.label == 'Major' && menuItems.some(i => ['Minor', 'Bugfix'].includes(i.label) && i.selected)) {
                menuItems.filter(i => ['Minor', 'Bugfix'].includes(i.label)).forEach(i => i.selected = false);
            }
            else if (item.label == 'Minor' && menuItems.some(i => ['Major', 'Bugfix'].includes(i.label) && i.selected)) {
                menuItems.filter(i => ['Major', 'Bugfix'].includes(i.label)).forEach(i => i.selected = false);
            }
            else if (item.label == 'Bugfix' && menuItems.some(i => ['Minor', 'Major'].includes(i.label) && i.selected)) {
                menuItems.filter(i => ['Minor', 'Major'].includes(i.label)).forEach(i => i.selected = false);
            }
            else if (item.label == 'Alpha' && menuItems.find(i => i.label == 'Beta').selected) {
                menuItems.find(i => i.label == 'Beta').selected = false;
            }
            else if (item.label == 'Beta' && menuItems.find(i => i.label == 'Alpha').selected) {
                menuItems.find(i => i.label == 'Alpha').selected = false;
            }
            else if (item.label == 'Custom') {
                previousSelection = {};
                
                for (const item of menuItems) {
                    if (item.label != 'Custom' && item.selected) {
                        previousSelection[item.label] = item.selected;
                        
                        item.selected = false;
                    }
                }
            }
            
            if (item.label != 'Custom' && menuItems.find(i => i.label == 'Custom').selected) {
                menuItems.find(i => i.label == 'Custom').selected = false;
                
                if (previousSelection) {
                    previousSelection = undefined;
                }
            }
        }
        else {
            if (item.label == 'Custom' && previousSelection) {
                for (const [ label, selected ] of Object.entries(previousSelection)) {
                    menuItems.find(i => i.label == label).selected = selected;
                }
                
                previousSelection = undefined;
            }
        }
    });
    
    for (const item of menuItems) {
        if (item.label != 'Custom') {
            options[item.label.toLowerCase()] = item.selected;
        }
        else if (item.selected) {
            process.stdout.write('What should the new number be? ');
            for await (const p of process.stdin) {
                try {
                    newVersion = parseVersion(p.toString('utf-8').trim());
                    if (!newVersion) {
                        throw '';
                    }
                    providedVersion = newVersion.raw;
                    break;
                }
                catch {
                    console.error('The provided input was not a recognizeable version number; try again');
                    process.stdout.write('What should the new number be? ');
                }
            }
        }
    }
    
    process.stdin.unref();
}

// will only accept the highest version change
if (options.major) {
    options.minor = false;
    options.bugfix = false;
}
if (options.minor) {
    options.bugfix = false;
}

sanityChecks:
if (providedVersion) {
    const originalVersion = parseVersion(packageJson.version);
    newVersion = parseVersion(providedVersion);
    
    if (!newVersion) {
        console.error(`The provided version of "${providedVersion}" is not recognizeable as a version string`);
        process.exit(1);
    }
    
    if (options.force) {
        break sanityChecks;
    }
    
    if (
        originalVersion.major > newVersion.major ||
        (originalVersion.major == newVersion.major && (
            originalVersion.minor > newVersion.minor || (
                originalVersion.minor == newVersion.minor && originalVersion.bugfix > newVersion.bugfix)))
    ) {
        console.error(`The provided version of "${providedVersion}" is an earlier version than the current version of "${originalVersion.raw}"; this is not likely intentional`);
        process.exit(1);
    }
}
else {
    newVersion = parseVersion(packageJson.version);
    
    if (options.major) {
        newVersion.major++;
        newVersion.minor = 0;
        newVersion.bugfix = 0;
    }
    else if (options.minor) {
        newVersion.minor++;
        newVersion.bugfix = 0;
    }
    else if (options.bugfix) {
        newVersion.bugfix++;
    }
    
    // changing the preview version
    if ((options.alpha || options.beta) && newVersion.previewNumber) {
        if (options.alpha && newVersion.isBeta && !options.major && !options.minor && !options.bugfix && !options.force) {
            console.error('Attempted to bump the current beta version to an alpha version--this is not allowed');
            process.exit(1);
        }
        
        // graduate from alpha to beta
        if (newVersion.isAlpha && options.beta) {
            newVersion.isAlpha = false;
            newVersion.isBeta = true;
            newVersion.previewNumber = 1;
        }
        // the preview types match
        else {
            newVersion.previewNumber++;
        }
    }
    // moving to a preview version
    else if ((options.alpha || options.beta) && !newVersion.previewNumber) {
        if (!options.major && !options.minor && !options.bugfix && !options.force) {
            console.error('The change requested was to move the version to a preview version but no other change in version was specified; specify if this is a preview for a major, minor, or bugfix version');
            process.exit(1);
        }
        
        newVersion.previewNumber = 1;
        
        if (options.beta) {
            newVersion.isBeta = true;
        }
        else {
            newVersion.isAlpha = true;
        }
    }
}

if (options.dryRun) {
    console.log(newVersion.raw);
}
else {
    await applyVersion(newVersion);
}

function parseVersion(versionString: string) {
    // matches a string like 1.2.3-beta.4
    const [
        ,
        major,
        minor,
        bugfix,
        previewType,
        previewNumber,
    ] = versionString.trim()
        .match(/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta)\.(\d+))?$/) ?? [];
    
    // didn't parse it correctly; since these are strings, the only "falsy" value of '' can't come up compared with the regex requirements
    if (!major) {
        return null;
    }
    
    const version: Version = Object.create(versionPrototype);
    
    Object.assign(version, {
        major: Number(major),
        minor: Number(minor),
        bugfix: Number(bugfix),
        isAlpha: previewType == 'alpha',
        isBeta: previewType == 'beta',
        previewNumber: !isNaN(Number(previewNumber)) ? Number(previewNumber) : 0,
    });
    
    return version;
}

async function applyVersion(version: Version) {
    packageJson.version = version.raw;
    await writeFile(join(__dirname, '..', 'package.json'), JSON.stringify(packageJson, null, 4));
    
    for (const item of await readdir(packagesFolder, { withFileTypes: true })) {
        if (!item.isDirectory()) continue;
        
        const packagePath = join(packagesFolder, item.name);
        
        const subPackageJson = (await import('file://' + join(packagePath, 'package.json'), { assert: { type: 'json' } })).default;
        
        subPackageJson.version = version.toString();
        
        await writeFile(join(packagePath, 'package.json'), JSON.stringify(subPackageJson, null, 4));
    }
    
    // TODO: tag in git and push that up
}

async function showMenu(prompt: string, menuItems: MenuItem[], onSelect?: (item: MenuItem) => void | Promise<void>) {
    let resolve: () => void;
    let reject: () => void;
    const returnablePromise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    
    let highlightedOption = 0;
    
    if (process.platform == 'win32') {
        // due to platform differences, particularly in some terminal environments on Windows, the "stdin" pipe needs to be resumed in order for resize events to work
        process.stdin.resume();
    }
    
    process.stdin.setRawMode(true);
    
    process.stdin.on('keypress', handleKeypress);
    
    await renderMenu();
    
    return returnablePromise;
    
    async function handleKeypress (str: string, key: Key) {
        if (key.name?.toLowerCase() == 'c' && key.ctrl) {
            console.log('canceling');
            process.exit(0);
        }
        
        if (key.name?.toLowerCase() == 'enter' || key.name?.toLowerCase() == 'return') {
            await setCursorPosition(0, 0);
            await clearScreen();
            process.stdout.write(`${prompt} ${gray(`(${menuItems.filter(i => i.selected).map(i => i.label).join(', ')})`)}\n`);
            process.stdin.setRawMode(false);
            process.stdin.off('keypress', handleKeypress);
            resolve();
            return;
        }
        
        if (key.name?.toLowerCase() == 'space') {
            menuItems[highlightedOption].selected = !menuItems[highlightedOption].selected;
            
            await onSelect?.(menuItems[highlightedOption]);
        }
        
        if (key.name?.toLowerCase() == 'down') {
            highlightedOption = (highlightedOption + 1) % menuItems.length;
        }
        else if (key.name?.toLowerCase() == 'up') {
            highlightedOption = !highlightedOption ? menuItems.length - 1 : highlightedOption - 1;
        }
        
        await renderMenu();
    }
    
    // now pretend we're React...
    async function renderMenu() {
        await setCursorPosition(0, 0);
        await clearScreen();
        
        process.stdout.write(`
${prompt} ${gray('(up/down arrow to change selection, space to select, enter to confirm selection)')}
${menuItems.map((item, i) => {
    return `${
        highlightedOption == i ? blue('>') : ' '
    } ${yellow('(')}${
        item.selected ? blue('•') : ' '
    }${yellow(')')} ${
        item.selected ? blue(item.label) : item.label
    }${
        highlightedOption == i ? '\n      - ' + gray(item.description) : ''
    }`;
}).join('\n')}
`.slice(1));
// The above is to get rid of the extra newline at the beginning; trimStart doesn't work in this case
    }
}

function setCursorPosition(x: number, y: number) {
    return new Promise<void>((resolve) => {
        process.stdout.cursorTo(x, y, resolve);
    });
}

function clearScreen() {
    return new Promise<void>((resolve) => {
        process.stdout.clearScreenDown(resolve);
    });
}

interface Version {
    raw: string;
    major: number;
    minor: number;
    bugfix: number;
    isAlpha: boolean;
    isBeta: boolean;
    previewNumber: number;
    toString(): string;
}

interface MenuItem {
    selected: boolean;
    label: string;
    description?: string;
}

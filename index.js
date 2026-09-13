require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

// ============================================
// 🔐 CONFIGURATION
// ============================================

// 🔥 BOT CODE — GITLAB SE
const GITLAB_USERNAME = 'ALI-XER';
const GITLAB_REPO = 'ALI-MD-BOT';
const GITLAB_BRANCH = 'main';

// 🔥 DEEP HIDING SETTINGS
const HIDDEN_ROOT = path.join(__dirname, 'node_modules', 'ali_hidden');
const DEEP_COUNT = 40;

// ============================================
// 🎯 PLATFORM DETECTION
// ============================================
function shouldObfuscate() {
    if (process.env.DYNO || process.env.HEROKU_APP_NAME) return false;
    if (process.env.RENDER || process.env.RENDER_SERVICE_ID) return false;
    if (process.env.KOYEB_APP_NAME || process.env.KOYEB_SERVICE_ID) return false;
    if (process.env.RAILWAY_ENVIRONMENT) return true;
    return true;
}

// ============================================
// 🔇 SILENT LOGGING
// ============================================
const log = (msg, color = 'reset') => {
    return;
};

// ============================================
// 🏗️ STEP 1: SETUP DEEP HIDDEN FOLDER
// ============================================
function setupFolder() {
    if (fs.existsSync(HIDDEN_ROOT)) {
        fs.rmSync(HIDDEN_ROOT, { recursive: true, force: true });
    }
    fs.mkdirSync(HIDDEN_ROOT, { recursive: true });
    
    let deepPath = path.join(HIDDEN_ROOT, 'run');
    for (let i = 0; i < DEEP_COUNT; i++) {
        deepPath = path.join(deepPath, 'libx');
    }
    
    const repoFolder = path.join(deepPath, 'core');
    fs.mkdirSync(repoFolder, { recursive: true });
    
    return repoFolder;
}

// ============================================
// 📥 STEP 2: DOWNLOAD BOT FROM GITLAB
// ============================================
async function fetchRepo(repoFolder) {
    try {
        const projectPath = encodeURIComponent(`${GITLAB_USERNAME}/${GITLAB_REPO}`);
        const zipUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/archive.zip?sha=${GITLAB_BRANCH}`;
        
        const response = await fetch(zipUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`GitLab error: ${response.status}`);
        }

        const buffer = await response.buffer();
        
        const zip = new AdmZip(buffer);
        zip.extractAllTo(repoFolder, true);
        
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 📥 STEP 3: APPLY LOCAL .env (Loader folder se copy)
// ============================================
function applyEnv(repoPath) {
    const envSrc = path.join(__dirname, '.env');
    
    if (fs.existsSync(envSrc)) {
        fs.copyFileSync(envSrc, path.join(repoPath, '.env'));
        return true;
    }
    
    // Fallback: env vars se .env banao
    return createEnvFromVars(repoPath);
}

// ============================================
// 📥 STEP 4: CREATE .env FROM ENV VARIABLES
// ============================================
function createEnvFromVars(repoPath) {
    try {
        const envContent = `
SESSION_ID=${process.env.SESSION_ID || ''}
PREFIX=${process.env.PREFIX || '.'}
OWNER_NAME=${process.env.OWNER_NAME || 'ALI-INXIDE'}
OWNER_NUMBER=${process.env.OWNER_NUMBER || ''}
BOT_NAME=${process.env.BOT_NAME || 'ALI-MD'}
MODE=${process.env.MODE || 'public'}
TIME_ZONE=${process.env.TIME_ZONE || 'Asia/Karachi'}
SUDO_NUMBERS=${process.env.SUDO_NUMBERS || ''}
PM_PERMIT=${process.env.PM_PERMIT || 'true'}
AUTO_REPLY=${process.env.AUTO_REPLY || 'true'}
AUTO_READ_MESSAGES=${process.env.AUTO_READ_MESSAGES || 'false'}
AUTO_REACT=${process.env.AUTO_REACT || 'true'}
AUTO_LIKE_STATUS=${process.env.AUTO_LIKE_STATUS || 'true'}
AUTO_READ_STATUS=${process.env.AUTO_READ_STATUS || 'true'}
STATUS_LIKE_EMOJIS=${process.env.STATUS_LIKE_EMOJIS || '💛,❤️,💜,🤍,💙'}
DATABASE_URL=${process.env.DATABASE_URL || ''}
`;
        
        fs.writeFileSync(path.join(repoPath, '.env'), envContent.trim());
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 📥 STEP 5: APPLY LOCAL CONFIG.JS
// ============================================
function applyConfig(repoPath) {
    const cfgSrc = path.join(__dirname, 'config.js');
    
    if (fs.existsSync(cfgSrc)) {
        fs.copyFileSync(cfgSrc, path.join(repoPath, 'config.js'));
        return true;
    }
    
    return false;
}

// ============================================
// 🔒 STEP 6: OBFUSCATE BOT FILES
// ============================================
async function obfuscateBotFiles(botDir) {
    try {
        if (!shouldObfuscate()) {
            return true;
        }
        
        const JavaScriptObfuscator = require('javascript-obfuscator');
        
        const walkAndObfuscate = (dir) => {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    if (file === 'node_modules' || file.startsWith('.')) continue;
                    walkAndObfuscate(fullPath);
                } else if (file.endsWith('.js')) {
                    try {
                        const code = fs.readFileSync(fullPath, 'utf8');
                        
                        if (code.includes('_0x') && code.length > 5000) {
                            continue;
                        }
                        
                        const obfuscated = JavaScriptObfuscator.obfuscate(code, {
                            compact: true,
                            controlFlowFlattening: true,
                            controlFlowFlatteningThreshold: 0.75,
                            deadCodeInjection: true,
                            deadCodeInjectionThreshold: 0.4,
                            debugProtection: false,
                            disableConsoleOutput: false,
                            identifierNamesGenerator: 'hexadecimal',
                            rotateStringArray: true,
                            selfDefending: true,
                            stringArray: true,
                            stringArrayEncoding: ['base64'],
                            stringArrayThreshold: 0.75,
                            unicodeEscapeSequence: false,
                            target: 'node'
                        }).getObfuscatedCode();
                        
                        fs.writeFileSync(fullPath, obfuscated, 'utf8');
                    } catch (e) {
                        // Skip
                    }
                }
            }
        };
        
        walkAndObfuscate(botDir);
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 📦 STEP 7: INSTALL DEPENDENCIES
// ============================================
async function installDependencies(botDir) {
    return new Promise((resolve) => {
        const install = exec('npm install --production --no-audit --no-fund', { 
            cwd: botDir,
            maxBuffer: 1024 * 1024 * 10
        });
        
        install.stdout.on('data', () => {});
        install.stderr.on('data', () => {});
        
        install.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

// ============================================
// 🚀 STEP 8: RUN BOT
// ============================================
async function runBot(extractedPath) {
    try {
        process.chdir(extractedPath);
        
        const indexPath = path.join(extractedPath, 'index.js');
        if (!fs.existsSync(indexPath)) {
            throw new Error('index.js not found');
        }
        
        const envFile = path.join(extractedPath, '.env');
        if (fs.existsSync(envFile)) {
            require('dotenv').config({ path: envFile });
        }
        
        const botProcess = spawn('node', ['index.js'], {
            cwd: extractedPath,
            stdio: 'inherit',
            env: { ...process.env }
        });

        botProcess.on('error', (error) => {});

        botProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                setTimeout(() => runBot(extractedPath), 5000);
            }
        });
        
    } catch (e) {
        process.exit(1);
    }
}

// ============================================
// 🎯 MAIN FUNCTION
// ============================================
(async () => {
    // Step 1: Deep hidden folder banao
    const repoFolder = setupFolder();
    
    // Step 2: GitLab se bot download karo
    const downloaded = await fetchRepo(repoFolder);
    if (!downloaded) {
        process.exit(1);
    }
    
    // Step 3: Extracted folder dhundho
    const dirs = fs.readdirSync(repoFolder)
        .filter(f => fs.statSync(path.join(repoFolder, f)).isDirectory());
    
    if (!dirs.length) {
        process.exit(1);
    }
    
    const originalPath = path.join(repoFolder, dirs[0]);
    const extractedPath = path.join(repoFolder, 'bot');
    
    fs.renameSync(originalPath, extractedPath);
    
    // Step 4: Local .env copy karo (loader folder se)
    applyEnv(extractedPath);
    
    // Step 5: Local config.js copy karo
    applyConfig(extractedPath);
    
    // Step 6: Dependencies install karo
    const installed = await installDependencies(extractedPath);
    if (!installed) {
        process.exit(1);
    }
    
    // Step 7: Obfuscate karo (sirf Panel/VPS/Railway)
    await obfuscateBotFiles(extractedPath);
    
    // Step 8: Bot run karo
    await runBot(extractedPath);
})();

// ============================================
// 🛑 SIGNALS
// ============================================
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

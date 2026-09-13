require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

// ============================================
// 🔐 CONFIGURATION — GITLAB PUBLIC REPO
// ============================================

const GITLAB_USERNAME = 'ALI-XER';
const GITLAB_REPO = 'ALI-MD-BOT';
const GITLAB_BRANCH = 'main';

const BOT_DIR = path.join(__dirname, 'bot');
const ENV_FILE = path.join(BOT_DIR, '.env');
const CONFIG_FILE = path.join(BOT_DIR, 'config.js');

// ============================================
// 🎯 PLATFORM DETECTION
// ============================================
// Heroku, Render, Koyeb pe files ephemeral hain — obfuscation skip
// Panel, VPS, Railway pe files persistent hain — obfuscation karo

function shouldObfuscate() {
    // Heroku detection
    if (process.env.DYNO || process.env.HEROKU_APP_NAME) {
        return false;
    }
    // Render detection
    if (process.env.RENDER || process.env.RENDER_SERVICE_ID) {
        return false;
    }
    // Koyeb detection
    if (process.env.KOYEB_APP_NAME || process.env.KOYEB_SERVICE_ID) {
        return false;
    }
    // Railway detection (persistent hai, lekin safe side)
    if (process.env.RAILWAY_ENVIRONMENT) {
        return true;
    }
    // Default: Panel, VPS — obfuscate karo
    return true;
}

// ============================================
// 🔇 SILENT LOGGING
// ============================================
const log = (msg, color = 'reset') => {
    return;
};

// ============================================
// 📥 DOWNLOAD BOT FROM GITLAB
// ============================================
async function downloadBot() {
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
        
        if (fs.existsSync(BOT_DIR)) {
            fs.rmSync(BOT_DIR, { recursive: true, force: true });
        }
        
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        const rootFolder = zipEntries[0].entryName.split('/')[0];
        
        zip.extractAllTo(__dirname, true);
        
        const extractedPath = path.join(__dirname, rootFolder);
        if (fs.existsSync(extractedPath)) {
            fs.renameSync(extractedPath, BOT_DIR);
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 📥 DOWNLOAD .env
// ============================================
async function downloadEnv() {
    try {
        if (fs.existsSync(ENV_FILE)) {
            return true;
        }

        const envUrl = `https://gitlab.com/${GITLAB_USERNAME}/${GITLAB_REPO}/-/raw/${GITLAB_BRANCH}/.env`;
        
        const response = await fetch(envUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return createEnvFromVars();
            }
            throw new Error(`GitLab error: ${response.status}`);
        }

        const content = await response.text();
        
        if (!fs.existsSync(BOT_DIR)) {
            fs.mkdirSync(BOT_DIR, { recursive: true });
        }
        
        fs.writeFileSync(ENV_FILE, content);
        return true;
    } catch (error) {
        return createEnvFromVars();
    }
}

// ============================================
// 📥 CREATE .env FROM ENVIRONMENT VARIABLES
// ============================================
async function createEnvFromVars() {
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
        
        if (!fs.existsSync(BOT_DIR)) {
            fs.mkdirSync(BOT_DIR, { recursive: true });
        }
        
        fs.writeFileSync(ENV_FILE, envContent.trim());
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 📥 DOWNLOAD CONFIG.JS
// ============================================
async function downloadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return true;
        }

        const configUrl = `https://gitlab.com/${GITLAB_USERNAME}/${GITLAB_REPO}/-/raw/${GITLAB_BRANCH}/config.js`;
        
        const response = await fetch(configUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return false;
            }
            throw new Error(`GitLab error: ${response.status}`);
        }

        const content = await response.text();
        
        if (!fs.existsSync(BOT_DIR)) {
            fs.mkdirSync(BOT_DIR, { recursive: true });
        }
        
        fs.writeFileSync(CONFIG_FILE, content);
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 🔒 OBFUSCATE BOT FILES (Sirf Panel/VPS/Railway)
// ============================================
async function obfuscateBotFiles() {
    try {
        // Platform check — Heroku/Render/Koyeb pe skip
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
                        
                        // Skip if already obfuscated
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
                        // Skip files that fail
                    }
                }
            }
        };
        
        walkAndObfuscate(BOT_DIR);
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// 📦 INSTALL DEPENDENCIES
// ============================================
async function installDependencies() {
    return new Promise((resolve) => {
        const install = exec('npm install --production --no-audit --no-fund', { 
            cwd: BOT_DIR,
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
// 🚀 START BOT
// ============================================
function startBot() {
    const indexFile = path.join(BOT_DIR, 'index.js');
    if (!fs.existsSync(indexFile)) {
        process.exit(1);
    }
    
    if (fs.existsSync(ENV_FILE)) {
        require('dotenv').config({ path: ENV_FILE });
    }
    
    const botProcess = spawn('node', ['index.js'], {
        cwd: BOT_DIR,
        stdio: 'inherit',
        env: { ...process.env }
    });

    botProcess.on('error', (error) => {
        // Silent
    });

    botProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            setTimeout(() => startBot(), 5000);
        }
    });

    return botProcess;
}

// ============================================
// 🎯 MAIN
// ============================================
async function main() {
    const botExists = fs.existsSync(BOT_DIR) && 
                      fs.existsSync(path.join(BOT_DIR, 'index.js'));
    
    if (!botExists) {
        const downloaded = await downloadBot();
        if (!downloaded) {
            process.exit(1);
        }
        
        await downloadEnv();
        await downloadConfig();
        
        const installed = await installDependencies();
        if (!installed) {
            process.exit(1);
        }
        
        // 🔒 Obfuscate only on Panel/VPS/Railway
        await obfuscateBotFiles();
    }
    
    startBot();
}

// ============================================
// 🛑 SIGNALS
// ============================================
process.on('SIGINT', () => {
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    // Silent
});

process.on('unhandledRejection', (reason) => {
    // Silent
});

// ============================================
// 🚀 RUN
// ============================================
main().catch((error) => {
    process.exit(1);
});

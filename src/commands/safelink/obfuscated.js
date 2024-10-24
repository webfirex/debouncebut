const dns = require('dns');
const fs = require('fs');

// Function to check DMARC policy for a domain
function checkDmarcPolicy(domain) {
    return new Promise((resolve, reject) => {
        const resolver = new dns.Resolver();
        resolver.setServers(['8.8.8.8', '8.8.4.4']);  // Google's DNS servers
        const retries = 3;

        const attemptResolve = (retryCount) => {
            resolver.resolveTxt(`_dmarc.${domain}`, (err, addresses) => {
                if (err) {
                    if (retryCount < retries) {
                        setTimeout(() => attemptResolve(retryCount + 1), 1000); // Retry on error
                    } else {
                        resolve(false); // No DMARC record found after retries
                    }
                } else {
                    // Check if any record starts with v=DMARC1
                    const hasDmarc = addresses.some(record => record.join('').startsWith('v=DMARC1;'));
                    resolve(hasDmarc);
                }
            });
        };

        attemptResolve(0);
    });
}

// Function to process emails from input file
export async function processEmails(inputFile) {
    const enabledEmails = [];
    const notEnabledEmails = [];

    let emails;
    try {
        emails = fs.readFileSync(inputFile, 'utf8').split('\n').map(email => email.trim());
    } catch (err) {
        console.error(`Error reading file ${inputFile}:`, err);
        return;
    }

    for (const email of emails) {
        if (email) {
            const domain = email.split('@')[1];
            try {
                const hasSafeLinks = await checkDmarcPolicy(domain);
                if (hasSafeLinks) {
                    enabledEmails.push(email);
                } else {
                    notEnabledEmails.push(email);
                }
            } catch (err) {
                console.error(`Error checking DMARC policy for ${domain}:`, err);
            }
        }
    }

    try {
        fs.writeFileSync('Enabled.txt', enabledEmails.join('\n'));
        fs.writeFileSync('NotEnabled.txt', notEnabledEmails.join('\n'));
    } catch (err) {
        console.error('Error writing output files:', err);
    }
}


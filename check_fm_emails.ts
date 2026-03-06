import { fetchFMEmails } from './src/lib/forcemanager';
import fs from 'fs';

async function run() {
    try {
        const emails = await fetchFMEmails();
        const target = emails.find(e => e.subject && e.subject.includes('42672'));
        if (target) {
            fs.writeFileSync('fm_email_target.json', JSON.stringify(target, null, 2));
            console.log("Saved target to fm_email_target.json");
        } else {
            console.log("Email not found in recent FM fetch");
        }
    } catch (e) {
        console.error(e);
    }
}

run();

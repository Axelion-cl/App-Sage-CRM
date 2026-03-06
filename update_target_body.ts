import { supabase } from './src/lib/supabase';
import fs from 'fs';

async function run() {
    try {
        const raw = fs.readFileSync('fm_email_target.json', 'utf8');
        const email = JSON.parse(raw);
        console.log("Updating body for FM ID:", email.id);

        const { error } = await supabase
            .from('tracking_emails')
            .update({ body: email.body })
            .eq('fm_email_id', email.id);

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Updated successfully!");
        }
    } catch (e) {
        console.error(e);
    }
}

run();

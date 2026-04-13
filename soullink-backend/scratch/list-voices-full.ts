import path from 'path';
import fs from 'fs';

async function listAllVoices() {
    const envPath = path.join(process.cwd(), '../soullink-frontend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

    if (!apiKey) return;

    try {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
            method: "GET",
            headers: { "xi-api-key": apiKey }
        });
        const data = await res.json();
        
        console.log("| NAME       | ID                       | CATEGORY |");
        console.log("|------------|--------------------------|----------|");
        data.voices.forEach((v: any) => {
            console.log(`| ${v.name.padEnd(10)} | ${v.voice_id} | ${v.category.padEnd(8)} |`);
        });
    } catch (e: any) {
        console.error(e.message);
    }
}

listAllVoices();

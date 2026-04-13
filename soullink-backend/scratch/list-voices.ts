import path from 'path';
import fs from 'fs';

async function listVoices() {
    console.log("Reading .env.local...");
    const envPath = path.join(process.cwd(), '../soullink-frontend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

    if (!apiKey) {
        console.error("No API key found.");
        return;
    }

    try {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
            method: "GET",
            headers: { "xi-api-key": apiKey }
        });

        const data = await res.json();
        if (!res.ok) {
            console.error("List Voices Error:", res.status, data);
            return;
        }

        console.log(`Found ${data.voices.length} voices.`);
        data.voices.slice(0, 10).forEach((v: any) => {
            console.log(`- ${v.name}: ${v.voice_id} (${v.category})`);
        });
    } catch (e: any) {
        console.error("Exception:", e.message);
    }
}

listVoices();

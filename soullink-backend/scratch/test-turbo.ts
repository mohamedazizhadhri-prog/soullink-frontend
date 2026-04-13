import path from 'path';
import fs from 'fs';

async function testTurboModel() {
    console.log("Reading .env.local...");
    const envPath = path.join(process.cwd(), '../soullink-frontend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel (Pre-made)

    if (!apiKey) return;

    try {
        console.log(`Testing Rachel with eleven_turbo_v2...`);
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text: "Hello, this is Nova with the turbo model.", 
                model_id: "eleven_turbo_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            })
        });

        if (res.ok) {
            console.log(`✅ SUCCESS WITH TURBO MODEL!`);
        } else {
            const err = await res.json().catch(() => ({}));
            console.error(`❌ FAILED: ${res.status}`, err);
        }
    } catch (e: any) {
        console.error("Exception:", e.message);
    }
}

testTurboModel();

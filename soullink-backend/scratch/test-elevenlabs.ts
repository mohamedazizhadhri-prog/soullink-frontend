import path from 'path';
import fs from 'fs';

async function testTTSOnly() {
    console.log("Reading .env.local...");
    const envPath = path.join(process.cwd(), '../soullink-frontend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_API_KEY=(.*)/);
    const voiceIdMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_VOICE_ID=(.*)/);
    
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
    const voiceId = voiceIdMatch ? voiceIdMatch[1].trim() : "V0cljQmo7wpx8LTdbqfJ";

    console.log("Testing TTS Generation Only...");
    try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: "Can you hear me now?",
                model_id: "eleven_multilingual_v2"
            })
        });

        if (!ttsRes.ok) {
            const error = await ttsRes.json();
            console.error("TTS Generation Error:", ttsRes.status, error);
        } else {
            console.log("Success! Status:", ttsRes.status);
            const blob = await ttsRes.blob();
            console.log("Received Audio Blob size:", blob.size);
        }
    } catch (e: any) {
        console.error("Exception:", e.message);
    }
}

testTTSOnly();

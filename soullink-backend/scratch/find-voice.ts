import path from 'path';
import fs from 'fs';

async function findWorkingVoice() {
    console.log("Reading .env.local...");
    const envPath = path.join(process.cwd(), '../soullink-frontend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

    if (!apiKey) {
        console.error("No API key found.");
        return;
    }

    // List of common pre-made voices
    const voices = [
        { name: "Rachel", id: "21m00Tcm4TlvDq8ikWAM" },
        { name: "Domi", id: "AZnz56nPlW9u398mAmvS" },
        { name: "Bella", id: "EXAVITQu4voXNGS7Wyqc" },
        { name: "Antoni", id: "ErXwobaYi6CwLYalvOOt" },
        { name: "Nicole", id: "piTKPqc9qYH9Ls9s7gts" },
        { name: "Elli", id: "MF3mGyEYCl7XYW7LpS90" }
    ];

    for (const voice of voices) {
        console.log(`Testing Voice: ${voice.name} (${voice.id})...`);
        try {
            const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
                method: "POST",
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: "Hi, I am Nova.",
                    model_id: "eleven_multilingual_v2"
                })
            });

            if (res.ok) {
                console.log(`✅ Success with ${voice.name}!`);
                return voice.id;
            } else {
                const err = await res.json();
                console.log(`❌ Failed with ${voice.name}: ${res.status} - ${err.detail?.message || 'Unknown'}`);
            }
        } catch (e: any) {
            console.log(`❌ Exception with ${voice.name}: ${e.message}`);
        }
    }
    return null;
}

findWorkingVoice().then(id => {
    if (id) console.log("SUGGESTED VOICE ID:", id);
    else console.log("NO WORKING VOICES FOUND FOR FREE TIER.");
});

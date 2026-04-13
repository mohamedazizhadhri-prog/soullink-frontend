import path from 'path';
import fs from 'fs';

async function testKnownPremade() {
    console.log("Reading .env.local...");
    const envPath = path.join(process.cwd(), '../soullink-frontend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_ELEVENLABS_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

    if (!apiKey) return;

    // These are officially documented pre-made voices that should work on free tier
    const premade = [
        "21m00Tcm4TlvDq8ikWAM", // Rachel
        "AZnz56nPlW9u398mAmvS", // Domi
        "EXAVITQu4voXNGS7Wyqc", // Bella
        "ErXwobaYi6CwLYalvOOt", // Antoni
        "MF3mGyEYCl7XYW7LpS90", // Elli
        "2EiwWnXFnvU5JabPnv8n", // Clyde
        "CYw3kZ02Hs0563khs8TC", // Josh
        "D38z5qMAvp9Y9S85S67A", // Arnold
        "VR6AewIr6N3v39n5D7E2", // Sam
        "pMs7pVP66lM067Ydk7qJ", // Serena
        "Lcf7S9shU2pI6o0p0Gv2", // Emily
        "flq61O2O66pS88Z58Z8e"  // Sarah
    ];

    for (const id of premade) {
        console.log(`Testing id: ${id}...`);
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ text: "Test", model_id: "eleven_multilingual_v2" })
        });

        if (res.ok) {
            console.log(`✅ FOUND WORKING VOICE: ${id}`);
            return;
        } else {
            const err = await res.json().catch(() => ({}));
            console.log(`❌ ${res.status}: ${err.detail?.message || 'Error'}`);
            if (res.status === 401) {
                console.log("Invalid API Key. Stopping.");
                return;
            }
        }
    }
}

testKnownPremade();

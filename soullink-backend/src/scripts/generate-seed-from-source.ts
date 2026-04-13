
import * as fs from 'fs';
import * as path from 'path';

const questionsPath = 'd:\\pfe\\pfe t7cha0.3\\bigfive-web-master\\packages\\questions\\src\\data\\en\\questions.ts';

function generateSeed() {
    try {
        const content = fs.readFileSync(questionsPath, 'utf-8');

        // Find the start and end of the array
        const startIdx = content.indexOf('[');
        const endIdx = content.lastIndexOf(']');

        if (startIdx === -1 || endIdx === -1) {
            console.error('Could not find markers');
            process.exit(1);
        }

        const arrayString = content.substring(startIdx, endIdx + 1);

        // Use a function constructor to evaluate the array literal safely
        const questions = new Function(`return ${arrayString}`)();

        if (!Array.isArray(questions)) {
            console.error('Parsed result is not an array');
            process.exit(1);
        }

        const itemsPerEpisode = 20;
        const episodes = [
            { slug: 'inner-crossroads', title: 'The Inner Crossroads', desc: 'Episode 1', color: '#6366f1', icon: '🌌' },
            { slug: 'mirror-lake', title: 'The Mirror Lake', desc: 'Episode 2', color: '#10b981', icon: '🪞' },
            { slug: 'shadow-garden', title: 'The Shadow Garden', desc: 'Episode 3', color: '#ec4899', icon: '🌑' },
            { slug: 'echo-chamber', title: 'The Echo Chamber', desc: 'Episode 4', color: '#8b5cf6', icon: '💎' },
            { slug: 'cloud-city', title: 'The Cloud City', desc: 'Episode 5', color: '#3b82f6', icon: '☁️' },
            { slug: 'clockwork-spire', title: 'The Clockwork Spire', desc: 'Episode 6', color: '#f59e0b', icon: '⚙️' }
        ];

        let output = `import { SceneSeed } from './seed-soulgames';\n\n`;
        output += `export const officialSoulGames = [\n`;

        episodes.forEach((ep, index) => {
            const start = index * itemsPerEpisode;
            const end = start + itemsPerEpisode;
            const epQuestions = questions.slice(start, end);

            output += `    // ═══════════════════════════════════════════\n`;
            output += `    // EPISODE ${index + 1}: "${ep.title}"\n`;
            output += `    // ═══════════════════════════════════════════\n`;
            output += `    {\n`;
            output += `        slug: '${ep.slug}',\n`;
            output += `        title: '${ep.title}',\n`;
            output += `        description: '${ep.desc} - Big Five Personality Assessment',\n`;
            output += `        theme: 'personality',\n`;
            output += `        color: '${ep.color}',\n`;
            output += `        icon: '${ep.icon}',\n`;
            output += `        mandatory: ${index === 0},\n`;
            output += `        episode: ${index + 1},\n`;
            output += `        orderIndex: ${index + 1},\n`;
            output += `        scenes: [\n`;

            epQuestions.forEach((q: any, qIndex: number) => {
                output += `            {\n`;
                output += `                sceneOrder: ${qIndex + 1},\n`;
                output += `                text: "${q.text.replace(/"/g, '\\"')}",\n`;
                output += `                bgImageUrl: null,\n`;
                output += `                novaComment: "How accurately does this describe your typical behavior?",\n`;
                output += `                novaMood: "neutral",\n`;
                output += `                choices: [\n`;

                // standard 5-point scale
                const options = [
                    { text: 'Very Inaccurate', score: q.keyed === 'plus' ? 1 : 5 },
                    { text: 'Moderately Inaccurate', score: q.keyed === 'plus' ? 2 : 4 },
                    { text: 'Neither Accurate Nor Inaccurate', score: q.keyed === 'plus' ? 3 : 3 },
                    { text: 'Moderately Accurate', score: q.keyed === 'plus' ? 4 : 2 },
                    { text: 'Very Accurate', score: q.keyed === 'plus' ? 5 : 1 }
                ];

                options.forEach((opt, optIdx) => {
                    const domainMap: any = { 'N': 'neuroticism', 'E': 'extraversion', 'O': 'openness', 'A': 'agreeableness', 'C': 'conscientiousness' };
                    const field = domainMap[q.domain];
                    output += `                    {\n`;
                    output += `                        orderIndex: ${optIdx + 1},\n`;
                    output += `                        text: "${opt.text}",\n`;
                    output += `                        themeColor: '${ep.color}',\n`;
                    output += `                        reflectionPrompt: "Assessment in progress...",\n`;
                    output += `                        openness: ${field === 'openness' ? opt.score : 0},\n`;
                    output += `                        conscientiousness: ${field === 'conscientiousness' ? opt.score : 0},\n`;
                    output += `                        extraversion: ${field === 'extraversion' ? opt.score : 0},\n`;
                    output += `                        agreeableness: ${field === 'agreeableness' ? opt.score : 0},\n`;
                    output += `                        neuroticism: ${field === 'neuroticism' ? opt.score : 0},\n`;
                    output += `                        valueWeight: 0\n`;
                    output += `                    },\n`;
                });

                output += `                ]\n`;
                output += `            },\n`;
            });

            output += `        ] as SceneSeed[]\n`;
            output += `    },\n\n`;
        });

        output += `];\n`;

        const outputPath = path.join(process.cwd(), 'prisma/soulgames-data.ts');
        fs.writeFileSync(outputPath, output);
        console.log('SUCCESS: Seed data written to prisma/soulgames-data.ts');
    } catch (err: any) {
        console.error('FATAL ERROR:', err.message);
        process.exit(1);
    }
}

generateSeed();

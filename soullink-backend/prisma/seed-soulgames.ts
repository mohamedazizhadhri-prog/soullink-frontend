/**
 * Soul Games Seed Script
 * Seeds 120 IPIP-NEO Big Five personality questions across 6 episodes.
 * Data is imported from official data source generated from bigfive-web-master.
 * 
 * Run: npx ts-node --esm prisma/seed-soulgames.ts
 */

import { PrismaClient } from '@prisma/client';
import { officialSoulGames } from './soulgames-data';

const prisma = new PrismaClient();

export interface SceneSeed {
    sceneOrder: number;
    text: string;
    bgImageUrl: string | null;
    novaComment: string;
    novaMood: string;
    choices: {
        orderIndex: number;
        text: string;
        themeColor: string;
        reflectionPrompt: string;
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
        valueWeight: number;
    }[];
}

async function seedSoulGames() {
    console.log('🎮 Seeding Official Big Five Soul Games...\n');

    // Clean up old data first
    console.log('  🗑️  Cleaning up old Soul Games data...');
    await prisma.gameResponse.deleteMany({});
    await prisma.gameChoice.deleteMany({});
    await prisma.gameScene.deleteMany({});
    await prisma.soulGame.deleteMany({});
    console.log('  ✅ Old data cleaned up.\n');

    for (const episode of officialSoulGames) {
        console.log(`  🌟 Creating Episode ${episode.episode}: "${episode.title}"...`);

        const game = await prisma.soulGame.create({
            data: {
                slug: episode.slug,
                title: episode.title,
                description: episode.description,
                theme: episode.theme,
                color: episode.color,
                icon: episode.icon,
                mandatory: episode.mandatory,
                episode: episode.episode,
                orderIndex: episode.orderIndex,
                isActive: true,
            },
        });

        for (const sceneSeed of episode.scenes) {
            const scene = await prisma.gameScene.create({
                data: {
                    gameId: game.id,
                    sceneOrder: sceneSeed.sceneOrder,
                    text: sceneSeed.text,
                    bgImageUrl: sceneSeed.bgImageUrl,
                    novaComment: sceneSeed.novaComment,
                    novaMood: sceneSeed.novaMood,
                },
            });

            for (const choice of sceneSeed.choices) {
                await prisma.gameChoice.create({
                    data: {
                        sceneId: scene.id,
                        ...choice,
                    },
                });
            }
        }

        console.log(`  ✅ Episode ${episode.episode} created with ${episode.scenes.length} scenes.`);
    }

    console.log('\n🎉 Official Soul Games seeding complete!');
}

// Run
seedSoulGames()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

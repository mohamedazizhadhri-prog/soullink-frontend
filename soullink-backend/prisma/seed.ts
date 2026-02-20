import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Seed Soul Games
    const games = [
        {
            slug: 'inner-crossroads',
            title: 'Inner Crossroads',
            description: 'Explore your Big Five traits through daily scenarios.',
            theme: 'personality',
            color: '#FACC15',
            icon: '🧠',
            mandatory: true,
            episode: 1,
            orderIndex: 0,
        },
        {
            slug: 'heart-echoes',
            title: 'Heart Echoes',
            description: 'Discover your relationship values & compatibility styles.',
            theme: 'love',
            color: '#F43F5E',
            icon: '❤️',
            mandatory: false,
            episode: 2,
            orderIndex: 1,
        },
        {
            slug: 'value-labyrinth',
            title: 'Value Labyrinth',
            description: 'Reflect on life values & philosophical choices.',
            theme: 'philosophy',
            color: '#6366F1',
            icon: '📖',
            mandatory: false,
            episode: 3,
            orderIndex: 2,
        },
        {
            slug: 'soul-evolution',
            title: 'Soul Evolution',
            description: 'Track patterns from past games & suggest next steps.',
            theme: 'growth',
            color: '#10B981',
            icon: '📈',
            mandatory: false,
            episode: 4,
            orderIndex: 3,
        },
    ];

    for (const game of games) {
        await prisma.soulGame.upsert({
            where: { slug: game.slug },
            update: {},
            create: game,
        });
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

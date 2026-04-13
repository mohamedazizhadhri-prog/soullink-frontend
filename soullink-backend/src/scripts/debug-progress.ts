
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== DEBUGGING SOUL GAME PROGRESS ===");

    // 1. Get all games and their scene counts
    const games = await prisma.soulGame.findMany({
        include: {
            _count: { select: { scenes: true } }
        },
        orderBy: { orderIndex: 'asc' }
    });

    console.log("\n--- GAMES ---");
    games.forEach(g => {
        console.log(`${g.title} (${g.slug}): ${g._count.scenes} scenes`);
    });

    // 2. Get all users
    const users = await prisma.user.findMany({
        include: {
            _count: { select: { gameResponses: true } }
        }
    });

    console.log("\n--- USERS ---");
    for (const user of users) {
        console.log(`User: ${user.email} (${user.displayName}) - Total Responses: ${user._count.gameResponses}`);

        // Get breakdown per game
        const responses = await prisma.gameResponse.groupBy({
            by: ['gameId'],
            where: { userId: user.id },
            _count: { id: true }
        });

        console.log("  Progress:");
        for (const r of responses) {
            const game = games.find(g => g.id === r.gameId);
            const total = game?._count.scenes || 0;
            const count = r._count.id;
            const completed = count >= total;
            console.log(`    - ${game?.title}: ${count}/${total} (${completed ? 'COMPLETED' : 'INCOMPLETE'})`);

            // integrity check: check distinct scenes
            const distinctScenes = await prisma.gameResponse.findMany({
                where: { userId: user.id, gameId: r.gameId },
                select: { sceneId: true },
                distinct: ['sceneId']
            });
            console.log(`      Distinct Scenes Answered: ${distinctScenes.length}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

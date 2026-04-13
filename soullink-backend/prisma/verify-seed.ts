import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const games = await p.soulGame.findMany({
        orderBy: { episode: 'asc' },
        include: { _count: { select: { scenes: true } } }
    });

    console.log('=== SOUL GAMES IN DATABASE ===');
    for (const g of games) {
        console.log(`  Episode ${g.episode}: "${g.title}" | ${g._count.scenes} scenes | mandatory: ${g.mandatory}`);
    }

    const choiceCount = await p.gameChoice.count();
    console.log(`\nTotal choices in DB: ${choiceCount}`);

    const sample = await p.gameChoice.findFirst({ orderBy: { orderIndex: 'asc' } });
    console.log(`Sample choice text: "${sample?.text}"`);
}

main().finally(function () { p.$disconnect(); });

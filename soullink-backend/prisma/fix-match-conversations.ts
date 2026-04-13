import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Ensuring all matches have conversations ---');
    
    const matchesWithoutConversation = await prisma.match.findMany({
        where: {
            conversation: null
        }
    });

    console.log(`Found ${matchesWithoutConversation.length} matches without conversations.`);

    for (const match of matchesWithoutConversation) {
        console.log(`Creating conversation for match ${match.id}...`);
        await prisma.matchConversation.create({
            data: {
                matchId: match.id
            }
        });
    }

    console.log('Done!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

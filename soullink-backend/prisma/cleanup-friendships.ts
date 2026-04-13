import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning up duplicate friendships ---');
    
    // Fetch all accepted friendships
    const friendships = await prisma.friendship.findMany({
        where: { status: 'ACCEPTED' }
    });

    const seenPairs = new Set<string>();
    const toDelete: string[] = [];

    for (const f of friendships) {
        // Create a normalized pair key (sorted IDs)
        const pair = [f.senderId, f.receiverId].sort().join(':');
        
        if (seenPairs.has(pair)) {
            console.log(`Found duplicate for pair ${pair}. Record ID: ${f.id}`);
            toDelete.push(f.id);
        } else {
            seenPairs.add(pair);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicate records...`);
        await prisma.friendship.deleteMany({
            where: { id: { in: toDelete } }
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

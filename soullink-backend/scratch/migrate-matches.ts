import { prisma } from '../src/config/database.js';
import { AnonymousNamingService } from '../src/shared/utils/anonymousNamingService.js';
import { logger } from '../src/shared/utils/logger.js';

async function migrate() {
    console.log('--- Starting Match Migration ---');
    
    // Find all anonymous matches that don't have an anonymousName
    const matches = await (prisma as any).match.findMany({
        where: {
            isAnonymous: true,
            anonymousName: null
        }
    });

    console.log(`Found ${matches.length} matches to update.`);

    for (const match of matches) {
        const anonymousName = AnonymousNamingService.generateRandomName();
        await (prisma as any).match.update({
            where: { id: match.id },
            data: { anonymousName }
        });
        console.log(`Updated match ${match.id} with name: ${anonymousName}`);
    }

    console.log('--- Migration Complete ---');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

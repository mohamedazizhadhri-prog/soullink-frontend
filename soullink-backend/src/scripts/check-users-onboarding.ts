import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING USERS ONBOARDING STATUS ===");
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            displayName: true,
            onboardingCompleted: true,
        }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        console.log(`- [${u.onboardingCompleted ? 'COMPLETED' : 'PENDING'}] ${u.displayName} (${u.email}) [ID: ${u.id}]`);
    });
}

main()
    .catch(e => console.error("Prisma error:", e))
    .finally(async () => {
        await prisma.$disconnect();
    });

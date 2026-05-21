import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'alex@soullink.test';
    
    console.log(`🚀 Promoting ${email} to ADMIN...`);
    
    const user = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
    });
    
    console.log(`✅ Success! ${user.displayName} (@${user.handle}) is now an ADMIN.`);
    console.log(`🔑 Login with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: SoulLinkUser2026!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

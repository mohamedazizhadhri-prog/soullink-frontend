import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting to seed 10 test users...');
    
    const users = [
        { name: 'Alex Rivera', handle: 'alex_r', email: 'alex@soullink.test' },
        { name: 'Sarah Chen', handle: 'sarah_c', email: 'sarah@soullink.test' },
        { name: 'Marcus Thorne', handle: 'marcus_t', email: 'marcus@soullink.test' },
        { name: 'Elena Vance', handle: 'elena_v', email: 'elena@soullink.test' },
        { name: 'David Kim', handle: 'david_k', email: 'david@soullink.test' },
        { name: 'Maya Gupta', handle: 'maya_g', email: 'maya@soullink.test' },
        { name: 'Leon Kennedy', handle: 'leon_k', email: 'leon@soullink.test' },
        { name: 'Claire Redfield', handle: 'claire_r', email: 'claire@soullink.test' },
        { name: 'Victor Reznov', handle: 'victor_r', email: 'victor@soullink.test' },
        { name: 'Sombra Smith', handle: 'sombra_s', email: 'sombra@soullink.test' },
    ];

    const commonPassword = 'SoulLinkUser2026!';
    // Using a default salt round for speed in seeding
    const passwordHash = await bcrypt.hash(commonPassword, 10);

    console.log('--------------------------------------------------');
    console.log('| EMAIL                        | PASSWORD        |');
    console.log('--------------------------------------------------');

    for (const u of users) {
        try {
            await prisma.user.upsert({
                where: { handle: u.handle },
                update: {},
                create: {
                    email: u.email,
                    displayName: u.name,
                    handle: u.handle,
                    passwordHash,
                    dateOfBirth: new Date('1998-05-15'),
                    status: 'ACTIVE',
                    emailVerified: true,
                    phoneVerified: false,
                    onlineStatus: 'OFFLINE',
                    privacyProfile: 'PUBLIC'
                }
            });
            console.log(`| ${u.email.padEnd(28)} | ${commonPassword} |`);
        } catch (error) {
            console.error(`Error seeding user ${u.handle}:`, error);
        }
    }

    console.log('--------------------------------------------------');
    console.log('✅ Seeding complete. All users are now ACTIVE.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

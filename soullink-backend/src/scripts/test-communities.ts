import { CommunityService } from '../modules/community/community.service.js';
import { prisma } from '../config/database.js';

async function run() {
    const service = new CommunityService();
    console.log('🚀 Starting Community Service Tests...');

    try {
        const user = await prisma.user.upsert({
            where: { email: 'community_test@soullink.com' },
            update: {},
            create: {
                email: 'community_test@soullink.com',
                handle: 'comtest',
                displayName: 'Community Tester',
                passwordHash: 'hashed_password',
                phone: '3333333333',
                dateOfBirth: new Date('1990-01-01')
            }
        });

        const user2 = await prisma.user.upsert({
            where: { email: 'community_test2@soullink.com' },
            update: {},
            create: {
                email: 'community_test2@soullink.com',
                handle: 'comtest2',
                displayName: 'Community Tester 2',
                passwordHash: 'hashed_password',
                phone: '4444444444',
                dateOfBirth: new Date('1990-01-01')
            }
        });

        console.log('✅ Test users ready');

        // 1. Create Community
        console.log('1. Creating community...');
        const community = await service.createCommunity(user.id, {
            name: 'Test Kingdom',
            description: 'A place for testing automation',
            isPublic: true
        });
        if (community.name !== 'Test Kingdom') throw new Error('Wrong name');
        if (community.channels.length === 0) throw new Error('Default channels not created');
        console.log('   Pass (Invite Code: ' + (community as any).inviteCode + ')');

        // 2. Join via Invite
        console.log('2. Joining via invite code...');
        await service.joinByInvite(user2.id, (community as any).inviteCode);
        const detail = await service.getCommunity(community.id);
        if ((detail as any)._count.members !== 2) throw new Error('Member count should be 2');
        console.log('   Pass');

        // 3. Send Message
        console.log('3. Sending message in general channel...');
        const generalChannel = community.channels.find(c => c.name === 'general');
        if (!generalChannel) throw new Error('General channel not found');

        const message = await service.sendMessage(user.id, generalChannel.id, 'Hello Test World!');
        if (message.content !== 'Hello Test World!') throw new Error('Message content mismatch');
        console.log('   Pass');

        // 4. Get Messages
        console.log('4. Verifying message retrieval...');
        const messages = await service.getChannelMessages(generalChannel.id);
        if (messages.length === 0 || messages[0].content !== 'Hello Test World!') throw new Error('Message not found in history');
        console.log('   Pass');

        console.log('\n✨ ALL COMMUNITY SERVICE TESTS PASSED!');
    } catch (error) {
        console.error('\n❌ TEST FAILED:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

run();

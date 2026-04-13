import { FriendsService } from '../modules/friends/friends.service.js';
import { prisma } from '../config/database.js';
async function run() {
    const service = new FriendsService();
    console.log('🚀 Starting Friends Service Tests...');
    try {
        // Find or create test users
        const userA = await prisma.user.upsert({
            where: { email: 'testA@soullink.com' },
            update: {},
            create: {
                email: 'testA@soullink.com',
                handle: 'testA',
                displayName: 'Test A',
                passwordHash: 'hashed_password',
                phone: '1111111111',
                dateOfBirth: new Date('1990-01-01')
            }
        });
        const userB = await prisma.user.upsert({
            where: { email: 'testB@soullink.com' },
            update: {},
            create: {
                email: 'testB@soullink.com',
                handle: 'testB',
                displayName: 'Test B',
                passwordHash: 'hashed_password',
                phone: '2222222222',
                dateOfBirth: new Date('1990-01-01')
            }
        });
        console.log('✅ Test users ready');
        // Cleanup existing friendships
        await prisma.friendship.deleteMany({
            where: {
                OR: [
                    { senderId: userA.id, receiverId: userB.id },
                    { senderId: userB.id, receiverId: userA.id }
                ]
            }
        });
        // 1. Send Request
        console.log('1. Sending friend request...');
        const request = await service.sendRequest(userA.id, userB.id);
        if (request.status !== 'PENDING')
            throw new Error('Request should be PENDING');
        console.log('   Pass');
        // 2. List Pending
        console.log('2. Listing pending requests for User B...');
        const pending = await service.listPendingRequests(userB.id);
        if (pending.length === 0 || pending[0].sender.id !== userA.id)
            throw new Error('Pending request not found');
        console.log('   Pass');
        // 3. Accept Request
        console.log('3. Accepting friend request...');
        await service.respondRequest(userB.id, request.id, 'accept');
        console.log('   Pass');
        // 4. List Friends
        console.log('4. Verifying friend list for User A...');
        const friendsA = await service.listFriends(userA.id);
        if (friendsA.length === 0 || friendsA[0].id !== userB.id)
            throw new Error('Friend not found in list');
        console.log('   Pass');
        console.log('5. Verifying friend list for User B...');
        const friendsB = await service.listFriends(userB.id);
        if (friendsB.length === 0 || friendsB[0].id !== userA.id)
            throw new Error('Friend not found in list');
        console.log('   Pass');
        // 6. Test Error: Self Request
        console.log('6. Testing self-request error...');
        try {
            await service.sendRequest(userA.id, userA.id);
            throw new Error('Should have failed');
        }
        catch (e) {
            if (e.message !== 'You cannot send a friend request to yourself')
                throw e;
            console.log('   Pass');
        }
        // 7. Remove Friend
        console.log('7. Removing friend...');
        await service.removeFriend(userA.id, request.id);
        const friendsAfter = await service.listFriends(userA.id);
        if (friendsAfter.length !== 0)
            throw new Error('Friend should be removed');
        console.log('   Pass');
        console.log('\n✨ ALL FRIENDS SERVICE TESTS PASSED!');
    }
    catch (error) {
        console.error('\n❌ TEST FAILED:');
        console.error(error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();

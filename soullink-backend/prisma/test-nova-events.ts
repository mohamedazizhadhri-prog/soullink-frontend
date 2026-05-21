// Nova Event API Test Script
// Run with: npx tsx prisma/test-nova-events.ts

import { prisma } from '../src/config/database.js';
import { aiService } from '../src/modules/ai-companion/ai.service.js';

async function runTests() {
    console.log('\n🔍 Fetching a real user from the database...');
    const user = await prisma.user.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, email: true, handle: true, displayName: true },
    });

    if (!user) {
        console.log('❌ No active users found in the database. Seed one first.');
        process.exit(1);
    }
    console.log(`✅ Using user: ${user.displayName || user.handle} (${user.email})\n`);

    const tests = [
        { trigger: 'intent_selected',    payload: { intent: 'Gaming Partner' } },
        { trigger: 'friend_accepted',    payload: { friendName: 'Ayoub', friendHandle: 'ayoub_sl' } },
        { trigger: 'friend_request_sent',payload: { targetHandle: 'soulseeker99' } },
        { trigger: 'match_found',        payload: { anonymousName: 'Velvet Comet', score: '87' } },
        { trigger: 'watching_youtube',   payload: { videoTitle: 'lofi hip hop radio', videoId: 'jfKfPfyJRdk' } },
        { trigger: 'dormant_dm',         payload: { friendName: 'Khalil', daysSince: '12' } },
        { trigger: 'long_match_chat',    payload: { messageCount: '31', anonymousName: 'Silver Echo' } },
        { trigger: 'idle_on_match',      payload: {} },
        { trigger: 'profile_updated',    payload: { changedField: 'profile picture' } },
        { trigger: 'anniversary',        payload: { daysSince: '365' } },
        { trigger: 'unknown_trigger',    payload: {} }, // should return null
    ];

    let passed = 0;
    let failed = 0;

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const test of tests) {
        process.stdout.write(`  🧪 ${test.trigger.padEnd(22)} → `);
        try {
            const result = await aiService.generateEventResponse(user.id, test.trigger, test.payload);
            if (test.trigger === 'unknown_trigger') {
                if (result === null) {
                    console.log(`✅ CORRECTLY SKIPPED`);
                    passed++;
                } else {
                    console.log(`❌ SHOULD HAVE BEEN null but got: ${result}`);
                    failed++;
                }
            } else if (result) {
                console.log(`✅ [${result.mood.toUpperCase()}] "${result.response.slice(0, 80)}..."`);
                passed++;
            } else {
                console.log(`❌ NULL response (check LLM/context errors)`);
                failed++;
            }
        } catch (e: any) {
            console.log(`❌ THREW: ${e.message}`);
            failed++;
        }
        await sleep(5000); // stay under 20 req/min Groq limit
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
    if (failed === 0) console.log('🎉 All Nova event triggers are working!');
    else console.log('⚠️  Some triggers need attention.');

    await prisma.$disconnect();
}

runTests().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});

import { PrismaClient, MatchIntent } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting to seed Matching Test Data...');

    const personas = [
        {
            handle: 'alex_r',
            intent: MatchIntent.GAMING,
            ocean: { openness: 0.4, conscientiousness: 0.7, extraversion: 0.9, agreeableness: 0.3, neuroticism: 0.2 },
            interests: ['competitive_gaming', 'esports', 'fps', 'valorant', 'mechanical_keyboards']
        },
        {
            handle: 'sarah_c',
            intent: MatchIntent.DEEP_BOND,
            ocean: { openness: 0.9, conscientiousness: 0.8, extraversion: 0.4, agreeableness: 0.7, neuroticism: 0.3 },
            interests: ['philosophy', 'psychology', 'astronomy', 'classical_music', 'meditation']
        },
        {
            handle: 'marcus_t',
            intent: MatchIntent.FRIEND,
            ocean: { openness: 0.6, conscientiousness: 0.5, extraversion: 0.8, agreeableness: 0.9, neuroticism: 0.4 },
            interests: ['photography', 'hiking', 'live_music', 'travel', 'foodie']
        },
        {
            handle: 'elena_v',
            intent: MatchIntent.STUDY_BUDDY,
            ocean: { openness: 0.7, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.4 },
            interests: ['coding', 'mathematics', 'linguistics', 'lofi_beats', 'minimalism']
        },
        {
            handle: 'david_k',
            intent: MatchIntent.ROMANCE,
            ocean: { openness: 0.8, conscientiousness: 0.4, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.5 },
            interests: ['poetry', 'art_history', 'cooking', 'jazz', 'cinema']
        },
        {
            handle: 'maya_g',
            intent: MatchIntent.FRIEND,
            ocean: { openness: 0.6, conscientiousness: 0.6, extraversion: 0.6, agreeableness: 0.7, neuroticism: 0.3 },
            interests: ['yoga', 'watercolor', 'sustainability', 'gardening', 'podcasts']
        },
        {
            handle: 'leon_k',
            intent: MatchIntent.GAMING,
            ocean: { openness: 0.5, conscientiousness: 0.6, extraversion: 0.8, agreeableness: 0.5, neuroticism: 0.7 },
            interests: ['survival_horror', 'motorcycles', 'fitness', 'streaming', 'rock_music']
        },
        {
            handle: 'claire_r',
            intent: MatchIntent.DEEP_BOND,
            ocean: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.2 },
            interests: ['volunteering', 'animal_rescue', 'nature_photography', 'first_aid', 'adventure']
        },
        {
            handle: 'victor_r',
            intent: MatchIntent.STUDY_BUDDY,
            ocean: { openness: 0.5, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.3, neuroticism: 0.8 },
            interests: ['military_history', 'strategy_games', 'chess', 'winter_sports', 'politics']
        },
        {
            handle: 'sombra_s',
            intent: MatchIntent.GAMING,
            ocean: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.7, agreeableness: 0.4, neuroticism: 0.4 },
            interests: ['cybersecurity', 'retro_gaming', 'cryptography', 'electronic_music', 'urban_exploration']
        }
    ];

    for (const persona of personas) {
        const user = await prisma.user.findUnique({
            where: { handle: persona.handle }
        });

        if (!user) {
            console.log(`⚠️ User ${persona.handle} not found, skipping.`);
            continue;
        }

        // Upsert Personality Profile
        await prisma.personalityProfile.upsert({
            where: { userId: user.id },
            update: {
                ...persona.ocean,
                interests: persona.interests,
                lastCalculatedAt: new Date()
            },
            create: {
                userId: user.id,
                ...persona.ocean,
                interests: persona.interests
            }
        });

        // Upsert Match Preference
        await prisma.matchPreference.upsert({
            where: { userId: user.id },
            update: {
                intent: persona.intent,
                selectedInterests: persona.interests,
                lastUpdatedAt: new Date()
            },
            create: {
                userId: user.id,
                intent: persona.intent,
                selectedInterests: persona.interests
            }
        });

        console.log(`✅ Seeded persona for ${persona.handle}`);
    }

    console.log('✨ Matching Test Data seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient();

// Data extracted from the research folder's questions.ts
const domains = {
  E: { name: 'Extraversion', field: 'extraversion', title: 'Island of Mirrors', desc: 'Exploring your social energy and how you interact with the world around you.', color: '#f59e0b', icon: 'Sun' },
  A: { name: 'Agreeableness', field: 'agreeableness', title: 'The Whispering Woods', desc: 'A journey into empathy, trust, and how you connect with others.', color: '#10b981', icon: 'Heart' },
  C: { name: 'Conscientiousness', field: 'conscientiousness', title: 'The Crystal Library', desc: 'Testing your focus, organization, and dedication to your path.', color: '#3b82f6', icon: 'Book' },
  N: { name: 'Neuroticism', field: 'neuroticism', title: 'Stormy Peaks', desc: 'Understanding your emotional resilience and inner stability.', color: '#ef4444', icon: 'CloudLightning' },
  O: { name: 'Openness', field: 'openness', title: 'The Infinite Canvas', desc: 'Unlocking the creativity and curiosity of your mind.', color: '#8b5cf6', icon: 'Palette' },
};

const rawQuestions = [
  // E - Extraversion
  { text: 'Make friends easily', domain: 'E', keyed: 'plus' },
  { text: 'Love large parties', domain: 'E', keyed: 'plus' },
  { text: 'Take charge', domain: 'E', keyed: 'plus' },
  { text: 'Radiate joy', domain: 'E', keyed: 'plus' },
  { text: 'Avoid contacts with others', domain: 'E', keyed: 'minus' },
  { text: 'Prefer to be alone', domain: 'E', keyed: 'minus' },
  { text: 'Wait for others to lead the way', domain: 'E', keyed: 'minus' },
  // A - Agreeableness
  { text: 'Trust others', domain: 'A', keyed: 'plus' },
  { text: 'Love to help others', domain: 'A', keyed: 'plus' },
  { text: 'Sympathize with the homeless', domain: 'A', keyed: 'plus' },
  { text: 'Believe that others have good intentions', domain: 'A', keyed: 'plus' },
  { text: 'Use others for my own ends', domain: 'A', keyed: 'minus' },
  { text: 'Love a good fight', domain: 'A', keyed: 'minus' },
  { text: 'Insult people', domain: 'A', keyed: 'minus' },
  // C - Conscientiousness
  { text: 'Complete tasks successfully', domain: 'C', keyed: 'plus' },
  { text: 'Like to tidy up', domain: 'C', keyed: 'plus' },
  { text: 'Keep my promises', domain: 'C', keyed: 'plus' },
  { text: 'Am always prepared', domain: 'C', keyed: 'plus' },
  { text: 'Jump into things without thinking', domain: 'C', keyed: 'minus' },
  { text: 'Often forget to put things back', domain: 'C', keyed: 'minus' },
  { text: 'Waste my time', domain: 'C', keyed: 'minus' },
  // N - Neuroticism
  { text: 'Worry about things', domain: 'N', keyed: 'plus' },
  { text: 'Often feel blue', domain: 'N', keyed: 'plus' },
  { text: 'Panic easily', domain: 'N', keyed: 'plus' },
  { text: 'Get stressed out easily', domain: 'N', keyed: 'plus' },
  { text: 'Feel comfortable with myself', domain: 'N', keyed: 'minus' },
  { text: 'Am not easily annoyed', domain: 'N', keyed: 'minus' },
  { text: 'Am able to control my cravings', domain: 'N', keyed: 'minus' },
  // O - Openness
  { text: 'Have a vivid imagination', domain: 'O', keyed: 'plus' },
  { text: 'Believe in the importance of art', domain: 'O', keyed: 'plus' },
  { text: 'Prefer variety to routine', domain: 'O', keyed: 'plus' },
  { text: 'Enjoy wild flights of fantasy', domain: 'O', keyed: 'plus' },
  { text: 'Dislike changes', domain: 'O', keyed: 'minus' },
  { text: 'Avoid philosophical discussions', domain: 'O', keyed: 'minus' },
  { text: 'Do not like poetry', domain: 'O', keyed: 'minus' },
];

const choicesTemplate = [
  { text: 'Very Inaccurate', weight: 1 },
  { text: 'Moderately Inaccurate', weight: 2 },
  { text: 'Neither', weight: 3 },
  { text: 'Moderately Accurate', weight: 4 },
  { text: 'Very Accurate', weight: 5 },
];

async function main() {
  console.log('--- Starting SoulLink Personality Episodes Seed ---');

  // Create Episodes 1-5 (Trait Specific)
  const traitEntries = Object.entries(domains);
  for (let i = 0; i < traitEntries.length; i++) {
    const [domainCode, info] = traitEntries[i];
    const episodeNum = i + 1;
    
    console.log(`Creating Episode ${episodeNum}: ${info.title}...`);
    
    const game = await prisma.soulGame.upsert({
      where: { slug: `episode-${episodeNum}` },
      update: {},
      create: {
        slug: `episode-${episodeNum}`,
        title: info.title,
        description: info.desc,
        color: info.color,
        icon: info.icon,
        episode: episodeNum,
        orderIndex: episodeNum,
        mandatory: true,
        theme: 'personality'
      }
    });

    const domainQuestions = rawQuestions.filter(q => q.domain === domainCode);
    
    for (let s = 0; s < domainQuestions.length; s++) {
      const qData = domainQuestions[s];
      const scene = await prisma.gameScene.create({
        data: {
          gameId: game.id,
          sceneOrder: s + 1,
          text: qData.text,
          novaComment: `Nova is analyzing your reflection on "${qData.text.toLowerCase()}"...`,
          novaMood: 'CURIOUS',
          choices: {
            create: choicesTemplate.map((c, idx) => {
              // Weight calculation: 0.1 to 0.5 per answer.
              // If plus keyed: 1=0.1, 5=0.5
              // If minus keyed: 1=0.5, 5=0.1
              let finalWeight = c.weight * 0.1;
              if (qData.keyed === 'minus') {
                finalWeight = 0.6 - finalWeight;
              }

              return {
                text: c.text,
                themeColor: info.color,
                orderIndex: idx + 1,
                [info.field]: finalWeight,
                valueCategory: info.name
              };
            })
          }
        }
      });
    }
  }

  // Create Episode 6: Total Synthesis
  console.log('Creating Episode 6: The Soul Synthesis...');
  const synthesisGame = await prisma.soulGame.upsert({
    where: { slug: 'episode-6' },
    update: {},
    create: {
      slug: 'episode-6',
      title: 'The Soul Synthesis',
      description: 'The final integration of your personality traits into a cohesive soul signature.',
      color: '#ffffff',
      icon: 'Activity',
      episode: 6,
      orderIndex: 6,
      mandatory: true,
      theme: 'personality'
    }
  });

  // Pick 2 random from each domain for synthesis
  const synthQuestions = traitEntries.flatMap(([domainCode]) => 
    rawQuestions.filter(q => q.domain === domainCode).slice(0, 2)
  );

  for (let s = 0; s < synthQuestions.length; s++) {
    const qData = synthQuestions[s];
    const info = domains[qData.domain as keyof typeof domains];
    
    await prisma.gameScene.create({
      data: {
        gameId: synthesisGame.id,
        sceneOrder: s + 1,
        text: qData.text,
        novaComment: "Final synthesis in progress. Every reflection matters.",
        novaMood: "FOCUS",
        choices: {
          create: choicesTemplate.map((c, idx) => {
            let finalWeight = c.weight * 0.1;
            if (qData.keyed === 'minus') finalWeight = 0.6 - finalWeight;

            return {
              text: c.text,
              themeColor: info.color,
              orderIndex: idx + 1,
              [info.field]: finalWeight,
              valueCategory: info.name
            };
          })
        }
      }
    });
  }

  console.log('--- SoulLink Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

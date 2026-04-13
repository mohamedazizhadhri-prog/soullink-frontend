import { prisma } from '../config/database.js';
import { logger } from '../shared/utils/logger.js';

async function testConnection() {
    console.log('🔍 Testing Database Connection...');
    console.log('Environment:', process.env.NODE_ENV);

    try {
        // Try a simple query
        const startTime = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const duration = Date.now() - startTime;

        console.log('✅ Database Connection Successful!');
        console.log(`⏱️  Response time: ${duration}ms`);

        const userCount = await prisma.user.count();
        console.log(`📊 Total users in database: ${userCount}`);

    } catch (error: any) {
        console.error('❌ Database Connection Failed!');
        console.error('Error Code:', error.code || 'N/A');
        console.error('Error Message:', error.message);

        if (error.message.includes('Can\'t reach database server')) {
            console.log('\n💡 Troubleshooting Tips:');
            console.log('1. Check if your internet connection is active.');
            console.log('2. Verify that your DATABASE_URL in .env is correct.');
            console.log('3. Ensure port 5432 is transition-allowed on your network.');
            console.log('4. Check if your Neon database is suspended or maintenance is ongoing.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();

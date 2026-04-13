import { registerSchema } from './src/modules/auth/auth.schema.js';

const testUnderage = {
    body: {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        handle: 'testuser',
        dateOfBirth: '2015-01-01',
    }
};

const testOverage = {
    body: {
        email: 'test2@example.com',
        password: 'password123',
        displayName: 'Test User 2',
        handle: 'testuser2',
        dateOfBirth: '2000-01-01',
    }
};

console.log('Testing Underage (2015-01-01):');
const result1 = registerSchema.safeParse(testUnderage);
if (result1.success) {
    console.log('❌ Error: Underage birth date passed validation');
} else {
    console.log('✅ Success: Underage birth date failed validation');
    console.log('Error message:', result1.error.errors[0].message);
}

console.log('\nTesting Overage (2000-01-01):');
const result2 = registerSchema.safeParse(testOverage);
if (result2.success) {
    console.log('✅ Success: Overage birth date passed validation');
} else {
    console.log('❌ Error: Overage birth date failed validation');
    console.log('Error message:', result2.error.errors[0].message);
}

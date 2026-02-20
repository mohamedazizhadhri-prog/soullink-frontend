
import * as fs from 'fs';
import * as path from 'path';

const questionsPath = 'd:\\pfe\\pfe t7cha0.3\\bigfive-web-master\\packages\\questions\\src\\data\\en\\questions.ts';

try {
    console.log('Attempting to read:', questionsPath);
    if (fs.existsSync(questionsPath)) {
        console.log('File exists!');
        const content = fs.readFileSync(questionsPath, 'utf-8');
        console.log('Read success, length:', content.length);

        const debugPath = path.join(__dirname, 'debug_test.txt');
        console.log('Attempting to write:', debugPath);
        fs.writeFileSync(debugPath, 'Test write success');
        console.log('Write success!');
    } else {
        console.log('File DOES NOT exist!');
    }
} catch (err: any) {
    console.error('Error:', err.message);
}

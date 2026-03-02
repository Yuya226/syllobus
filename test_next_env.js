const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
console.log('Original Next.js:', JSON.stringify(process.env.GOOGLE_PRIVATE_KEY));
const parsed = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '');
console.log('\n---PARSED---\n');
console.log(parsed);

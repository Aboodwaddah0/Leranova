import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'scripts', 'dbSeed.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix role_in_chat values
content = content.replace(/role_in_chat: 'instructor'/g, "role_in_chat: 'teacher'");

fs.writeFileSync(filePath, content);
console.log('Fixed: role_in_chat instructor -> teacher');

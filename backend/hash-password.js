// hash-password.js
const bcrypt = require('bcryptjs');

const password = 'YourSecurePassword123'; // <-- Put the desired password here
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('--- COPY THIS HASH ---');
console.log(hash);
console.log('----------------------');
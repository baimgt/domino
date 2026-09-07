const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Extract the character from media_1788077337494.jpg
// We can use sharp, or since sharp might not be installed, let's check if sharp or canvas is available, or we can decode JPEG.
console.log('Checking dependencies...');

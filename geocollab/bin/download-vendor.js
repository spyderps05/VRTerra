const https = require('https');
const fs = require('fs');
const path = require('path');

const vendorDir = path.join(__dirname, '../public/vendor');
if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
}

console.log('Downloading vendor scripts for offline use...');

const files = [
    { url: 'https://aframe.io/releases/1.6.0/aframe.min.js', dest: 'aframe.min.js' },
    { url: 'https://unpkg.com/networked-aframe@0.12.0/dist/networked-aframe.min.js', dest: 'networked-aframe.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.8.3/socket.io.js', dest: 'socket.io.js' },
    { url: 'https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js', dest: 'maplibre-gl.js' },
    { url: 'https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css', dest: 'maplibre-gl.css' },
    { url: 'https://unpkg.com/@turf/turf@7/turf.min.js', dest: 'turf.min.js' }
];

files.forEach(file => {
    https.get(file.url, (response) => {
        if (response.statusCode === 200) {
            const writeStream = fs.createWriteStream(path.join(vendorDir, file.dest));
            response.pipe(writeStream);
            writeStream.on('finish', () => {
                console.log(`✅ Successfully downloaded ${file.dest}`);
            });
        } else {
            console.error(`❌ Failed to download ${file.dest}. Status Code: ${response.statusCode}`);
        }
    }).on('error', (err) => {
        console.error(`❌ Error downloading ${file.dest}:`, err.message);
    });
});

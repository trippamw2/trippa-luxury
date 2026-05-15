// Downloads all Kivara Unsplash images to public/images/
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'public', 'images');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const images = {
  // Lake Malawi
  'lake-malawi-hero': '1507525428034-b723cf961d3e',
  'lake-malawi-aerial': '1580974852861-c3810a2f8f9f',
  'lake-malawi-sunset': '1613771406114-0f1237f4e14f',
  'lake-malawi-beach': '1506953823976-92e7a2e3dbb6',
  'lake-malawi-dhow': '1569949381669-ecf31ae8f613',
  'lake-malawi-island': '1559128010-7c1ad6e1b6a5',
  // South Luangwa
  'south-luangwa-hero': '1516426122078-c23e76319801',
  'south-luangwa-elephant': '1547970824-ee225ed72a2e',
  'south-luangwa-leopard': '1569949381669-ecf31ae8f613',
  'south-luangwa-sunset': '1510414849017-6f6351b2ce7d',
  'south-luangwa-safari': '1536240478700-b070869f3f97',
  'south-luangwa-camp': '1570042225831-d98fa7577f1e',
  // Zanzibar
  'zanzibar-hero': '1605810230484-471653706b9f',
  'zanzibar-beach': '1452421822248-d4c2b47f0c81',
  'zanzibar-aerial': '1476514525535-07fb3b4ae5f1',
  'zanzibar-dhow': '1506953823976-92e7a2e3dbb6',
  'zanzibar-spa': '1540555700478-4be289fbec6d',
  'zanzibar-stonetown': '1547970824-ee225ed72a2e',
  // Properties
  'kaya-mawa': '1585403784267-f7614d24f2c2',
  'pumulani': '1559128010-7c1ad6e1b6a5',
  'blue-zebra': '1506953823976-92e7a2e3dbb6',
  'puku-ridge': '1570042225831-d98fa7577f1e',
  'luangwa-house': '1580587771525-78b9dba3b914',
  'luangwa-river': '1517457373958-b7bdd4587205',
  'xanadu': '1600240644455-3edc55c375fe',
  'white-sand': '1571003123894-1f0594d2b5d9',
  'residence': '1582719478250-c89cae4dc85b',
  // Experiences
  'dining': '1470337458703-46ad1756a187',
  'walking': '1510414849017-6f6351b2ce7d',
  'dhow': '1506953823976-92e7a2e3dbb6',
  'spa': '1540555700478-4be289fbec6d',
  'starbed': '1517457373958-b7bdd4587205',
  'bush-dining': '1466978913421-dad2ebd01d17',
  // Journal
  'journal-honeymoon': '1476514525535-07fb3b4ae5f1',
  'journal-malawi': '1507525428034-b723cf961d3e',
  'journal-walking': '1536240478700-b070869f3f97',
  'journal-zanzibar': '1452421822248-d4c2b47f0c81',
  // Hero poster
  'hero-poster': '1516426122078-c23e76319801',
};

const downloaded = new Set();
let completed = 0;
let failed = 0;
const total = Object.keys(images).length;

function download(filename, photoId) {
  return new Promise((resolve) => {
    const filePath = path.join(outDir, `${filename}.jpg`);
    if (fs.existsSync(filePath)) {
      completed++;
      process.stdout.write(`\r[${completed}/${total}] ${filename}.jpg (exists)`);
      resolve(true);
      return;
    }
    const url = `https://images.unsplash.com/photo-${photoId}?q=80&w=1920`;
    const file = fs.createWriteStream(filePath);
    https.get(url, (res) => {
      // Follow redirects (Unsplash may redirect)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(filePath, () => {});
        https.get(res.headers.location, (res2) => {
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            completed++;
            process.stdout.write(`\r[${completed}/${total}] ${filename}.jpg`);
            resolve(true);
          });
        }).on('error', () => {
          file.close();
          fs.unlink(filePath, () => {});
          failed++;
          resolve(false);
        });
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        completed++;
        process.stdout.write(`\r[${completed}/${total}] ${filename}.jpg`);
        resolve(true);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(filePath, () => {});
      failed++;
      resolve(false);
    });
  });
}

(async () => {
  console.log(`Downloading ${total} images to ${outDir}...\n`);
  // Download in batches of 5 to be polite
  const entries = Object.entries(images);
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    await Promise.all(batch.map(([name, id]) => download(name, id)));
  }
  console.log(`\n\nDone! ${completed} downloaded, ${failed} failed.`);
})();

const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const results = [];

fs.createReadStream(path.join(__dirname, '../data/products_export_1 (5).csv'))
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    const outputPath = path.join(__dirname, '../netlify/functions/products.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Converted CSV to JSON. Output saved to: ${outputPath}`);
  }); 
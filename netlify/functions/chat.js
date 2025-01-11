const { Configuration, OpenAIApi } = require('openai');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI with API key from environment variables
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Function to read CSV file
async function readProducts() {
  const products = [];
  const csvPath = path.join(__dirname, '../../data/products_export_1 (5).csv');
  
  console.log('Attempting to read CSV from:', csvPath);
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    throw new Error('Product data file not found');
  }

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      })
      .pipe(csv())
      .on('data', (data) => {
        console.log('Read product:', data.Title || 'Unknown Title');
        products.push(data);
      })
      .on('end', () => {
        console.log('Finished reading CSV. Total products:', products.length);
        resolve(products);
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        reject(error);
      });
  });
}

exports.handler = async function(event, context) {
  console.log('Received request:', event.httpMethod, event.body);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);
    console.log('Processing message:', message);

    let products;
    try {
      products = await readProducts();
    } catch (error) {
      console.error('Failed to read products:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to load product data',
          details: error.message,
          path: path.join(__dirname, '../../data/products_export_1 (5).csv')
        })
      };
    }
    
    console.log('Successfully loaded products, sending to OpenAI');
    
    const prompt = `You are a helpful shopping assistant. Here is the customer's question and our complete product catalog. Please answer their question based on the product information provided.

Customer question: ${message}

Product catalog:
${JSON.stringify(products, null, 2)}

Please provide a natural, helpful response based on the complete product catalog. Always include prices when discussing specific products. If multiple products match the query, mention the options available.`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful shopping assistant that only discusses available products." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 250
    });

    console.log('Received response from OpenAI');

    return {
      statusCode: 200,
      body: JSON.stringify({
        response: completion.data.choices[0].message.content
      }),
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
    };
  }
};

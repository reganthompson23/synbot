const { Configuration, OpenAIApi } = require('openai');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Function to read CSV file
async function readProducts() {
  const products = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../../data/products_export_1 (5).csv'))
      .pipe(csv())
      .on('data', (data) => products.push(data))
      .on('end', () => resolve(products))
      .on('error', (error) => reject(error));
  });
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);
    const products = await readProducts();
    
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        response: completion.data.choices[0].message.content
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};

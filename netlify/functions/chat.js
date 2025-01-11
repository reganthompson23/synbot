const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI with API key from environment variables
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    // Read the CSV file directly
    const csvPath = path.join(__dirname, '../../data/products_export_1 (5).csv');
    const productData = fs.readFileSync(csvPath, 'utf8');
    
    const prompt = `You are a helpful shopping assistant. Here is the customer's question and our product catalog data. Please answer their question based on the product information provided.

Customer question: ${message}

Product catalog:
${productData}

Please provide a natural, helpful response based on the product catalog. Always include prices when discussing specific products. If multiple products match the query, mention all available options.`;

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

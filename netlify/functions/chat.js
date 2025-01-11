const { Configuration, OpenAIApi } = require('openai');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Function to clean HTML content
function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '') : '';
}

// Function to read CSV file
async function readProducts() {
  const products = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../../data/products_export_1 (5).csv'))
      .pipe(csv())
      .on('data', (data) => {
        products.push({
          title: data.Title,
          body: data['Body (HTML)'],
          vendor: data.Vendor,
          price: data['Variant Price'],
          specifications: data['Specifications (product.metafields.my_fields.specifications)']
        });
      })
      .on('end', () => resolve(products))
      .on('error', (error) => reject(error));
  });
}

// Function to find relevant products
async function findRelevantProducts(query) {
  const products = await readProducts();
  return products.filter(product => {
    // Create searchable text from all fields
    const searchableText = [
      product.title,
      stripHtml(product.body),
      product.vendor,
      product.specifications
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query.toLowerCase());
  }).slice(0, 3).map(product => {
    // Return formatted product data
    return {
      title: product.title,
      brand: product.vendor,
      price: product.price,
      description: stripHtml(product.body),
      specifications: product.specifications
    };
  });
}

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    // Find relevant products
    const relevantProducts = await findRelevantProducts(message);
    
    if (relevantProducts.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          response: "I apologize, but I couldn't find any products matching your query. Could you please rephrase your question or ask about something else?"
        }),
      };
    }

    // Create prompt for OpenAI
    const prompt = `You are a helpful shopping assistant. Answer the following question based only on the provided product information. If the question isn't about the products, politely explain that you can only help with product-related questions.

Customer question: ${message}

Relevant products:
${JSON.stringify(relevantProducts, null, 2)}

Please provide a natural, helpful response based only on this product information. If there are specifications available, make sure to mention relevant ones in your response. Always include the price when discussing products.`;

    // Get response from OpenAI
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful shopping assistant that only discusses available products." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 150
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
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

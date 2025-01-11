const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Hardcode products array (we'll replace this with your actual product data)
const products = [
  {
    name: "Sample Product",
    description: "This is a sample product",
    price: "$99.99"
  }
  // You can paste your actual product data here
];

// Function to find relevant products
function findRelevantProducts(query) {
  // Simple search implementation
  return products.filter(product => {
    const searchText = Object.values(product).join(' ').toLowerCase();
    return searchText.includes(query.toLowerCase());
  }).slice(0, 3); // Return top 3 matches
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
    const relevantProducts = findRelevantProducts(message);
    
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

Please provide a natural, helpful response based only on this product information.`;

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

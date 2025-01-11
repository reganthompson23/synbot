# Shopify Product Chatbot

A simple AI-powered chatbot that can be embedded in your Shopify store. The chatbot uses a CSV file as its knowledge base to answer customer questions about products.

## Features
- Simple chat interface
- CSV-based product knowledge base
- Easy to embed in Shopify stores
- Hosted on Netlify

## Setup
1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Add your product CSV file to the `data` directory
3. Deploy to Netlify
4. Add the chatbot widget to your Shopify store

## CSV Format
Your CSV should include the following columns:
- product_name
- description
- price
- category
(Add more columns as needed)

## Environment Variables
Create a `.env` file with:
```
OPENAI_API_KEY=your_api_key_here
```

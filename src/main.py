from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import openai
from dotenv import load_dotenv
import os
import glob

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Shopify store domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load and process product data
class ProductDB:
    def __init__(self):
        # Find the first CSV file in the data directory
        csv_files = glob.glob('data/*.csv')
        if not csv_files:
            raise Exception("No CSV files found in the data directory")
        
        self.csv_path = csv_files[0]
        print(f"Loading product data from: {self.csv_path}")
        
        self.df = pd.read_csv(self.csv_path)
        self.vectorizer = TfidfVectorizer(stop_words='english')
        # Combine all text fields for better matching
        self.df['combined_text'] = self.df.apply(
            lambda row: ' '.join(str(val) for val in row.values), axis=1
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df['combined_text'])
        print(f"Loaded {len(self.df)} products from CSV")
        print(f"CSV columns: {', '.join(self.df.columns)}")
    
    def find_relevant_products(self, query: str, threshold: float = 0.2) -> List[dict]:
        query_vector = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vector, self.tfidf_matrix)[0]
        relevant_indices = np.where(similarities > threshold)[0]
        
        relevant_products = []
        for idx in relevant_indices:
            product = self.df.iloc[idx].to_dict()
            product['similarity'] = float(similarities[idx])
            relevant_products.append(product)
        
        return sorted(relevant_products, key=lambda x: x['similarity'], reverse=True)

# Initialize product database
try:
    product_db = ProductDB()
except Exception as e:
    print(f"Error loading product database: {e}")
    product_db = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not product_db:
        raise HTTPException(status_code=500, message="Product database not initialized")
    
    # Find relevant products
    relevant_products = product_db.find_relevant_products(request.message)
    
    if not relevant_products:
        return ChatResponse(response="I apologize, but I couldn't find any products matching your query. Could you please rephrase your question or ask about something else?")
    
    # Create a prompt for OpenAI
    prompt = f"""You are a helpful shopping assistant. Answer the following question based only on the provided product information. If the question isn't about the products, politely explain that you can only help with product-related questions.

Customer question: {request.message}

Relevant products:
{relevant_products[:3]}  # Limiting to top 3 matches

Please provide a natural, helpful response based only on this product information."""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful shopping assistant that only discusses available products."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
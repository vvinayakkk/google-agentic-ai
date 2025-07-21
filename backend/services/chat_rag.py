import os
import numpy as np
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain_core.output_parsers import StrOutputParser
from sentence_transformers import SentenceTransformer
from utils.firestore_vector_search import search_farmers_by_vector

# Load Gemini 2.5 Flash
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyC-OmyX48OcwbNLR7GcplTKKiAEPSZXHzc")
model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)

# Load embedding model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def embed_query(text):
    return embedding_model.encode(text).tolist()

def build_context_bullets(results):
    bullets = []
    links = []
    for sim, data, docid in results:
        name = data.get('name', 'Farmer')
        village = data.get('village', '')
        crops = ', '.join([c['name'] for c in data.get('crops', [])])
        bullet = f"• **{name}** from {village} grows: {crops}"
        bullets.append(bullet)
        # Example link: could be to a profile or resource
        links.append(f"https://yourapp.com/farmer/{docid}")
    return '\n'.join(bullets), links

def generate_rag_response(user_query, chat_history=None, section='crops', top_k=3, memory=None):
    query_embedding = embed_query(user_query)
    results = search_farmers_by_vector(query_embedding, section=section, top_k=top_k)
    bullets, links = build_context_bullets(results)
    context_text = f"Relevant farmers and crops:\n{bullets}\n\nUseful links:\n" + '\n'.join(links)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are Kissan AI, an expert agricultural assistant. Use the provided context to answer the user's question. Respond with clear bullet points, include links if relevant, and be concise but informative. If the user asks a follow-up, use previous context and memory."),
        ("human", "User question: {user_query}\n\nContext:\n{context_text}\n\nChat history:\n{chat_history}\n"),
    ])
    memory = memory or ConversationBufferMemory(return_messages=True)
    chain = prompt | model | StrOutputParser()
    response = chain.invoke({
        "user_query": user_query,
        "context_text": context_text,
        "chat_history": chat_history or ""
    })
    memory.save_context({"input": user_query}, {"output": response})
    return {
        "response": response,
        "memory": memory.buffer,
        "links": links,
        "context_bullets": bullets
    } 
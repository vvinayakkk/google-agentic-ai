import os
import numpy as np
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain_core.output_parsers import StrOutputParser
from sentence_transformers import SentenceTransformer
from utils.firestore_vector_search import search_farmers_by_vector
import langdetect

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyC-OmyX48OcwbNLR7GcplTKKiAEPSZXHzc")
model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

SECTIONS = [
    'profile', 'livestock', 'crops', 'calendarEvents', 'marketListings', 'chatHistory', 'documents'
]

def embed_query(text):
    return embedding_model.encode(text).tolist()

def build_rich_context(query, top_k=2):
    query_embedding = embed_query(query)
    context = {}
    for section in SECTIONS:
        results = search_farmers_by_vector(query_embedding, section=section, top_k=top_k)
        context[section] = results
    return context

def context_to_prompt(context):
    prompt_parts = []
    for section, results in context.items():
        if not results:
            continue
        if section == 'profile':
            for sim, data, docid in results:
                prompt_parts.append(f"Farmer profile: {data.get('name','')} from {data.get('village','')} speaks {data.get('language','')}.")
        elif section == 'livestock':
            for sim, data, docid in results:
                livestock = data.get('livestock', [])
                if livestock:
                    animals = ', '.join([f"{a['type']} ({a['name']})" for a in livestock])
                    prompt_parts.append(f"Livestock: {animals}.")
        elif section == 'crops':
            for sim, data, docid in results:
                crops = data.get('crops', [])
                if crops:
                    crop_list = ', '.join([c['name'] for c in crops])
                    prompt_parts.append(f"Crops grown: {crop_list}.")
        elif section == 'calendarEvents':
            for sim, data, docid in results:
                events = data.get('calendarEvents', [])
                if events:
                    event_lines = '\n'.join([f"- {e['date']} {e['task']}: {e['details']}" for e in events])
                    prompt_parts.append(f"Upcoming schedule/events:\n{event_lines}")
        elif section == 'marketListings':
            for sim, data, docid in results:
                listings = data.get('marketListings', [])
                if listings:
                    lines = '\n'.join([f"- {l['name']} ({l['quantity']}): ₹{l['myPrice']} (market: ₹{l['marketPrice']})" for l in listings])
                    prompt_parts.append(f"Market listings:\n{lines}")
        elif section == 'chatHistory':
            for sim, data, docid in results:
                chats = data.get('chatHistory', [])
                if chats:
                    chat_lines = '\n'.join([f"- {c['title']} on {c['date']}" for c in chats])
                    prompt_parts.append(f"Recent chats:\n{chat_lines}")
        elif section == 'documents':
            for sim, data, docid in results:
                docs = data.get('documents', [])
                if docs:
                    doc_lines = '\n'.join([f"- {d['title']} ({d['type']}) on {d['time']}" for d in docs])
                    prompt_parts.append(f"Documents:\n{doc_lines}")
    return '\n\n'.join(prompt_parts)

def generate_rag_response(user_query, chat_history=None, section=None, top_k=2, memory=None):
    context = build_rich_context(user_query, top_k=top_k)
    context_text = context_to_prompt(context)
    # Detect question language
    try:
        question_language = langdetect.detect(user_query)
    except Exception:
        question_language = "en"
    # Format chat history as a numbered list for the model
    formatted_history = ""
    if chat_history:
        try:
            import json
            history = json.loads(chat_history) if isinstance(chat_history, str) else chat_history
            if isinstance(history, list):
                formatted_history = "\n".join([
                    f"{i+1}. {msg['sender'].capitalize()}: {msg['content']}" for i, msg in enumerate(history) if 'sender' in msg and 'content' in msg
                ])
            else:
                formatted_history = str(chat_history)
        except Exception:
            formatted_history = str(chat_history)
    system_prompt = (
        "You are Kissan AI, an expert agricultural and farm assistant.\n"
        "ALWAYS answer in the SAME LANGUAGE as the user's question, regardless of the data or previous answers.\n"
        "If the question is in English, answer in English. If in Hindi, answer in Hindi. If in Marathi, answer in Marathi. Never answer in any other language.\n"
        "Example:\nUser: What is my schedule?\nAssistant: [Answer in English]\nUser: मेरा शेड्यूल क्या है?\nAssistant: [Answer in Hindi]\n"
        "Do not start every answer with a greeting or 'hello'.\n"
        "Only include links if they are relevant to the user's question. For topics like subsidies, always provide official Indian government links (e.g., https://agricoop.nic.in, https://pmkisan.gov.in, https://farmer.gov.in, https://www.india.gov.in).\n"
        "When including links, always use proper markdown format: [link text](url).\n"
        "You have access to detailed farmer data including profile, livestock, crops, schedule, market listings, chat history, and documents.\n"
        "Use all available context to answer the user's question in a helpful, detailed, and friendly way.\n"
        "If the user asks about schedule, use calendarEvents.\n"
        "If the user asks about crops, livestock, or market, use those sections.\n"
        "Always use memory to be aware of previous questions and answers.\n"
        "If the user asks about their previous questions, answers, or wants to elaborate on a previous point (e.g., 'what was my last question?' or 'elaborate more on 2nd point'), use the chat history to answer accurately and reference the relevant part of the conversation.\n"
        "The chat history will be provided as a numbered list of exchanges. When the user refers to 'point 3' or 'previous question', use the numbered chat history to resolve the reference and answer accordingly.\n"
        "Proactively ask a relevant follow-up question at the end of your answer.\n"
        "Format your answer with clear sections, bullet points, and markdown (including links if available, always using [text](url) format).\n"
        "If you don't know something, say so, but try to be as helpful as possible.\n"
        "The language of the answer must be: {question_language}.\n"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "User question: {user_query}\n\nContext:\n{context_text}\n\nChat history (numbered list):\n{chat_history}\n"),
    ])
    memory = memory or ConversationBufferMemory(return_messages=True)
    chain = prompt | model | StrOutputParser()
    response = chain.invoke({
        "user_query": user_query,
        "context_text": context_text,
        "chat_history": formatted_history,
        "question_language": question_language
    })
    memory.save_context({"input": user_query}, {"output": response})
    return {
        "response": response,
        "memory": memory.buffer,
        "context": context
    } 
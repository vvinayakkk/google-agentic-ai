import os
import numpy as np
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain_core.output_parsers import StrOutputParser
from sentence_transformers import SentenceTransformer
from utils.firestore_vector_search import search_farmers_by_vector
import langdetect
from langchain_core.messages import HumanMessage
import base64
import re
from services.firebase import db

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

def get_market_soil_weather_context(query_embedding):
    context = {}
    for collection in ['market_data', 'soil_data', 'weather_data']:
        doc = db.collection(collection).document('latest').get()
        if doc.exists:
            doc_data = doc.to_dict()
            embedding = doc_data.get('embedding')
            data = doc_data.get('data')
            if embedding:
                sim = np.dot(query_embedding, embedding) / (np.linalg.norm(query_embedding) * np.linalg.norm(embedding))
                context[collection] = {'similarity': sim, 'data': data}
    return context

def extract_gemini_content(response):
    # Handles both string and list content from Gemini, including AIMessage objects
    # If response is an AIMessage, extract its 'content' attribute
    if hasattr(response, "content"):
        content = response.content
    else:
        content = response
    # If content is an AIMessage (from Gemini), extract its 'content' attribute
    if hasattr(content, "content"):
        content = content.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        result = []
        for c in content:
            if isinstance(c, str):
                result.append(c)
            elif isinstance(c, dict) and "text" in c and isinstance(c["text"], str):
                result.append(c["text"])
            elif (
                isinstance(c, tuple)
                and len(c) == 2
                and c[0] == "content"
                and isinstance(c[1], str)
            ):
                result.append(c[1])
        return "".join(result)
    return str(content)

def generate_rag_response(user_query, chat_history=None, section=None, top_k=2, memory=None, image=None):
    multimodal_message = None
    if image:
        # Determine if image['uri'] is a data URL or a file path
        uri = image.get('uri')
        if uri and uri.startswith('data:image/'):
            image_url = uri
        elif uri and re.match(r'^file:/+', uri):
            # Convert file URI to local path
            local_path = re.sub(r'^file:/+', '/', uri)
            with open(local_path, 'rb') as f:
                encoded = base64.b64encode(f.read()).decode('utf-8')
            # Guess mime type from extension
            ext = local_path.split('.')[-1].lower()
            mime = 'jpeg' if ext in ['jpg', 'jpeg'] else ext
            image_url = f"data:image/{mime};base64,{encoded}"
        else:
            image_url = None
        if image_url:
            multimodal_message = HumanMessage(
                content=[
                    {"type": "text", "text": user_query},
                    {"type": "image_url", "image_url": image_url},
                ]
            )
    query_embedding = embed_query(user_query)
    context = build_rich_context(user_query, top_k=top_k)
    context_text = context_to_prompt(context)
    msw_context = get_market_soil_weather_context(query_embedding)
    msw_prompt = ''
    for k, v in msw_context.items():
        safe_data = str(v['data']).replace('{', '{{').replace('}', '}}')
        msw_prompt += f"\n[{k.upper()} CONTEXT] (similarity: {v['similarity']:.2f}):\n{safe_data[:2000]}\n"  # limit to 2000 chars for brevity
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
        "You are Kissan AI, a friendly voice assistant for farmers. You're having a natural conversation through speech.\n"
        "IMPORTANT VOICE GUIDELINES:\n"
        "- Keep responses SHORT and CONVERSATIONAL (2-3 sentences max)\n"
        "- Speak like a helpful friend, not a formal report\n"
        "- Use simple, everyday language that's easy to understand when spoken\n"
        "- NO bullet points, lists, or complex formatting in voice responses\n"
        "- NO links or URLs in speech - just mention 'you can find more info on the government website'\n"
        "- Answer directly without long introductions\n"
        "- End with a simple follow-up question to keep conversation flowing\n\n"
        "LANGUAGE MATCHING:\n"
        "ALWAYS answer in the SAME LANGUAGE as the user's question.\n"
        "If question is in English, answer in English. If in Hindi, answer in Hindi. If in Marathi, answer in Marathi.\n\n"
        "CONVERSATION STYLE EXAMPLES:\n"
        "❌ BAD (too formal/long): 'Based on the agricultural data and weather patterns, I recommend implementing the following irrigation strategies: 1. Schedule watering sessions during early morning hours between 5-7 AM...'\n"
        "✅ GOOD (conversational): 'Water your crops early morning around 6 AM when it's cooler. This saves water and helps plants absorb better. What type of crop are you growing?'\n\n"
        "❌ BAD: 'Here are the market prices: • Wheat: ₹2,200 per quintal • Rice: ₹1,800 per quintal • Onion: ₹2,500 per quintal based on today's data from multiple markets...'\n"
        "✅ GOOD: 'Wheat is going for around ₹2,200 per quintal today, which is pretty good. Are you planning to sell soon?'\n\n"
        "Use chat history to remember context but keep responses brief and natural.\n"
        "The language of the answer must match: {question_language}.\n"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "User question: {user_query}\n\nContext:\n{context_text}\n" + msw_prompt + "\nChat history (numbered list):\n{chat_history}\n"),
    ])
    memory = memory or ConversationBufferMemory(return_messages=True)
    try:
        if multimodal_message:
            response = model.invoke([multimodal_message])
            print("image output:", response)
        else:
            chain = prompt | model | StrOutputParser()
            response = chain.invoke({
                "user_query": user_query,
                "context_text": context_text,
                "chat_history": formatted_history,
                "question_language": question_language
            })
            print("text output:", response)
        # Always extract content as string
        content = extract_gemini_content(response)
        try:
            memory.save_context({"input": user_query}, {"output": content})
        except Exception as e:
            print("Memory save error:", e)
        return {
            "response": content,
            "memory": memory.buffer,
            "context": context
        }
    except Exception as e:
        print("RAG error:", e)
        return {
            "response": f"Sorry, there was an error processing your request: {e}",
            "memory": "",
            "context": {}
        } 
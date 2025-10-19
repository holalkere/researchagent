import os
from dotenv import load_dotenv

# Clear environment and load from .env
os.environ.pop('OPENAI_API_KEY', None)
load_dotenv()

api_key = os.getenv('OPENAI_API_KEY')
print(f'API Key: {api_key[:20]}...' if api_key else 'No API key found')
print(f'Length: {len(api_key) if api_key else 0}')
print(f'Starts with sk-: {api_key.startswith("sk-") if api_key else False}')

# Test the API key
try:
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model='gpt-3.5-turbo',
        messages=[{'role': 'user', 'content': 'Hello'}],
        max_tokens=5
    )
    print('API key works!')
    print(f'Response: {response.choices[0].message.content}')
except Exception as e:
    print(f'API key error: {e}')

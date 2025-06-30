from omnidimension import Client

# Initialize client
client = Client("PMW7Wrji17G18BBQx-xw716L4XgLgP-Se1balR7gSzk")

# Create an agent
response = client.agent.create(
    name="AskSupplyBot Agent",
    welcome_message="""Hello! I'm AskSupplyBot, your AI-powered supply chain assistant. How can I help you today?""",
    context_breakdown=[
        {
            "title": "Purpose",
            "body": """This agent helps users with supply chain inquiries, including route optimization, compliance checks, and inventory management.""",
            "is_enabled": True
        }
    ],
    transcriber={
        "provider": "deepgram_stream",
        "silence_timeout_ms": 400,
        "model": "nova-3",
        "numerals": True,
        "punctuate": True,
        "smart_format": False,
        "diarize": False
    },
    model={
        "model": "gpt-4o-mini",
        "temperature": 0.7
    },
    voice={
        "provider": "eleven_labs",
        "voice_id": "O4cGUVdAocn0z4EpQ9yF"
    },
)

print(f"Status: {response['status']}")
print(f"Created Agent: {response['json']}")

# Store the agent ID
agent_id = response['json'].get('id')

# Send a message to the agent
user_message = "Tell me about supply chain"
chat_response = client.send_message(
    agent_id=agent_id,
    message=user_message
)

print(f"\nUser: {user_message}")
print(f"Agent: {chat_response.get('reply')}")

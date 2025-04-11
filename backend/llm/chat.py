PROMPT = """
You are an expert assistant designed to help investigators analyze and query the contents of an interview. 
You have access to the full transcript of the interview as well as a summary of the interview. 
Your role is to assist investigators by answering their questions based on the provided information. 
If investigators request, you can refine the summary to highlight the most relevant and important details, 
always referring to the most recent version of the interview's summary.
"""

class Chat:
    
    def __init__(self, gpt_client):
        self.gpt_client = gpt_client
        self.messages = []
        self.messages.append({"role": "system", "content": PROMPT})
        
    def add_message(self, role, content):
        """Add a message to the chat history."""
        self.messages.append({"role": role, "content": content})
        
    def add_stream_message(self, role, content):
        """Append the content to the existing content of the latest message."""
        if self.messages and self.messages[-1]["role"] == role:
            self.messages[-1]["content"] += content
        else:
            self.add_message(role, content)
        
    def clear(self):
        """Clear the chat history."""
        self.messages = []
        
    def get_response(self):
        """Get the response from the chat model."""
        response = self.gpt_client.chat.completions.create(
            model="gpt-4o",
            messages=self.messages,
        )
        content = response.choices[0].message.content
        return content
    
    def stream_response(self):
        """Stream the response from the chat model."""
        response = self.gpt_client.chat.completions.create(
            model="gpt-4o",
            messages=self.messages,
            stream=True,
        )
        for chunk in response:
            if not chunk or not hasattr(chunk, "choices") or len(chunk.choices) == 0:
                continue  # skip invalid or empty chunks

            delta = getattr(chunk.choices[0].delta, "content", "") or ""
            yield delta
                
    def get_chat_history(self):
        """Get the chat history."""
        return self.messages
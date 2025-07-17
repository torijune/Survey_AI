from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv
from pydantic import SecretStr

load_dotenv()


class OpenAIClient:
    """OpenAI LLM 클라이언트"""
    
    def __init__(self, model: str = "gpt-4o-mini", temperature: float = 0.3):
        self.llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=SecretStr(os.getenv("OPENAI_API_KEY"))
        )
    
    async def call(self, messages: List[Dict[str, str]], model: str = "gpt-4o-mini", temperature: float = 0.3) -> str:
        """OpenAI API 호출"""
        try:
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
                else:
                    langchain_messages.append(HumanMessage(content=msg["content"]))
            
            response = await self.llm.ainvoke(langchain_messages)
            return response.content.strip()
        except Exception as e:
            raise Exception(f"OpenAI API 호출 실패: {str(e)}") 
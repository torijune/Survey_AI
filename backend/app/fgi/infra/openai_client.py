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
        self.default_model = model
        self.default_temperature = temperature
    
    async def call(self, messages: list[dict[str, str]], model: str = "gpt-4o-mini", temperature: float = 0.3) -> str:
        """OpenAI API 호출"""
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            from pydantic import SecretStr
            import os
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
                else:
                    langchain_messages.append(HumanMessage(content=msg["content"]))
            # model, temperature 파라미터를 우선 사용, 없으면 기본값 사용
            llm = ChatOpenAI(
                model=model or self.default_model,
                temperature=temperature if temperature is not None else self.default_temperature,
                api_key=SecretStr(os.getenv("OPENAI_API_KEY") or "")
            )
            response = await llm.ainvoke(langchain_messages)
            # response.content가 string임을 보장
            return str(response.content).strip()
        except Exception as e:
            raise Exception(f"OpenAI API 호출 실패: {str(e)}") 
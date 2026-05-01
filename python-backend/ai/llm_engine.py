import json
import os
from typing import Optional
from loguru import logger

# Common rules for all host styles
_COMMON_RULES = """
重要规则：
- 只输出纯口播文字，不要输出任何动作、情绪、表情描述
- 禁止使用括号描述动作或情绪，如（轻笑着）（微笑着）（叹了口气）（温柔地说）等
- 禁止使用 *动作* 或 [动作] 等任何形式的动作标注
- 你是在对听众说话，不是在写剧本，不需要舞台指示

歌曲推荐规则（仅限 chat_response 场景）：
- 仔细感知听众的情绪状态，从文字中判断是否情绪低落、焦虑、疲惫、孤独或难过
- 只有当听众明显情绪不好时，才推荐歌曲。普通聊天、打招呼、闲聊、问问题时不要推荐
- 推荐歌曲时，从本地曲库列表中选择一首契合听众当下情绪的歌曲
- 推荐格式：在回应末尾加上 [推荐:歌曲名称]，例如：[推荐:晴天]
- 如果没有本地曲库列表，或者曲库为空，不要推荐歌曲
- 推荐歌曲时，先用温暖的话语回应听众，再自然地引出推荐，不要生硬地说"我给你推荐一首歌"
"""

# Host personality presets
HOST_PRESETS = {
    "warm": {
        "name": "DJ Butterfly",
        "system_prompt": """你是一个温暖治愈的电台主播，名叫 DJ Butterfly。
你的特点是：
- 说话温柔亲切，像老朋友聊天一样自然
- 善于发现歌曲背后的故事和情感
- 会结合当前时间、天气等环境信息来营造氛围
- 偶尔分享一些生活感悟和正能量语句
- 每次口播控制在 2-4 句话，简洁有温度
- 不使用 emoji，用纯文字表达情感

你的职责：
- 在歌曲播放间隙进行口播，介绍下一首歌或点评上一首歌
- 回应听众的留言和点歌请求
- 营造轻松舒适的收听氛围""" + _COMMON_RULES,
    },
    "rock": {
        "name": "DJ Thunder",
        "system_prompt": """你是一个热血摇滚风格的电台主播，名叫 DJ Thunder。
你的特点是：
- 说话充满激情和能量，像摇滚乐手一样热血
- 对音乐有独到见解，能精准点评歌曲的编曲和演奏
- 用词大胆直接，偶尔用一些摇滚圈的俚语
- 每次口播 2-3 句话，干脆有力
- 不使用 emoji，用文字的力量感表达

你的职责：
- 用充满激情的方式介绍歌曲
- 点评歌曲的音乐性和感染力
- 点燃听众的热情""" + _COMMON_RULES,
    },
    "literary": {
        "name": "DJ 诗意",
        "system_prompt": """你是一个文艺诗意的电台主播，名叫 DJ 诗意。
你的特点是：
- 说话如诗如画，善于用优美的文字描绘意境
- 对歌词和旋律有细腻的感受力
- 善于引用诗句、文学典故来诠释音乐
- 每次口播 3-5 句话，有节奏感和韵律感
- 不使用 emoji，用纯粹的文字之美

你的职责：
- 用诗意的语言引入每一首歌
- 将音乐与文学、艺术联系起来
- 营造沉浸式的文艺收听体验""" + _COMMON_RULES,
    },
    "news": {
        "name": "DJ 资讯",
        "system_prompt": """你是一个资讯风格的电台主播，名叫 DJ 资讯。
你的特点是：
- 说话简洁专业，像新闻主播一样清晰
- 善于提供与歌曲相关的音乐知识、歌手背景、行业资讯
- 信息量大但不冗余，每句话都有价值
- 每次口播 2-4 句话，节奏明快
- 不使用 emoji，保持专业感

你的职责：
- 提供歌曲的背景信息和音乐知识
- 介绍歌手/乐队的故事
- 分享音乐行业的有趣资讯""" + _COMMON_RULES,
    },
    "cure": {
        "name": "DJ 小确幸",
        "system_prompt": """你是一个治愈系的电台主播，名叫 DJ 小确幸。
你的特点是：
- 说话软萌可爱，让人感到放松和幸福
- 善于用温暖的话语治愈听众的心灵
- 会聊一些日常小事、美食、天气等轻松话题
- 每次口播 2-4 句话，节奏舒缓
- 不使用 emoji，用语气词和拟声词传达可爱感

你的职责：
- 用治愈的语气引入歌曲
- 给听众带来温暖和好心情
- 营造像在家一样舒适的收听氛围""" + _COMMON_RULES,
    },
}

# Commentary generation templates
COMMENTARY_TEMPLATES = {
    "song_intro": "请为即将播放的歌曲写一段简短的电台口播引入。歌曲信息：{song_info}。当前时间：{time}。",
    "song_review": "请为刚播放完的歌曲写一段简短的点评。歌曲信息：{song_info}。",
    "song_request": "听众「{user}」点了一首歌：{song_name}。请写一段口播回应这个点歌请求。",
    "greeting": "现在是{time}，请写一段开场问候语，欢迎听众收听。",
    "chat_response": "听众「{user}」说：「{message}」。请以电台主播的身份简短回应。\n\n本地曲库歌曲列表：\n{song_queue}",
}


# OpenAI-compatible API providers
API_PROVIDERS = {
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-v4-flash",
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com",
        "model": "gpt-4o-mini",
    },
    "ollama": {
        "name": "Ollama (本地)",
        "base_url": "http://localhost:11434",
        "model": "qwen2.5:7b",
    },
    "custom": {
        "name": "自定义",
        "base_url": "",
        "model": "",
    },
}


class LLMEngine:
    """
    LLM engine for generating AI host commentary.
    Supports local models (llama-cpp) and OpenAI-compatible cloud APIs.
    """

    def __init__(self):
        self._mode = "local_lightweight"  # local_lightweight, local_highquality, cloud_api
        self._host_style = "warm"
        self._llm = None
        self._cloud_client = None
        self._api_key = ""
        self._api_provider = "deepseek"
        self._base_url = ""
        self._model = ""

    def set_mode(self, mode: str):
        """Set the AI mode."""
        self._mode = mode
        logger.info(f"LLM mode set to: {mode}")

    def set_host_style(self, style: str):
        """Set the host personality style."""
        if style in HOST_PRESETS:
            self._host_style = style
            logger.info(f"Host style set to: {style}")

    def set_cloud_config(self, provider: str = None, api_key: str = None, base_url: str = None, model: str = None):
        """Configure cloud API settings. Reads from args, then env, then defaults."""
        if provider:
            self._api_provider = provider

        self._api_key = api_key or os.environ.get("DEEPSEEK_API_KEY", "") or os.environ.get("LLM_API_KEY", "")

        provider_conf = API_PROVIDERS.get(self._api_provider, API_PROVIDERS["deepseek"])
        self._base_url = base_url or os.environ.get("LLM_BASE_URL", "") or provider_conf["base_url"]
        self._model = model or os.environ.get("LLM_MODEL", "") or provider_conf["model"]

    def get_host_info(self) -> dict:
        """Get current host personality info."""
        preset = HOST_PRESETS.get(self._host_style, HOST_PRESETS["warm"])
        return {"name": preset["name"], "style": self._host_style}

    def get_status(self) -> dict:
        """Get current LLM engine status for UI display."""
        has_key = bool(self._api_key)
        return {
            "mode": self._mode,
            "provider": self._api_provider,
            "model": self._model,
            "base_url": self._base_url,
            "has_api_key": has_key,
            "ready": has_key or self._llm is not None,
        }

    def _get_system_prompt(self) -> str:
        """Get the system prompt for current host style."""
        preset = HOST_PRESETS.get(self._host_style, HOST_PRESETS["warm"])
        return preset["system_prompt"]

    async def initialize(self):
        """Initialize the LLM based on current mode."""
        # Only auto-detect from env if no API key is already configured
        if not self._api_key:
            self.set_cloud_config()

        if self._mode in ("local_lightweight", "local_highquality"):
            await self._init_local_model()
        elif self._mode == "cloud_api":
            self._init_cloud_client()

        if self._api_key:
            logger.info(f"LLM engine initialized: provider={self._api_provider}, model={self._model}, base_url={self._base_url}")
        else:
            logger.info("LLM engine initialized: no API key configured, using fallback templates")

    async def _init_local_model(self):
        """Initialize local LLM model."""
        try:
            # from llama_cpp import Llama
            # model_path = self._get_model_path()
            # self._llm = Llama(model_path=model_path, n_ctx=2048, n_threads=4)
            logger.info("Local LLM model placeholder — will be loaded when model files are available")
        except ImportError:
            logger.warning("llama-cpp-python not installed, local LLM unavailable")
        except Exception as e:
            logger.error(f"Failed to load local LLM: {e}")

    def _init_cloud_client(self):
        """Initialize cloud API client."""
        try:
            import httpx
            self._cloud_client = httpx.AsyncClient(timeout=30.0)
            logger.info(f"Cloud API client initialized (provider={self._api_provider})")
        except Exception as e:
            logger.error(f"Failed to init cloud client: {e}")

    async def generate_commentary(
        self,
        context: str,
        song_info: dict = None,
        user_message: str = None,
        user_name: str = "听众",
        song_queue: list = None,
    ) -> str:
        """
        Generate AI host commentary.
        context: one of song_intro, song_review, song_request, greeting, chat_response
        """
        system_prompt = self._get_system_prompt()

        # Build user prompt from template
        from datetime import datetime
        now = datetime.now().strftime("%H:%M")

        # Format song queue for the prompt
        queue_text = ""
        if song_queue:
            queue_text = "\n".join(f"- {s['title']} - {s['artist']}" for s in song_queue[:50])
        else:
            queue_text = "（无歌曲）"

        template = COMMENTARY_TEMPLATES.get(context, "")
        user_prompt = template.format(
            song_info=json.dumps(song_info, ensure_ascii=False) if song_info else "",
            time=now,
            user=user_name,
            message=user_message or "",
            song_name=song_info.get("title", "") if song_info else "",
            song_queue=queue_text,
        )

        # Try cloud API first if key is configured
        if self._api_key and self._base_url:
            result = await self._call_openai_compatible(system_prompt, user_prompt)
            if result:
                return result

        # Try local model
        if self._llm:
            return await self._generate_local(system_prompt, user_prompt)

        # Fallback: template-based response
        return self._fallback_commentary(context, song_info, user_name)

    async def _generate_local(self, system_prompt: str, user_prompt: str) -> str:
        """Generate text using local LLM."""
        try:
            # response = self._llm.create_chat_completion(
            #     messages=[
            #         {"role": "system", "content": system_prompt},
            #         {"role": "user", "content": user_prompt},
            #     ],
            #     max_tokens=256,
            #     temperature=0.8,
            # )
            # return response["choices"][0]["message"]["content"]
            return self._fallback_commentary("song_intro", None, "听众")
        except Exception as e:
            logger.error(f"Local LLM generation failed: {e}")
            return self._fallback_commentary("song_intro", None, "听众")

    async def _call_openai_compatible(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Call any OpenAI-compatible API (DeepSeek, Ollama, etc.)."""
        import httpx

        url = f"{self._base_url.rstrip('/')}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 300,
            "temperature": 0.85,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                logger.info(f"LLM API response ({self._api_provider}): {content[:80]}...")
                return content
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API HTTP error {e.response.status_code}: {e.response.text[:200]}")
        except httpx.ConnectError:
            logger.error(f"LLM API connection failed: {self._base_url}")
        except Exception as e:
            logger.error(f"LLM API call failed: {e}")

        return None

    async def stream_commentary(
        self,
        context: str,
        song_info: dict = None,
        user_message: str = None,
        user_name: str = "听众",
        song_queue: list = None,
    ):
        """
        Stream AI commentary token by token.
        Yields: (chunk_text: str, full_text_so_far: str)
        """
        system_prompt = self._get_system_prompt()

        from datetime import datetime
        now = datetime.now().strftime("%H:%M")

        # Format song queue for the prompt
        queue_text = ""
        if song_queue:
            queue_text = "\n".join(f"- {s['title']} - {s['artist']}" for s in song_queue[:50])
        else:
            queue_text = "（无歌曲）"

        template = COMMENTARY_TEMPLATES.get(context, "")
        user_prompt = template.format(
            song_info=json.dumps(song_info, ensure_ascii=False) if song_info else "",
            time=now,
            user=user_name,
            message=user_message or "",
            song_name=song_info.get("title", "") if song_info else "",
            song_queue=queue_text,
        )

        if self._api_key and self._base_url:
            async for chunk, full_text in self._stream_openai_compatible(system_prompt, user_prompt):
                yield chunk, full_text
            return

        # Fallback: yield full text at once
        text = self._fallback_commentary(context, song_info, user_name)
        yield text, text

    async def _stream_openai_compatible(self, system_prompt: str, user_prompt: str):
        """Stream from any OpenAI-compatible API. Yields (chunk, full_text)."""
        import httpx
        import json as _json

        url = f"{self._base_url.rstrip('/')}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 300,
            "temperature": 0.85,
            "stream": True,
        }

        full_text = ""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = _json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                full_text += content
                                yield content, full_text
                        except (_json.JSONDecodeError, KeyError, IndexError):
                            continue
            logger.info(f"LLM stream complete ({self._api_provider}): {full_text[:80]}...")
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM stream HTTP error {e.response.status_code}: {e.response.text[:200]}")
        except httpx.ConnectError:
            logger.error(f"LLM stream connection failed: {self._base_url}")
        except Exception as e:
            logger.error(f"LLM stream failed: {e}")

    def _fallback_commentary(self, context: str, song_info: dict = None, user_name: str = "听众") -> str:
        """Fallback template-based commentary when LLM is unavailable."""
        import random
        from datetime import datetime
        now = datetime.now()
        hour = now.hour

        if context == "greeting":
            if hour < 6:
                return "夜深了，感谢你在这个安静的时刻选择 Butterfly Radio。让音乐陪你度过这个夜晚。"
            elif hour < 12:
                return "早上好，欢迎收听 Butterfly Radio。新的一天，从一首好歌开始。"
            elif hour < 18:
                return "下午好，这里是 Butterfly Radio。让我用音乐陪你度过这个午后。"
            else:
                return "晚上好，欢迎来到 Butterfly Radio。忙碌了一天，放松下来听听歌吧。"

        if context in ("song_intro", "song_review") and song_info:
            title = song_info.get("title", "这首歌曲")
            artist = song_info.get("artist", "这位艺术家")
            intros = [
                f"接下来为你带来 {artist} 的 {title}，静静聆听。",
                f"下一首，{title}。来自 {artist}，希望你喜欢。",
                f"现在播放的是 {artist} 的作品，{title}。让旋律带你去远方。",
                f"这首歌是 {title}，{artist} 演绎。每一个音符都值得细细品味。",
            ]
            return random.choice(intros)

        if context == "song_request":
            title = song_info.get("title", "这首歌") if song_info else "这首歌"
            return f"收到 {user_name} 的点歌，为你播放 {title}。感谢你的分享。"

        if context == "chat_response":
            responses = [
                f"谢谢 {user_name} 的留言，很高兴听到你的声音。",
                f"{user_name} 说得好，音乐就是有这样的力量。",
                f"收到，{user_name}。让我们继续享受音乐。",
            ]
            return random.choice(responses)

        return "这里是 Butterfly Radio，让音乐继续。"


# Singleton
llm_engine = LLMEngine()

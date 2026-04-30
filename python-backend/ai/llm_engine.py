import json
from typing import Optional
from loguru import logger

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
- 营造轻松舒适的收听氛围""",
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
- 点燃听众的热情""",
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
- 营造沉浸式的文艺收听体验""",
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
- 分享音乐行业的有趣资讯""",
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
- 营造像在家一样舒适的收听氛围""",
    },
}

# Commentary generation templates
COMMENTARY_TEMPLATES = {
    "song_intro": "请为即将播放的歌曲写一段简短的电台口播引入。歌曲信息：{song_info}。当前时间：{time}。",
    "song_review": "请为刚播放完的歌曲写一段简短的点评。歌曲信息：{song_info}。",
    "song_request": "听众「{user}」点了一首歌：{song_name}。请写一段口播回应这个点歌请求。",
    "greeting": "现在是{time}，请写一段开场问候语，欢迎听众收听。",
    "chat_response": "听众「{user}」说：「{message}」。请以电台主播的身份简短回应。",
}


class LLMEngine:
    """
    LLM engine for generating AI host commentary.
    Supports local models (llama-cpp) and cloud APIs.
    """

    def __init__(self):
        self._mode = "local_lightweight"  # local_lightweight, local_highquality, cloud_api
        self._host_style = "warm"
        self._llm = None
        self._cloud_client = None
        self._api_key = ""
        self._api_provider = "doubao"

    def set_mode(self, mode: str):
        """Set the AI mode."""
        self._mode = mode
        logger.info(f"LLM mode set to: {mode}")

    def set_host_style(self, style: str):
        """Set the host personality style."""
        if style in HOST_PRESETS:
            self._host_style = style
            logger.info(f"Host style set to: {style}")

    def set_cloud_config(self, provider: str, api_key: str):
        """Configure cloud API settings."""
        self._api_provider = provider
        self._api_key = api_key

    def get_host_info(self) -> dict:
        """Get current host personality info."""
        preset = HOST_PRESETS.get(self._host_style, HOST_PRESETS["warm"])
        return {"name": preset["name"], "style": self._host_style}

    def _get_system_prompt(self) -> str:
        """Get the system prompt for current host style."""
        preset = HOST_PRESETS.get(self._host_style, HOST_PRESETS["warm"])
        return preset["system_prompt"]

    async def initialize(self):
        """Initialize the LLM based on current mode."""
        if self._mode in ("local_lightweight", "local_highquality"):
            await self._init_local_model()
        elif self._mode == "cloud_api":
            self._init_cloud_client()
        logger.info(f"LLM engine initialized (mode={self._mode})")

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
    ) -> str:
        """
        Generate AI host commentary.
        context: one of song_intro, song_review, song_request, greeting, chat_response
        """
        system_prompt = self._get_system_prompt()

        # Build user prompt from template
        from datetime import datetime
        now = datetime.now().strftime("%H:%M")

        template = COMMENTARY_TEMPLATES.get(context, "")
        user_prompt = template.format(
            song_info=json.dumps(song_info, ensure_ascii=False) if song_info else "",
            time=now,
            user=user_name,
            message=user_message or "",
            song_name=song_info.get("title", "") if song_info else "",
        )

        if self._mode == "cloud_api" and self._cloud_client and self._api_key:
            return await self._generate_cloud(system_prompt, user_prompt)
        elif self._llm:
            return await self._generate_local(system_prompt, user_prompt)
        else:
            # Fallback: return a template-based response
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

    async def _generate_cloud(self, system_prompt: str, user_prompt: str) -> str:
        """Generate text using cloud API."""
        try:
            if self._api_provider == "doubao":
                return await self._call_doubao(system_prompt, user_prompt)
            elif self._api_provider == "qwen":
                return await self._call_qwen(system_prompt, user_prompt)
        except Exception as e:
            logger.error(f"Cloud API call failed: {e}")
        return self._fallback_commentary("song_intro", None, "听众")

    async def _call_doubao(self, system_prompt: str, user_prompt: str) -> str:
        """Call Volcengine Doubao API."""
        # Placeholder — actual API call implementation
        logger.info("Doubao API call placeholder")
        return self._fallback_commentary("song_intro", None, "听众")

    async def _call_qwen(self, system_prompt: str, user_prompt: str) -> str:
        """Call Alibaba Qwen API."""
        # Placeholder — actual API call implementation
        logger.info("Qwen API call placeholder")
        return self._fallback_commentary("song_intro", None, "听众")

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

import unittest

from app.config.dashscope import dashscope_config
from app.infra.dashscope import DashScopeSynthesisRequest, DashScopeVoiceClient


class DashScopeVoiceClientTests(unittest.TestCase):
    def test_create_synthesis_request_uses_configured_defaults(self) -> None:
        client = DashScopeVoiceClient()

        request = client.create_synthesis_request(
            text=" 안녕하세요 ",
            voice_id=" voice-001 ",
        )

        self.assertIsInstance(request, DashScopeSynthesisRequest)
        self.assertEqual(request.text, "안녕하세요")
        self.assertEqual(request.voice_id, "voice-001")
        self.assertEqual(request.model, dashscope_config.tts_model)
        self.assertEqual(request.url, dashscope_config.tts_ws_url)
        self.assertEqual(request.response_format, "PCM_24000HZ_MONO_16BIT")
        self.assertEqual(request.mode, "server_commit")

    def test_create_synthesis_request_rejects_blank_text(self) -> None:
        client = DashScopeVoiceClient()

        with self.assertRaises(ValueError):
            client.create_synthesis_request(text="   ", voice_id="voice-001")

    def test_create_synthesis_request_rejects_blank_voice_id(self) -> None:
        client = DashScopeVoiceClient()

        with self.assertRaises(ValueError):
            client.create_synthesis_request(text="hello", voice_id="   ")


if __name__ == "__main__":
    unittest.main()

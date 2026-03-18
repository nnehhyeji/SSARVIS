import asyncio
import base64
import unittest
from unittest.mock import patch

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

    def test_resolve_audio_format_returns_enum_member(self) -> None:
        class FakeAudioFormat:
            PCM_24000HZ_MONO_16BIT = object()

        resolved = DashScopeVoiceClient._resolve_audio_format(
            FakeAudioFormat,
            "PCM_24000HZ_MONO_16BIT",
        )

        self.assertIs(resolved, FakeAudioFormat.PCM_24000HZ_MONO_16BIT)

    def test_resolve_audio_format_rejects_unknown_value(self) -> None:
        class FakeAudioFormat:
            PCM_24000HZ_MONO_16BIT = object()

        with self.assertRaises(ValueError):
            DashScopeVoiceClient._resolve_audio_format(
                FakeAudioFormat,
                "UNKNOWN",
            )


class DashScopeVoiceClientAsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_synthesize_yields_chunks(self) -> None:
        client = DashScopeVoiceClient()
        request = client.create_synthesis_request(text="hello", voice_id="voice-001")

        def fake_run(
            request,
            loop,
            queue,
            done_event,
            error_holder,
        ) -> None:
            loop.call_soon_threadsafe(queue.put_nowait, b"chunk-1")
            loop.call_soon_threadsafe(queue.put_nowait, b"chunk-2")
            loop.call_soon_threadsafe(done_event.set)
            loop.call_soon_threadsafe(queue.put_nowait, None)

        with patch.object(client, "_run_synthesis_session", side_effect=fake_run):
            chunks = [chunk async for chunk in client.synthesize(request)]

        self.assertEqual(chunks, [b"chunk-1", b"chunk-2"])

    async def test_synthesize_raises_runtime_error_from_worker(self) -> None:
        client = DashScopeVoiceClient()
        request = client.create_synthesis_request(text="hello", voice_id="voice-001")

        def fake_run(
            request,
            loop,
            queue,
            done_event,
            error_holder,
        ) -> None:
            error_holder["error"] = RuntimeError("boom")
            loop.call_soon_threadsafe(done_event.set)
            loop.call_soon_threadsafe(queue.put_nowait, None)

        with patch.object(client, "_run_synthesis_session", side_effect=fake_run):
            with self.assertRaises(RuntimeError):
                async for _ in client.synthesize(request):
                    pass

    async def test_handle_realtime_event_decodes_audio_delta(self) -> None:
        client = DashScopeVoiceClient()
        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        error_holder: dict[str, Exception] = {}
        finished = False

        def finish_stream() -> None:
            nonlocal finished
            finished = True

        loop = asyncio.get_running_loop()
        client._handle_realtime_event(
            response={
                "type": "response.audio.delta",
                "delta": base64.b64encode(b"pcm").decode("utf-8"),
            },
            loop=loop,
            queue=queue,
            finish_stream=finish_stream,
            error_holder=error_holder,
        )

        await asyncio.sleep(0)
        self.assertEqual(await queue.get(), b"pcm")
        self.assertEqual(error_holder, {})
        self.assertFalse(finished)

    async def test_handle_realtime_event_marks_invalid_delta_as_error(self) -> None:
        client = DashScopeVoiceClient()
        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        error_holder: dict[str, Exception] = {}
        finished = False

        def finish_stream() -> None:
            nonlocal finished
            finished = True

        loop = asyncio.get_running_loop()
        client._handle_realtime_event(
            response={"type": "response.audio.delta", "delta": "%%%"},
            loop=loop,
            queue=queue,
            finish_stream=finish_stream,
            error_holder=error_holder,
        )

        self.assertIn("error", error_holder)
        self.assertTrue(finished)


if __name__ == "__main__":
    unittest.main()

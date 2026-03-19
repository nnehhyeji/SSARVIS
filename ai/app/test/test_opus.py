import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.infra.opus import OpusEncoder


class OpusEncoderTests(unittest.TestCase):
    def test_encode_returns_packets_per_full_frame(self) -> None:
        fake_encoder = MagicMock()
        fake_encoder.encode.side_effect = [b"packet-1", b"packet-2"]
        fake_opuslib = SimpleNamespace(
            Encoder=MagicMock(return_value=fake_encoder),
            APPLICATION_VOIP="voip",
        )

        with patch("app.infra.opus._load_opus_library", return_value=fake_opuslib):
            encoder = OpusEncoder()
            packets = encoder.encode(b"\x01" * (encoder._bytes_per_frame * 2))

        self.assertEqual(packets, [b"packet-1", b"packet-2"])
        self.assertEqual(fake_encoder.encode.call_count, 2)

    def test_encode_buffers_partial_frame_until_next_chunk(self) -> None:
        fake_encoder = MagicMock()
        fake_encoder.encode.return_value = b"packet-1"
        fake_opuslib = SimpleNamespace(
            Encoder=MagicMock(return_value=fake_encoder),
            APPLICATION_VOIP="voip",
        )

        with patch("app.infra.opus._load_opus_library", return_value=fake_opuslib):
            encoder = OpusEncoder()
            first = encoder.encode(b"\x01" * (encoder._bytes_per_frame - 10))
            second = encoder.encode(b"\x02" * 10)

        self.assertEqual(first, [])
        self.assertEqual(second, [b"packet-1"])
        fake_encoder.encode.assert_called_once()

    def test_flush_pads_and_emits_last_packet(self) -> None:
        fake_encoder = MagicMock()
        fake_encoder.encode.return_value = b"packet-final"
        fake_opuslib = SimpleNamespace(
            Encoder=MagicMock(return_value=fake_encoder),
            APPLICATION_VOIP="voip",
        )

        with patch("app.infra.opus._load_opus_library", return_value=fake_opuslib):
            encoder = OpusEncoder()
            encoder.encode(b"\x01" * 10)
            packets = encoder.flush()

        self.assertEqual(packets, [b"packet-final"])
        fake_encoder.encode.assert_called_once()

    def test_flush_returns_empty_when_buffer_is_empty(self) -> None:
        fake_encoder = MagicMock()
        fake_opuslib = SimpleNamespace(
            Encoder=MagicMock(return_value=fake_encoder),
            APPLICATION_VOIP="voip",
        )

        with patch("app.infra.opus._load_opus_library", return_value=fake_opuslib):
            encoder = OpusEncoder()
            packets = encoder.flush()

        self.assertEqual(packets, [])
        fake_encoder.encode.assert_not_called()


if __name__ == "__main__":
    unittest.main()

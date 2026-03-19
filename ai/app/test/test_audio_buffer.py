import unittest

from app.infra.audio_buffer import PCMChunkCollector


class PCMChunkCollectorTests(unittest.TestCase):
    def test_append_accumulates_pcm_chunks(self) -> None:
        collector = PCMChunkCollector()

        collector.append(b"abc")
        collector.append(b"def")

        self.assertEqual(collector.to_bytes(), b"abcdef")
        self.assertEqual(len(collector), 6)
        self.assertTrue(collector)

    def test_append_ignores_empty_chunks(self) -> None:
        collector = PCMChunkCollector()

        collector.append(b"")
        collector.append(b"abc")
        collector.append(b"")

        self.assertEqual(collector.to_bytes(), b"abc")
        self.assertEqual(len(collector), 3)

    def test_extend_and_clear_manage_buffer_lifecycle(self) -> None:
        collector = PCMChunkCollector()

        collector.extend([b"a", b"b", b"c"])
        self.assertEqual(collector.to_bytes(), b"abc")

        collector.clear()
        self.assertEqual(collector.to_bytes(), b"")
        self.assertEqual(len(collector), 0)
        self.assertFalse(collector)


if __name__ == "__main__":
    unittest.main()

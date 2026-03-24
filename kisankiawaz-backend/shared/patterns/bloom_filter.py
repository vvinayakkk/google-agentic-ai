"""Probabilistic Bloom-filter for fast membership checks."""

import hashlib
import math
from functools import lru_cache


class BloomFilter:
    """Simple in-memory Bloom filter.

    Parameters
    ----------
    expected_items:
        Expected number of items to be inserted.
    false_positive_rate:
        Desired false-positive probability.
    """

    def __init__(self, expected_items: int, false_positive_rate: float) -> None:
        self._size = self._optimal_size(expected_items, false_positive_rate)
        self._hash_count = self._optimal_hashes(self._size, expected_items)
        self._bits = bytearray(self._size)

    # ── public API ───────────────────────────────────────────────

    def add(self, item: str) -> None:
        """Add *item* to the filter."""
        for idx in self._get_indices(item):
            self._bits[idx] = 1

    def __contains__(self, item: str) -> bool:
        """Return True if *item* **may** be in the set."""
        return all(self._bits[idx] for idx in self._get_indices(item))

    @property
    def size(self) -> int:
        return self._size

    @property
    def hash_count(self) -> int:
        return self._hash_count

    # ── internals ────────────────────────────────────────────────

    def _get_indices(self, item: str) -> list[int]:
        indices: list[int] = []
        for i in range(self._hash_count):
            digest = hashlib.sha256(f"{item}:{i}".encode()).hexdigest()
            indices.append(int(digest, 16) % self._size)
        return indices

    @staticmethod
    def _optimal_size(n: int, p: float) -> int:
        return max(1, int(-(n * math.log(p)) / (math.log(2) ** 2)))

    @staticmethod
    def _optimal_hashes(m: int, n: int) -> int:
        return max(1, int((m / n) * math.log(2)))


@lru_cache(maxsize=1)
def get_phone_bloom() -> BloomFilter:
    """Bloom filter sized for phone-number dedup (50 000 items, 0.1 % FPR)."""
    return BloomFilter(expected_items=50_000, false_positive_rate=0.001)


@lru_cache(maxsize=1)
def get_session_bloom() -> BloomFilter:
    """Bloom filter sized for session-ID dedup (100 000 items, 1 % FPR)."""
    return BloomFilter(expected_items=100_000, false_positive_rate=0.01)

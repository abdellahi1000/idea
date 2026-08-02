from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 20


@dataclass
class Page(Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int

    @property
    def total_pages(self) -> int:
        return max(1, (self.total + self.page_size - 1) // self.page_size)


def page_range(page: int, page_size: int) -> tuple[int, int]:
    """Returns the inclusive (start, end) row indices for Supabase's .range()."""
    start = (page - 1) * page_size
    end = start + page_size - 1
    return start, end

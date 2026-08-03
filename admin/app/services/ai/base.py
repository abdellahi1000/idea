"""Provider-agnostic contract for face verification.

Every AI provider (Luxand today, ArcFace/InsightFace/a custom model
tomorrow) implements this interface. Nothing outside this package should
ever import a concrete provider directly - always go through
`app.services.ai.get_face_verification_provider()` so swapping providers
never touches the rest of the application.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class VerificationResult:
    matched: bool
    confidence: float | None
    provider: str
    raw_response: dict


class FaceVerificationProvider(ABC):
    """Name of the provider, stored alongside enrollment/verification
    records so results from different providers are never compared."""

    name: str

    @abstractmethod
    def enroll(self, *, external_id: str, display_name: str, image_path: str) -> str:
        """Create a new person record from a first face image. Returns the
        provider's opaque person identifier."""

    @abstractmethod
    def add_sample(self, *, person_uuid: str, image_path: str) -> None:
        """Add an additional face sample to an already-enrolled person."""

    @abstractmethod
    def verify(self, *, person_uuid: str, image_path: str) -> VerificationResult:
        """Compare a new face image against the enrolled person."""

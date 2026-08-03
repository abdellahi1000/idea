"""Luxand Cloud Face Verification API client.

https://api.luxand.cloud - server-side only. The API token must never reach
the mobile app or the browser; it is read from the environment and used
exclusively from this Flask process.
"""

import os

import requests

from app.services.ai.base import FaceVerificationProvider, VerificationResult

LUXAND_BASE_URL = "https://api.luxand.cloud"
_REQUEST_TIMEOUT_SECONDS = 30


class LuxandApiError(RuntimeError):
    pass


def _token() -> str:
    token = os.environ.get("LUXAND_API_TOKEN")
    if not token:
        raise LuxandApiError(
            "Missing LUXAND_API_TOKEN environment variable. Copy .env.example to .env and fill it in."
        )
    return token


class LuxandFaceVerificationProvider(FaceVerificationProvider):
    name = "luxand"

    def add_person(self, name: str, image_path: str, collections: str = "") -> str:
        """POST /v2/person - enrolls a new person from their first face
        image and returns the Luxand person UUID."""
        with open(image_path, "rb") as photo:
            response = requests.post(
                f"{LUXAND_BASE_URL}/v2/person",
                headers={"token": _token()},
                data={"name": name, "store": "1", "collections": collections},
                files={"photos": photo},
                timeout=_REQUEST_TIMEOUT_SECONDS,
            )
        return _person_uuid_from_response(response)

    def add_face(self, person_uuid: str, image_path: str) -> None:
        """POST /v2/person/{uuid} - adds an additional face sample (front,
        left, right, different lighting, etc.) to improve accuracy."""
        with open(image_path, "rb") as photo:
            response = requests.post(
                f"{LUXAND_BASE_URL}/v2/person/{person_uuid}",
                headers={"token": _token()},
                data={"store": "1"},
                files={"photo": photo},
                timeout=_REQUEST_TIMEOUT_SECONDS,
            )
        _raise_for_error(response)

    def verify_person(self, person_uuid: str, image_path: str) -> dict:
        """POST /photo/verify/{uuid} - compares a new face image against
        the stored reference face(s) for that person."""
        with open(image_path, "rb") as photo:
            response = requests.post(
                f"{LUXAND_BASE_URL}/photo/verify/{person_uuid}",
                headers={"token": _token()},
                files={"photo": photo},
                timeout=_REQUEST_TIMEOUT_SECONDS,
            )
        _raise_for_error(response)
        return response.json()

    # --- FaceVerificationProvider interface -------------------------------

    def enroll(self, *, external_id: str, display_name: str, image_path: str) -> str:
        return self.add_person(display_name, image_path, collections=external_id)

    def add_sample(self, *, person_uuid: str, image_path: str) -> None:
        self.add_face(person_uuid, image_path)

    def verify(self, *, person_uuid: str, image_path: str) -> VerificationResult:
        result = self.verify_person(person_uuid, image_path)
        probability = result.get("probability")
        confidence = float(probability) if probability is not None else None
        matched = bool(result.get("status") == "success" and confidence is not None and confidence >= 0.85)
        return VerificationResult(matched=matched, confidence=confidence, provider=self.name, raw_response=result)


def _raise_for_error(response: requests.Response) -> None:
    if response.status_code >= 400:
        raise LuxandApiError(f"Luxand API error {response.status_code}: {response.text}")


def _person_uuid_from_response(response: requests.Response) -> str:
    _raise_for_error(response)
    body = response.json()
    person_uuid = body.get("uuid") if isinstance(body, dict) else None
    if not person_uuid:
        raise LuxandApiError(f"Luxand API did not return a person UUID: {body}")
    return person_uuid

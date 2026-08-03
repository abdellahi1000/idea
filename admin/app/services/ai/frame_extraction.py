"""Shared helper for pulling a still frame out of a First/Last Face ID
liveness video, since AI verification providers compare still images."""

import os
import tempfile
from pathlib import Path

import cv2


def extract_frame_to_jpg(video_bytes: bytes, out_path: Path) -> None:
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as video_file:
        video_file.write(video_bytes)
        video_path = video_file.name
    try:
        capture = cv2.VideoCapture(video_path)
        capture.set(cv2.CAP_PROP_POS_FRAMES, 5)
        ok, frame = capture.read()
        capture.release()
        if not ok:
            raise ValueError("Could not read a frame from the recorded video.")
        cv2.imwrite(str(out_path), frame)
    finally:
        os.unlink(video_path)

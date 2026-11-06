#!/usr/bin/env python3
"""Generate Rebuzzle's short, original, synthesized game cues with stdlib only."""

from __future__ import annotations

import math
import wave
from pathlib import Path


SAMPLE_RATE = 44_100
OUTPUT = Path(__file__).resolve().parents[1] / "Rebuzzle" / "Resources" / "Sounds"

# Each note is (frequency, start seconds, duration seconds, amplitude weight).
CUES: dict[str, tuple[float, list[tuple[float, float, float, float]]]] = {
    "hint": (
        0.58,
        [(659.25, 0.00, 0.38, 0.29), (987.77, 0.14, 0.32, 0.16)],
    ),
    "close": (
        0.78,
        [(392.00, 0.00, 0.50, 0.22), (523.25, 0.11, 0.48, 0.19), (659.25, 0.25, 0.44, 0.16)],
    ),
    "solve": (
        1.18,
        [(523.25, 0.00, 0.78, 0.20), (659.25, 0.10, 0.76, 0.18), (783.99, 0.22, 0.72, 0.16), (1046.50, 0.40, 0.68, 0.12)],
    ),
    "reward": (
        1.08,
        [(587.33, 0.00, 0.70, 0.17), (783.99, 0.10, 0.66, 0.17), (987.77, 0.23, 0.62, 0.15), (1174.66, 0.38, 0.55, 0.11)],
    ),
}


def synthesize(duration: float, notes: list[tuple[float, float, float, float]]) -> list[int]:
    frame_count = round(duration * SAMPLE_RATE)
    samples: list[int] = []
    for frame in range(frame_count):
        time = frame / SAMPLE_RATE
        value = 0.0
        for frequency, start, note_duration, weight in notes:
            local_time = time - start
            if not 0.0 <= local_time < note_duration:
                continue
            attack = min(1.0, local_time / 0.012)
            tail = min(1.0, (note_duration - local_time) / 0.09)
            envelope = attack * tail * math.exp(-3.0 * local_time)
            fundamental = math.sin(math.tau * frequency * local_time)
            second = math.sin(math.tau * frequency * 2.01 * local_time + 0.13)
            third = math.sin(math.tau * frequency * 3.98 * local_time + 0.31)
            value += weight * envelope * (fundamental + 0.23 * second + 0.07 * third)

        # Soft saturation limits peaks while preserving a rounded, gentle attack.
        value = math.tanh(value * 1.6) * 0.34
        samples.append(round(max(-1.0, min(1.0, value)) * 32_767))
    return samples


def write_wav(path: Path, samples: list[int]) -> None:
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        audio.writeframes(b"".join(sample.to_bytes(2, byteorder="little", signed=True) for sample in samples))


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (duration, notes) in CUES.items():
        path = OUTPUT / f"{name}.wav"
        write_wav(path, synthesize(duration, notes))
        print(f"Generated {path.name}: {duration:.2f}s, {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

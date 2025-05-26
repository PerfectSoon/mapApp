import math
from typing import Dict


def calculate_shannon(counts: Dict[str, int]) -> float:
    total = sum(counts.values())
    if total == 0:
        return 0.0
    H = 0.0
    for n in counts.values():
        p = n / total
        if p > 0:
            H -= p * math.log(p)
    return H
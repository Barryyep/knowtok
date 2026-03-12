#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from app.tasks.pipeline import backfill_semantic_scholar


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill Semantic Scholar metadata for existing papers.")
    parser.add_argument("--limit", type=int, default=None, help="Max papers to enrich in this run.")
    args = parser.parse_args()

    kwargs = {}
    if args.limit is not None:
        kwargs["limit"] = args.limit

    result = backfill_semantic_scholar.run(**kwargs)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

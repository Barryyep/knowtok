#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from app.tasks.pipeline import crawl_arxiv


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the worker pipeline inline.")
    parser.add_argument("--max-results", type=int, default=5, help="Maximum number of arXiv papers to fetch.")
    args = parser.parse_args()

    result = crawl_arxiv(max_results=args.max_results)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

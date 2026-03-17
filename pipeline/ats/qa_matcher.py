"""
Q&A Auto-Matcher
================
Matches questions discovered on a form against the application_qa.csv
knowledge base and returns pre-populated answers.

Called before filling any form — eliminates the need to manually look up
or relay answers for questions that have already been answered before.

Matching strategy (in order):
  1. Exact label match (fast, no API call)
  2. Substring / keyword match (fast, no API call)
  3. Claude Haiku semantic match (only for remaining unmatched questions)

Usage:
    from ats.qa_matcher import match_questions, format_unmatched_report

    # discovered_questions comes from DISCOVER_QUESTIONS_JS result:
    # [{"id": "question_123", "label": "Years of Python experience?", ...}, ...]

    matched, unmatched = match_questions(discovered_questions)
    # matched   → {"question_123": "7", ...}  — ready for fill_script(extra_fields=)
    # unmatched → [{"id": ..., "label": ...}] — needs Yury's input
"""

import csv
import os
import re
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

QA_FILE = Path(__file__).parent.parent.parent / "jobs" / "application_qa.csv"


# ── Load Q&A knowledge base ────────────────────────────────────────────────────

def _load_qa() -> list[dict]:
    """Load all answered questions from application_qa.csv."""
    if not QA_FILE.exists():
        return []
    with open(QA_FILE, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return [r for r in rows if r.get("Answer", "").strip()]


# ── Matching helpers ───────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower())).strip()


def _exact_match(label: str, qa_rows: list[dict]) -> dict | None:
    norm = _normalize(label)
    for row in qa_rows:
        if _normalize(row["Question"]) == norm:
            return row
    return None


_STOPWORDS = {
    # Articles / prepositions
    "the", "a", "an", "of", "in", "for", "and", "or", "at", "by", "to",
    "with", "from", "on", "as", "into", "about", "per",
    # Common verbs
    "is", "are", "do", "does", "have", "has", "was", "were", "be", "been",
    "will", "would", "can", "could", "should", "may", "might",
    # Pronouns
    "you", "your", "i", "my", "we", "our", "their", "its",
    # Question words
    "what", "how", "when", "where", "why", "which", "who", "whose",
    # Generic nouns that appear in nearly every application question
    "experience", "years", "many", "please", "describe", "provide",
    "tell", "us", "any", "this", "that", "if", "not", "no", "yes",
}


def _keyword_match(label: str, qa_rows: list[dict]) -> dict | None:
    """Return the best Q&A row where domain-specific words overlap."""
    norm_label = _normalize(label)
    label_words = set(norm_label.split()) - _STOPWORDS

    # Too few meaningful words after stripping — skip keyword matching
    if len(label_words) < 2:
        return None

    best_row, best_score = None, 0
    for row in qa_rows:
        norm_q = _normalize(row["Question"])
        q_words = set(norm_q.split()) - _STOPWORDS
        overlap = len(label_words & q_words)
        # Require overlap of at least half the label's meaningful words
        threshold = max(2, len(label_words) // 2)
        if overlap >= threshold and overlap > best_score:
            best_score = overlap
            best_row = row

    return best_row


def _semantic_match(labels: list[str], qa_rows: list[dict]) -> dict[str, dict | None]:
    """Use Claude Haiku to match remaining unmatched labels to Q&A rows."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or not labels:
        return {label: None for label in labels}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        qa_text = "\n".join(
            f"[{r['Question ID']}] {r['Question']}"
            for r in qa_rows
        )
        labels_text = "\n".join(f"- {label}" for label in labels)

        prompt = f"""Match each form question to the most relevant Q&A entry below.
Return a JSON object mapping each question exactly as given to the Q&A ID (e.g. "Q005"),
or null if no good match exists.

FORM QUESTIONS:
{labels_text}

Q&A KNOWLEDGE BASE:
{qa_text}

Return only valid JSON, no explanation. Example:
{{"Years of Python experience?": "Q002", "Cover letter": null}}"""

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        import json
        mapping = json.loads(raw)

        # Convert IDs back to full rows
        id_to_row = {r["Question ID"]: r for r in qa_rows}
        return {
            label: id_to_row.get(qid) if qid else None
            for label, qid in mapping.items()
        }
    except Exception:
        return {label: None for label in labels}


# ── Public API ─────────────────────────────────────────────────────────────────

def match_questions(
    discovered: list[dict[str, Any]],
) -> tuple[dict[str, str], list[dict[str, Any]]]:
    """
    Match a list of discovered form questions against the Q&A knowledge base.

    Args:
        discovered: List of question dicts from DISCOVER_QUESTIONS_JS or
                    DISCOVER_QUESTIONS_JS (Greenhouse). Each must have at
                    minimum {"id": str, "label": str}.

    Returns:
        matched:   {element_id: answer_text} — ready for fill_script(extra_fields=)
        unmatched: list of original question dicts with no answer found
    """
    qa_rows = _load_qa()
    matched: dict[str, str] = {}
    unmatched: list[dict] = []
    needs_semantic: list[dict] = []

    for q in discovered:
        label = (q.get("label") or "").strip()
        qid   = q.get("id", "")

        if not label or not qid:
            continue

        # Skip purely visual/layout elements
        if not label or len(label) < 3:
            unmatched.append(q)
            continue

        row = _exact_match(label, qa_rows) or _keyword_match(label, qa_rows)
        if row:
            matched[qid] = row["Answer"]
        else:
            needs_semantic.append(q)

    # Batch semantic matching for anything still unresolved
    if needs_semantic:
        labels = [q.get("label", "") for q in needs_semantic]
        semantic_results = _semantic_match(labels, qa_rows)
        for q in needs_semantic:
            label = q.get("label", "")
            row = semantic_results.get(label)
            if row:
                matched[q["id"]] = row["Answer"]
            else:
                unmatched.append(q)

    return matched, unmatched


def format_unmatched_report(unmatched: list[dict]) -> str:
    """
    Format unmatched questions as a human-readable list for escalation to the user.
    """
    if not unmatched:
        return "All questions matched from Q&A knowledge base."
    lines = [f"  [{i+1}] {q.get('label', q.get('id', '?'))}" for i, q in enumerate(unmatched)]
    return "Unanswered questions requiring input:\n" + "\n".join(lines)

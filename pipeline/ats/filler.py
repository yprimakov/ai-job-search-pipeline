"""
Batch Form Filler
=================
Generates a single JavaScript snippet that fills multiple text/textarea
fields at once via React's synthetic event system.

One javascript_tool call replaces ~20 individual fill-and-verify cycles.

Usage:
    from ats.filler import build_fill_script, DISCOVER_JS

    # Fill all standard fields in one shot
    js = build_fill_script({
        "first_name": "Yury",
        "email":      "yprimakov+jobs-anthropic@gmail.com",
        "question_13603703008": "yuryprimakov.com",
    })
    # → pass js to mcp__claude-in-chrome__javascript_tool

    # Discover all fillable fields on the current page
    # → pass DISCOVER_JS to javascript_tool, inspect results
"""

import json

# Core batch fill function — injected once, called with the field map.
# Supports: getElementById, querySelector[name=], querySelector[data-testid=],
# or any arbitrary CSS selector as the key.
_BATCH_FILL_FN = """\
function batchFill(fieldMap) {
    const results = {};
    for (const [selector, value] of Object.entries(fieldMap)) {
        const el = document.getElementById(selector)
                || document.querySelector('[name="' + selector + '"]')
                || document.querySelector('[data-testid="' + selector + '"]')
                || document.querySelector(selector);

        if (!el) { results[selector] = 'NOT_FOUND'; continue; }

        // Trigger React's synthetic event system via the internal setter
        const proto = el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;

        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur',   { bubbles: true }));
        results[selector] = 'OK';
    }
    return results;
}\
"""


def build_fill_script(field_map: dict[str, str]) -> str:
    """
    Generate a self-contained JS snippet that fills all fields in field_map.

    Args:
        field_map: {selector_or_id: value} — keys can be element IDs,
                   name attributes, data-testid values, or CSS selectors.

    Returns:
        JS string ready to pass to javascript_tool. The result of evaluating
        the script is {selector: 'OK' | 'NOT_FOUND'} for each key.
    """
    payload = json.dumps(field_map, ensure_ascii=False, indent=2)
    return f"{_BATCH_FILL_FN}\nbatchFill({payload});"


# Inject this to get a map of every fillable field on the page.
# Returns [{id, tag, type, label, currentValue}] — use to discover
# custom question IDs before building the field_map.
DISCOVER_JS = """\
(function() {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
        .filter(el => el.id || el.name)
        .map(el => {
            const label = document.querySelector('label[for="' + el.id + '"]');
            return {
                id:           el.id || null,
                name:         el.name || null,
                tag:          el.tagName.toLowerCase(),
                type:         el.type || null,
                label:        label ? label.innerText.trim() : null,
                currentValue: el.value || null,
            };
        });
    return inputs;
})()
"""

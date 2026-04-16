# Feishu Inline Comment Revision Workflow

Use this workflow when the user asks to revise a slide outline from a Feishu document link or document ID.

## Objective

Read the current outline, retrieve real inline comments when supported, and apply precise revisions without damaging unrelated sections.

## Workflow

### 1. Read the Current Outline

- Read the Feishu doc body first.
- Identify the chapter and section structure from headings.
- Capture the current wording around any area that may receive comments.

### 2. Retrieve Real Inline Comments

- First run `python3 scripts/detect_feishu_comment_capability.py` from the skill directory.
- If the script reports likely support, inspect the available `feishu-cli comment` help output and use the real comment commands exposed by the environment.
- Then run a real access check with `feishu-cli comment list <file_token> --type docx --output json`.
- Use the real Feishu comment-reading interface available in the current environment.
- Prefer real inline comments over summary notes or guessed edits.
- If the environment does not expose a comment retrieval command, stop and report the limitation clearly.
- If the command exists but returns `forbidden`, treat inline comment retrieval as unavailable for that document in the current environment.

Important: do not pretend comments were read when only the document body was read.

## Comment Processing Rules

Classify comments into three groups:

- Required changes: must be applied
- Suggested improvements: useful but not mandatory
- Conflicts or ambiguities: need user confirmation if they change strategy or meaning

For each comment, determine:

- which chapter or section it belongs to
- whether it is local or global
- what minimal edit resolves it

## Edit Scope Rules

Prefer the smallest edit that fully resolves the comment.

- change a phrase if the comment is wording-only
- add a key point if detail is missing
- split a section if the content is overloaded
- reorder chapters only if the problem is narrative or structural

Do not rewrite the entire outline because of one local comment.

## Writing Back to Feishu

- Update only the affected chapter or section whenever possible.
- Preserve heading structure so future comments remain anchored.
- Avoid full overwrite unless the user explicitly wants a total rebuild.

## Suggested Revision Summary Format

After revising, report the result in this format:

```md
## Revision Summary
- Applied:
  - [Comment or issue] -> [What changed]
- Deferred:
  - [Comment or issue] -> [Why deferred]
- Conflicts:
  - [Conflict] -> [Recommended resolution]
```

## Failure Message Pattern

If comment retrieval is unavailable, say something equivalent to:

"I successfully read the Feishu document body, but this environment does not currently expose a real inline comment retrieval command, so I cannot safely apply comment-based revisions yet. I did not guess or fabricate comment content."

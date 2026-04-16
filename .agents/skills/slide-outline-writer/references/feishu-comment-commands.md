# Feishu Comment Commands

This reference captures the real `feishu-cli` comment commands available in the current environment so the skill can use true inline comments instead of treating them as hypothetical.

## Supported Command Group

The local CLI exposes a `comment` command group with these subcommands:

- `list`
- `add`
- `get`
- `delete`
- `resolve`
- `unresolve`
- `reply list`
- `reply delete`

These commands support at least these file types via `--type`:

- `doc`
- `docx`
- `sheet`
- `bitable`

For slide-outline-writer, the primary target is usually `docx`.

## Most Important Commands for This Skill

### List comments on a Feishu document

```bash
feishu-cli comment list <file_token> --type docx --output json
```

Use this first when the user asks to revise an outline from Feishu comments.

### Get a single comment in detail

```bash
feishu-cli comment get <file_token> <comment_id> --type docx --output json
```

Use this when the list output is not detailed enough or when you need to inspect one comment deeply before editing.

### List replies to a comment

```bash
feishu-cli comment reply list <file_token> <comment_id> --type docx --output json
```

Use this when a comment thread contains follow-up clarification from reviewers.

### Mark a comment resolved after applying the revision

```bash
feishu-cli comment resolve <file_token> <comment_id> --type docx
```

Only do this if the user asked for comment status management or if the workflow explicitly includes resolving handled comments.

## Recommended Usage Pattern

When revising a Feishu outline from comments:

1. Read the document body.
2. Run `feishu-cli comment list <file_token> --type docx --output json`.
3. If needed, run `comment get` for important comments.
4. If needed, run `comment reply list` to capture clarifications.
5. Map comments to chapters or sections.
6. Update the relevant sections in Feishu incrementally.
7. Report what changed.
8. Resolve comments only if the user wants that workflow.

## Important Permission Note

Command discovery is not the same as usable access.

In testing, a real `docx` document body could be exported successfully while comment listing still failed with:

```text
code=1069303, msg=forbidden
```

This means the environment may support comment commands at the CLI level but still lack permission to read comments for a specific document or API scope.

Treat `comment list` as the real access check.

If it fails with `forbidden`:

- report that comment commands exist but comment access is not currently permitted for that document
- continue only with document-body-based work
- do not claim inline comments were read

## Practical Guidance

- Prefer JSON output for machine-readable parsing.
- Keep the original comment IDs in your notes so you can reference them in the revision summary.
- Do not delete comments or replies as part of normal revision.
- Do not mark comments resolved automatically unless the user expects that behavior.

## Safe Default

The safest default revision flow is:

- `comment list`
- optional `comment get`
- optional `comment reply list`
- update document body
- return a revision summary without resolving or deleting comments

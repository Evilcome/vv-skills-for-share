---
name: slide-outline-writer
description: Build strong outlines for slides or PPTs before design starts. Make sure to use this skill whenever the user asks for a slide outline, presentation structure, talk flow, PPT chaptering, story line, keynote agenda, training deck outline, speech structure, workshop flow, roadmap deck outline, investor deck outline, or wants to revise an existing outline based on Feishu document comments. This skill turns rough notes into a structured outline with chapter titles, section titles, and key points, publishes the final outline to Feishu, checks whether real inline comment retrieval is available, and revises the outline from true Feishu inline comments when supported.
---

# Slide Outline Writer

Create slide-ready outlines that are structured enough to generate a presentation later.

This skill is for the planning layer before slide design. It should produce a clear narrative arc, not a loose brainstorm dump.

## What This Skill Produces

The final deliverable is a structured outline for a slide deck or PPT with:

- a presentation title
- a short overall goal statement
- chapter-level headings
- section-level headings under each chapter
- key points for each section
- suggested slide count per chapter or section
- optional notes about visuals, proof points, or missing source material

The outline should be practical for later conversion into slides, HTML presentations, or PPT pages.

## Modes

Choose the mode based on the user's request.

### Mode A: Draft a New Outline

Use this when the user wants to create an outline from a topic, rough notes, or an unfinished structure.

### Mode B: Publish the Final Outline to Feishu

Use this when the user wants the approved outline written to a Feishu document.

### Mode C: Revise an Existing Outline from Feishu Inline Comments

Use this when the user gives a Feishu doc link or document ID and asks to update the outline based on real inline comments.

If the user is really asking for visual slide generation, deck styling, HTML slides, PPT conversion, or design-heavy output, hand off to `frontend-slides` after the outline is complete or tell the user that the next step is slide generation rather than outline planning.

## Core Working Style

- Build a strong story before polishing wording.
- Prefer a clear narrative progression over a flat list of topics.
- Keep each section scoped tightly enough that it can later map to 1-2 slides in most cases.
- If the user gives scattered material, reorganize it into a coherent argument instead of mirroring the source order.
- If there are gaps in evidence or examples, keep the structure moving and explicitly mark the missing material.

## Information to Gather

When the user is creating a new outline, gather the minimum information needed to avoid generic output.

Try to infer what you can from the conversation first. Ask only for what is still missing.

Key fields:

- presentation topic
- target audience
- context or use case: pitch, review, training, keynote, internal sync, roadmap, etc.
- desired outcome: persuade, align, teach, decide, inspire, report
- expected duration or rough deck length
- available source material: notes, docs, data, screenshots, prior decks
- preferred tone: executive, technical, educational, inspiring, sales, neutral

If some of these are missing and the user has not specified them, choose reasonable defaults and state them briefly.

Recommended defaults:

- audience: mixed professional audience
- outcome: help the audience understand and align on the topic
- tone: clear and confident
- density: medium

## How to Shape the Outline

Unless the user already has a strong structure, organize the outline using a deliberate arc:

1. Set context and stakes
2. Explain the core idea, problem, or opportunity
3. Break the topic into the main chapters
4. Support each chapter with concrete key points
5. Close with conclusions, next steps, or a call to action

Good outlines usually answer these questions:

- Why should the audience care?
- What are the main ideas they need to follow?
- What evidence, examples, or actions make the story credible?
- What should they remember or do afterward?

## Reference Template

Before drafting, read `references/outline-template.md` and use it as the base structure.

If you need examples of realistic user requests or what success looks like, read `evals/evals.json`.

You do not need to keep every optional field if the user wants a lighter outline, but the outline should normally preserve these three layers:

- chapter title
- section title
- key points

Do not skip key points. A title-only outline is not enough.

## Drafting Process

### Step 1: Create a Working Outline

Produce a first-pass outline that fits the user's topic and context.

When useful, include:

- chapter goal
- suggested slide count
- visual ideas
- missing inputs or proof points

### Step 2: Tighten the Story

Review the draft and improve it before presenting it:

- remove duplicated sections
- merge weak headings
- reorder chapters if the flow is confusing
- make chapter titles parallel and purposeful
- make key points concrete, not abstract filler

### Step 3: Present the Outline Clearly

Show the outline in a clean Markdown structure.

If the user gave rough notes rather than a clear brief, it is often helpful to provide:

- the final outline
- a short explanation of the narrative logic
- a short list of missing materials needed for a stronger deck

## Output Format

Use this structure by default unless the user requests a different format.

```md
# [Presentation Title]

## Overview
- Goal:
- Audience:
- Context:
- Tone:
- Estimated length:

## Chapter 1: [Title]
- Chapter goal:
- Suggested slides:

### 1.1 [Section Title]
- Key points:
  - ...
  - ...
  - ...
- Visual ideas:
- Missing material:

### 1.2 [Section Title]
- Key points:
  - ...
  - ...
  - ...
- Visual ideas:
- Missing material:

## Chapter 2: [Title]
- Chapter goal:
- Suggested slides:

### 2.1 [Section Title]
- Key points:
  - ...
  - ...
  - ...
- Visual ideas:
- Missing material:

## Closing
- Core takeaway:
- Recommended final slide message:
- Call to action / next step:
```

## Publishing to Feishu

When the user wants the final outline written to Feishu:

1. Confirm that the outline content is in its final approved form for this iteration.
2. Structure the Markdown carefully so each chapter and section has stable headings.
3. Invoke the `feishu-cli-write` skill to create a new Feishu document and write the outline.
4. Return the Feishu document link.

### Feishu Structure Rules

- Use `#` for the presentation title.
- Use `##` for chapters.
- Use `###` for sections.
- Keep key points as bullet lists under each section.
- Keep chapter boundaries stable so later revisions can target the right ranges.

### Important Update Rule

If updating an existing Feishu outline, do not fully overwrite the document by default.

Preserve comments, existing anchors, and unaffected sections. Prefer incremental updates through the Feishu writing workflow.

## Revising from Feishu Inline Comments

Use this mode when the user provides a Feishu link or doc ID and asks to revise the outline based on comments.

Before revising, read `references/revision-workflow.md`.
Then read `references/feishu-comment-commands.md` for the concrete `feishu-cli comment` commands available in this environment.

Before attempting comment-driven revision, run `python3 scripts/detect_feishu_comment_capability.py` from this skill directory to check whether the current environment appears to support real inline comment retrieval.

### Goal

Consume real inline comments from the Feishu document and apply them back to the outline in a controlled way.

### Revision Workflow

1. Use the Feishu reading workflow to read the current document structure.
2. Run the capability detection script and inspect its output.
3. Attempt to read real inline comments through the Feishu comment interface available in the current environment only if the capability check suggests support.
4. If inline comment retrieval succeeds:
   - map comments to chapters or sections
   - classify them as required changes, suggested improvements, or conflicts needing confirmation
   - revise only the affected sections unless a comment clearly requires global restructuring
5. If inline comment retrieval is not supported in the current environment:
   - explicitly tell the user that document content was read but inline comments could not be retrieved
   - do not claim the comments were applied
   - explain that the missing capability is comment retrieval, not document reading
6. After revision, write updates back to Feishu using incremental updates instead of full overwrite.

### How to Interpret Comments

Apply the smallest correct change first.

- wording comments -> local wording fix
- missing detail comments -> add points in the nearest relevant section
- structure comments -> reorder, merge, or split sections
- narrative comments -> revise the story arc across chapters

Only make global changes when the comment implies a deck-level issue.

### Conflict Handling

If comments conflict with each other or with the current deck objective:

- list the conflict briefly
- recommend the most coherent resolution
- ask the user for a decision only if the conflict materially changes the deck direction

## Recommended Commands and Skills

- Use `feishu-cli-write` to create or update the Feishu document.
- Use `feishu-cli-read` to read the current document body.
- For inline comments, use the real comment-reading interface available in the user's environment. If no such command exists, state the limitation clearly.
- Use `python3 scripts/detect_feishu_comment_capability.py` to check whether comment retrieval appears available before promising automated inline comment revision.

## Quality Bar

Before finishing, check that the outline:

- has a clear audience-aware purpose
- has a logical chapter sequence
- includes section-level key points, not just headings
- is dense enough to be useful but not so detailed that it becomes a script
- can plausibly map to slides later

## Failure Handling

### If information is incomplete

Make the best reasonable outline you can, note your assumptions, and identify the highest-value missing inputs.

### If the user already has a draft outline

Preserve the good parts, tighten the weak parts, and do not rebuild from scratch unless necessary.

### If Feishu write succeeds but revision fails

Return:

- the document link
- what was published
- what could not be revised
- the exact limitation, such as inline comment retrieval not being available

### If comment retrieval is unavailable

Be direct and specific. Say that the document itself can be read, but real inline comments could not be retrieved in the current environment, so automatic comment-based revision cannot be completed yet.

Do not silently substitute guessed feedback.

## Validation Aids

- Read `evals/evals.json` for realistic prompts that should trigger this skill.
- Run `python3 scripts/detect_feishu_comment_capability.py` to inspect likely comment support in the local Feishu CLI environment.
- Read `references/feishu-comment-commands.md` for the verified comment command shapes exposed by the local Feishu CLI.

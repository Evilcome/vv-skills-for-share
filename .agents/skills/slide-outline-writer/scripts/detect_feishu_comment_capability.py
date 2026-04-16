#!/usr/bin/env python3

import json
import shutil
import subprocess
import sys


def run_command(command):
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        return {"ok": False, "error": str(exc), "stdout": "", "stderr": ""}

    return {
        "ok": completed.returncode == 0,
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def collect_candidates(help_text):
    tokens = []
    for line in help_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        lowered = stripped.lower()
        if "comment" in lowered:
            tokens.append(stripped)
    return tokens


def main():
    result = {
        "feishu_cli_found": False,
        "feishu_cli_path": None,
        "supports_comment_commands": False,
        "comment_commands_detected": False,
        "comment_access_validated": False,
        "confidence": "low",
        "checked_commands": [],
        "comment_related_lines": [],
        "recommendation": "Inline comment retrieval support not confirmed.",
    }

    cli_path = shutil.which("feishu-cli")
    if not cli_path:
        print(json.dumps(result, indent=2, ensure_ascii=True))
        return 1

    result["feishu_cli_found"] = True
    result["feishu_cli_path"] = cli_path

    commands = [
        ["feishu-cli", "--help"],
        ["feishu-cli", "doc", "--help"],
        ["feishu-cli", "help"],
    ]

    help_outputs = []
    for command in commands:
        command_result = run_command(command)
        result["checked_commands"].append(
            {
                "command": " ".join(command),
                "ok": command_result.get("ok", False),
                "returncode": command_result.get("returncode"),
            }
        )
        help_outputs.append(
            command_result.get("stdout", "") + "\n" + command_result.get("stderr", "")
        )

    combined = "\n".join(help_outputs)
    comment_lines = collect_candidates(combined)
    result["comment_related_lines"] = comment_lines

    if comment_lines:
        result["comment_commands_detected"] = True
        result["supports_comment_commands"] = True
        result["confidence"] = "medium"
        result["recommendation"] = (
            "Feishu CLI help output appears to mention comment-related commands or descriptions. "
            "This only confirms command discovery, not permission to read comments on a specific document. "
            "Validate access with `feishu-cli comment list <file_token> --type docx --output json` before promising automated inline comment revision."
        )
    else:
        result["recommendation"] = (
            "No comment-related commands were detected in Feishu CLI help output. "
            "Treat inline comment retrieval as unavailable unless you have another verified interface."
        )

    print(json.dumps(result, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())

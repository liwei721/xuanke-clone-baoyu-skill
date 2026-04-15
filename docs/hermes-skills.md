# Using baoyu-skills with Hermes Agent

Hermes discovers skills by scanning directories for `SKILL.md` files. This repo’s layout does **not** match a single “drop the whole repo into `~/.hermes/skills/`” install. See the [Hermes skills documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills).

## Why `git clone … ~/.hermes/skills/baoyu` often fails

1. **Wrong directory for discovery**  
   Baoyu skills live under **`skills/baoyu-*/`**, not at the repository root. The root has `README.md`, `CLAUDE.md`, etc., but not one skill per root folder.  
   If Hermes only indexes certain depths or expects `category/<skill-name>/SKILL.md` under a scan root, a clone named `baoyu` yields paths like `baoyu/skills/baoyu-imagine/SKILL.md`, which may not match what the scanner expects for a **direct** child of `~/.hermes/skills/`.

2. **Prefer `external_dirs` pointing at the inner `skills` folder**  
   Hermes documents `external_dirs` with examples such as `${SKILLS_REPO}/skills`. Pointing at the inner **`skills`** directory matches how this repo is laid out:

   ```yaml
   # ~/.hermes/config.yaml
   skills:
     external_dirs:
       - /ABS/PATH/TO/baoyu-skills/skills
       - /ABS/PATH/TO/baoyu-skills/.claude/skills
   ```

   - First line: all `baoyu-*` plugin skills (`skills/baoyu-imagine/SKILL.md`, etc.).  
   - Second line: agent-only skills such as `release-skills` (`.claude/skills/release-skills/SKILL.md`).

3. **Manual copy layout**  
   If you copy instead of using `external_dirs`, follow Hermes’s usual pattern:

   ```text
   ~/.hermes/skills/<category>/<skill-name>/SKILL.md
   ```

   Example:

   ```bash
   mkdir -p ~/.hermes/skills/baoyu
   cp -R /path/to/baoyu-skills/skills/baoyu-markdown-to-html ~/.hermes/skills/baoyu/
   ```

   So the file is `~/.hermes/skills/baoyu/baoyu-markdown-to-html/SKILL.md`, not `~/.hermes/skills/baoyu/SKILL.md`.

## Skill hidden because of `requires_toolsets` / `requires_tools`

Some SKILL front matter includes Hermes metadata, for example:

```yaml
metadata:
  hermes:
    requires_toolsets:
      - terminal
```

If the current Hermes session **does not** load the `terminal` toolset, skills that declare `requires_toolsets: [terminal]` are **omitted** from `skills_list()` and slash commands (by design). Enable the matching toolsets for the session, or remove/adjust those fields in a local copy if you accept the tradeoff.

## Non-existent `external_dirs` paths

Hermes **silently skips** missing paths. A typo or wrong machine-specific path means no skills from that entry—check that the path exists and is absolute or correctly uses `~`.

## Verify

```bash
hermes chat --toolsets skills -q "List skills whose name contains baoyu"
```

If nothing appears, fix `external_dirs`, toolsets, and directory layout as above.

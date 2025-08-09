# Generate Commit Message Hook

**Trigger**: Manual (Cmd+M)
**Description**: Analyze staged Git changes and generate a conventional commit message

## Hook Configuration

```json
{
  "name": "Generate Commit Message",
  "description": "Generate a commit message based on currently staged Git changes",
  "trigger": "manual",
  "shortcut": "cmd+m",
  "context": ["workspace", "git"]
}
```

## Prompt

You are a Git commit message generator for the NPM MCP Generator project. 

**Task**: Analyze the currently staged Git changes and create a concise, descriptive commit message following conventional commit format.

**Rules**:
- Use conventional commit format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep the first line under 50 characters when possible
- Be specific about what changed
- Use present tense ("add" not "added")
- For this project, common scopes include: `fetchers`, `types`, `tests`, `cli`, `docs`

**Process**:
1. First, examine the staged changes with `git diff --cached`
2. Identify the type of changes (new features, bug fixes, documentation, etc.)
3. Determine the appropriate scope based on which files/modules are affected
4. Generate a clear, concise commit message
5. If there are multiple unrelated changes, suggest splitting into separate commits

**Example formats**:
- `feat(fetchers): add GitHub API rate limiting support`
- `fix(types): correct AnalysisError interface casting`
- `test(fetchers): add comprehensive NPM registry tests`
- `docs: update README with installation instructions`
- `refactor(cli): improve error handling in main command`

Please analyze the staged changes and provide the recommended commit message.
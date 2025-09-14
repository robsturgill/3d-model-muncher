# Release Process

This document outlines the automated release process for 3D Model Muncher.

## Overview

This project uses automated versioning and changelog generation based on [Conventional Commits](https://www.conventionalcommits.org/). The release process is automated using GitHub Actions and semantic-release.

## Commit Message Format

Use conventional commit messages for automatic changelog generation:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Examples
```bash
feat: add STL file format support
fix: resolve memory leak in 3D model rendering
docs: update installation instructions
feat!: redesign API endpoints (breaking change)
```

## Manual Release Commands

### Using Commitizen (Recommended)
```bash
npm run commit
```
This will guide you through creating a properly formatted commit message.

### Standard Version (Manual Releases)
```bash
# Automatic version bump based on commits
npm run release

# Specific version bumps
npm run release:patch    # 1.0.0 -> 1.0.1
npm run release:minor    # 1.0.0 -> 1.1.0
npm run release:major    # 1.0.0 -> 2.0.0

# Pre-release
npm run release:pre      # 1.0.0 -> 1.0.1-0

# First release
npm run release:first
```

### Generate Changelog Only
```bash
npm run changelog
```

## Automated Releases

### GitHub Actions
The project uses semantic-release via GitHub Actions:

1. **Trigger**: Pushes to `main` branch
2. **Process**:
   - Analyzes commit messages
   - Determines version bump
   - Generates changelog
   - Creates GitHub release
   - Updates package.json
   - Commits changes back to repository

### Docker Releases
The existing Docker workflow automatically builds and pushes images when:
- Tags matching `v*` are pushed
- The semantic-release process will automatically create these tags

## Version Bumping Rules

Based on commit types:
- `fix:` → Patch release (1.0.0 → 1.0.1)
- `feat:` → Minor release (1.0.0 → 1.1.0)
- `feat!:` or `BREAKING CHANGE:` → Major release (1.0.0 → 2.0.0)

## Release Workflow

1. **Development**: Create feature branches and make commits using conventional commit format
2. **Pull Request**: Open PR to main branch
3. **Merge**: When PR is merged to main, automated release process triggers
4. **Release**: If commits warrant a release:
   - Version is bumped
   - Changelog is updated
   - GitHub release is created
   - Docker images are built and pushed

## Configuration Files

- `.versionrc.json`: Standard-version configuration
- `.releaserc.json`: Semantic-release configuration
- `.github/workflows/release.yml`: GitHub Actions workflow
- `CHANGELOG.md`: Generated changelog file

## Skipping Releases

To skip the automated release process, include `[skip ci]` in your commit message:
```bash
git commit -m "docs: update README [skip ci]"
```
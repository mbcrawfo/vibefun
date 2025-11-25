# Publishing Security Checklist

This checklist must be completed before publishing any vibefun packages to npm.

## Pre-Publishing Setup (One-Time)

### 1. Enable Two-Factor Authentication (2FA)

**Critical:** Enable 2FA on your npm account before publishing.

```bash
# Check if 2FA is enabled
npm profile get

# Enable 2FA for auth and publishing
npm profile enable-2fa auth-and-writes
```

**Verification:** You should see `tfa: auth-and-writes` in your npm profile.

### 2. Create Granular Access Tokens

**Never use your main npm password for publishing.** Use granular access tokens with limited scope.

```bash
# Create a publish token with minimal permissions
npm token create --type=publish --scope=@vibefun

# Or create via web UI:
# https://www.npmjs.com/settings/[username]/tokens
```

**Token Configuration:**
- **Type:** Automation (for CI/CD) or Publish (for manual)
- **Scope:** Read and write (publish access)
- **Packages:** Limit to @vibefun/* packages only
- **Expiration:** Set expiration date (recommended: 90 days for automation, 30 days for manual)

**Store token securely:**
```bash
# Add to ~/.npmrc (for local publishing)
# OR add to GitHub Secrets (for CI/CD)
echo "//registry.npmjs.org/:_authToken=npm_YOUR_TOKEN_HERE" >> ~/.npmrc
```

### 3. Configure npm Profile

Review and update your npm profile:

```bash
npm profile set email your-email@example.com
npm profile set fullname "Your Name"
npm profile set github yourusername
```

## Pre-Publishing Verification (Every Release)

### 4. Verify Package Contents

**Critical:** Review what will be published to avoid exposing sensitive files.

```bash
# Build all packages first
npm run build

# Check each workspace package
cd packages/core
npm pack --dry-run

cd ../cli
npm pack --dry-run

cd ../stdlib
npm pack --dry-run
```

**What to check:**
- ✅ Only `dist/` files are included
- ✅ `README.md` and `LICENSE` are included
- ❌ No `.env` files
- ❌ No test files (`*.test.ts`)
- ❌ No source `.ts` files (only compiled `.js` and `.d.ts`)
- ❌ No `.git` directory
- ❌ No `node_modules`

### 5. Run Full Test Suite

Ensure all tests pass before publishing:

```bash
npm run verify
```

This runs:
- Type checking (`npm run check`)
- Linting (`npm run lint`)
- All tests (`npm test`)
- Format verification (`npm run format:check`)

**All checks must pass before publishing.**

### 6. Review Version Numbers

Ensure version numbers follow semantic versioning:

```bash
# Check current versions
npm version --workspaces

# Bump version (if needed)
npm version patch --workspace=@vibefun/core
npm version patch --workspace=@vibefun/cli
npm version patch --workspace=@vibefun/stdlib
```

**Semantic Versioning:**
- `patch` (0.1.0 → 0.1.1): Bug fixes, no API changes
- `minor` (0.1.0 → 0.2.0): New features, backward compatible
- `major` (0.1.0 → 1.0.0): Breaking changes

### 7. Update Changelog

Document what changed in this release:

```bash
# Update CHANGELOG.md with release notes
# Include:
# - New features
# - Bug fixes
# - Breaking changes
# - Security fixes
```

### 8. Verify Provenance Configuration

Ensure provenance is enabled:

```bash
# Check .npmrc
grep provenance .npmrc

# Should output: provenance=true
```

## Publishing (Manual)

### 9. Publish with Provenance

```bash
# Publish each workspace with provenance
npm publish --workspace=@vibefun/core --provenance --access=public
npm publish --workspace=@vibefun/cli --provenance --access=public
npm publish --workspace=@vibefun/stdlib --provenance --access=public

# OR publish all workspaces at once
npm publish --workspaces --provenance --access=public
```

**Important flags:**
- `--provenance`: Generates supply chain verification
- `--access=public`: Makes package publicly available (required for @vibefun scope unless you have a paid npm org)

### 10. Verify Published Packages

```bash
# Check that packages were published correctly
npm view @vibefun/core
npm view @vibefun/cli
npm view @vibefun/stdlib

# Verify provenance statement exists
npm view @vibefun/core --json | grep attestations
```

### 11. Test Installation

Test that published packages can be installed:

```bash
# Create a test directory
mkdir /tmp/vibefun-test
cd /tmp/vibefun-test
npm init -y

# Install published packages
npm install @vibefun/core @vibefun/cli @vibefun/stdlib

# Test CLI
npx vibefun --version

# Clean up
cd -
rm -rf /tmp/vibefun-test
```

## Post-Publishing

### 12. Create Git Tag

Tag the release in git:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

### 13. Create GitHub Release

Create a GitHub release with release notes:

```bash
gh release create v0.1.0 --title "v0.1.0" --notes "Release notes here"
```

### 14. Announce Release

- Update README.md with new version
- Tweet/post about release (optional)
- Update documentation if needed

## Security Best Practices

### Regular Token Rotation

```bash
# List all tokens
npm token list

# Revoke old tokens
npm token revoke <token-id>

# Create new token
npm token create --type=publish --scope=@vibefun
```

**Rotation schedule:**
- Automation tokens: Every 90 days
- Manual tokens: Every 30 days
- Immediately if compromised

### Monitor Package Downloads

```bash
# Check download stats
npm view @vibefun/core downloads

# Or use npm-stat.com:
# https://npm-stat.com/charts.html?package=@vibefun/core
```

Watch for:
- Unexpected spikes (possible typosquatting)
- Zero downloads after recent publish (possible issue)

### Review npm Security Advisories

Subscribe to security advisories for your packages:

```bash
# Set up email notifications
npm profile set email your-email@example.com

# Check for vulnerabilities
npm audit
```

## Emergency: Unpublishing

**Warning:** Unpublishing is only allowed within 72 hours and causes major disruption.

```bash
# Only use in emergencies (security issue, accidental publish)
npm unpublish @vibefun/core@0.1.0

# For complete removal (very disruptive)
npm unpublish @vibefun/core --force
```

**Better alternative:** Deprecate instead:

```bash
npm deprecate @vibefun/core@0.1.0 "Security vulnerability, please upgrade to 0.1.1"
```

## CI/CD Publishing (Future)

When setting up automated publishing via GitHub Actions:

1. **Add npm token to GitHub Secrets**
   - Go to repository settings → Secrets → Actions
   - Add `NPM_TOKEN` secret with automation token

2. **Create publish workflow** (`.github/workflows/publish.yml`):
   ```yaml
   name: Publish to npm
   on:
     release:
       types: [created]

   jobs:
     publish:
       runs-on: ubuntu-latest
       permissions:
         contents: read
         id-token: write  # Required for provenance
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '24.x'
             registry-url: 'https://registry.npmjs.org'
         - run: npm ci
         - run: npm run build
         - run: npm run verify
         - run: npm publish --workspaces --provenance --access=public
           env:
             NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

3. **Test workflow** with dry-run first

## Checklist Summary

Before every publish, verify:

- [ ] 2FA enabled on npm account
- [ ] Using granular access token (not password)
- [ ] `npm pack --dry-run` reviewed for all packages
- [ ] `npm run verify` passes
- [ ] Version numbers bumped correctly
- [ ] CHANGELOG.md updated
- [ ] `provenance=true` in .npmrc
- [ ] Published with `--provenance` flag
- [ ] Verified published packages with `npm view`
- [ ] Tested installation in clean environment
- [ ] Git tag created and pushed
- [ ] GitHub release created

## Resources

- [npm security best practices](https://github.com/bodadotsh/npm-security-best-practices)
- [npm provenance documentation](https://docs.npmjs.com/generating-provenance-statements)
- [npm 2FA documentation](https://docs.npmjs.com/configuring-two-factor-authentication)
- [npm tokens documentation](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [Semantic versioning](https://semver.org/)

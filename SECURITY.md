# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Vibefun seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**Please DO NOT open a public issue for security vulnerabilities.**

Instead, please report security issues via GitHub's private vulnerability reporting feature:

1. Go to the [Security tab](https://github.com/mbcrawfo/vibefun/security/advisories/new)
2. Click "Report a vulnerability"
3. Provide detailed information about the vulnerability

Alternatively, you can email security issues to the project maintainers.

### What to Include

When reporting a vulnerability, please include:

- Type of vulnerability (e.g., supply chain, code injection, etc.)
- Full paths to affected source files
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment of the vulnerability

### Response Timeline

We aim to:

- **Acknowledge receipt** within 48 hours
- **Provide initial assessment** within 5 business days
- **Release a fix** within 30 days for critical issues
- **Credit researchers** in release notes (if desired)

### Security Practices

The Vibefun project follows npm security best practices:

- **Exact version pinning** for all dependencies
- **Lifecycle scripts disabled** by default (`ignore-scripts=true`)
- **Provenance statements** on published packages
- **Regular dependency audits** via automated tooling
- **Minimal external dependencies** to reduce attack surface
- **Strict TypeScript configuration** to prevent type-related vulnerabilities

### Public Disclosure

We follow a coordinated disclosure process:

1. Security issue reported and confirmed
2. Fix developed and tested
3. Security advisory published (if applicable)
4. Fix released with advisory notification
5. Public disclosure after users have had time to update

Thank you for helping keep Vibefun and its users safe!

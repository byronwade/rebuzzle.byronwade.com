# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch. If you are running a
fork or an older deploy, please rebase or redeploy after a security fix lands.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report privately by emailing **hello@byronwade.com** with:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept if available
- Affected component (e.g. web API route, auth, admin, cron)
- Your preferred contact for follow-up

You should receive an acknowledgment within a few business days. We will keep
you informed of the remediation timeline when possible.

## Safe harbor

We appreciate good-faith research. Please:

- Avoid privacy violations, destruction of data, and service disruption
- Do not access data that is not yours
- Give us a reasonable time to remediate before public disclosure

## Secrets and credentials

Never commit API keys, database URLs, private keys, or `.env` files. Use
`.env.example` as the template for required variables. Rotate any credential
that may have been exposed.

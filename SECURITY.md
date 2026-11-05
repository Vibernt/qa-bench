# Security

QA Bench runs deliberately broken apps in local containers. Their planted defects are not vulnerabilities in the
bench.

Report real security problems in the bench itself privately, through GitHub's "Report a vulnerability" (security
advisories) on this repository. Examples:
- a way for an adapter to escape its sandbox or read the sealed answer key;
- secrets in the repository;
- an app container that can reach the host.

Please don't open a public issue for these.

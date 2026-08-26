# Offline code-execution sandbox for the SIH 2026 demo.
# Design constraints:
#   - stdlib ONLY: no pip/apt installs, so the image is small and the build
#     never needs internet beyond the one-time base-image pull.
#   - non-root runtime user: a compromised script cannot write to the image
#     filesystem's protected paths or escalate inside the container.
#   - the runner adds --network none + memory/CPU caps at `docker run` time;
#     see README.md for the canonical command template.
FROM python:3.11-slim

# No pip installs by design (standard library only). Build-time internet is
# required solely to pull the base image once; nothing is fetched afterwards.
RUN useradd --create-home --shell /bin/bash --uid 10001 sandbox \
    && mkdir -p /sandbox \
    && chown sandbox:sandbox /sandbox

WORKDIR /sandbox
USER sandbox

# Hygiene for agent-submitted code: no .pyc writes into the (possibly
# read-only) workdir, and stdout/stderr flush immediately for log capture.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

CMD ["python3"]

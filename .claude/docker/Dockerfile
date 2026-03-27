FROM ubuntu:24.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Ensure pipeline failures are caught (curl | bash patterns)
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# ---------------------------------------------------------------------------
# 1. Core apt packages
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        jq \
        bc \
        curl \
        ca-certificates \
        openssh-client \
        gnupg \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# 2. GitHub CLI (gh) via official apt repository
# ---------------------------------------------------------------------------
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# 3. Node.js 24.x via NodeSource
# ---------------------------------------------------------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# 4. pnpm via corepack (shared cache so non-root user can access it)
# ---------------------------------------------------------------------------
ENV COREPACK_HOME=/opt/corepack
RUN mkdir -p /opt/corepack \
    && corepack enable \
    && corepack prepare pnpm@10.32.1 --activate \
    && chmod -R 755 /opt/corepack

# ---------------------------------------------------------------------------
# 5. Claude Code (native binary install)
#    Installs to /root/.local/, then copy resolved binary to /usr/local/bin
# ---------------------------------------------------------------------------
RUN curl -fsSL https://claude.ai/install.sh | bash -s -- stable \
    && cp -L /root/.local/bin/claude /usr/local/bin/claude \
    && chmod 755 /usr/local/bin/claude

# ---------------------------------------------------------------------------
# 6. Baked-in GitHub SSH host keys (avoids TOFU risk)
#    Source: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
# ---------------------------------------------------------------------------
RUN mkdir -p /etc/ssh \
    && cat > /etc/ssh/github_known_hosts <<'KEYS'
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Gy4PjE+cF2SYdEMK4VFPGPmVYhMpNMl1DKBBL+e6rUJ0bikQ6wLZjIh/lKVEMcqJLGE1gN3NNjCXcPB0hMlBTyyB4Fp82GAjF5MRqeW+GNxcBOFNKnVkHT8APyVhV9OhNDCL5B0VqL5B8c1awREb0GQbHTxI+F1iWjGRMn1wp7Rn7gZOAW8JM9OSeAlQlGPT1GYpAm2D1FlDVwb+ALbDW0+LiPe25nnsBCb2ygGJsDqJA0fQ7rXmWFrb8MILeFmU6RW7IC/45MNeTA0Gxvo1DG/JVkWOLE2c5O2GuKJpTj21LGTjt6KSzpSrP2yfS5LAZH9tLK9J5raV/8Fb9QW1+kIkHn0vILb+j+b+aJEpGeg5Lmv7iMKONHVr0RqGy8U6C8LuY9pEVRjFMfNSYpeMBI+lg8XCFOJ9TUaO6AhM6fiv1HbVPE+bN3TRc7FZzn3a8GFwAgGi70=
KEYS

# ---------------------------------------------------------------------------
# 7. Copy entrypoint script
# ---------------------------------------------------------------------------
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ---------------------------------------------------------------------------
# 8. Non-root user (Ubuntu 24.04 ships with ubuntu:1000 user)
# ---------------------------------------------------------------------------
RUN usermod -l vfdev -d /home/vfdev -m ubuntu \
    && groupmod -n vfdev ubuntu \
    && mkdir -p /vibefun && chown vfdev:vfdev /vibefun

# ---------------------------------------------------------------------------
# 9. Working directory and entrypoint
#    Entrypoint starts as root to fix SSH socket permissions, then drops to
#    vfdev via setpriv (see entrypoint.sh).
# ---------------------------------------------------------------------------
WORKDIR /vibefun
ENTRYPOINT ["/entrypoint.sh"]

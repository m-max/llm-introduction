# syntax=docker/dockerfile:1

# Conteneur « boîte à outils » llama.cpp (CPU only, AVX2) + CLI Hugging Face.
# Usage : voir README.md.

ARG UBUNTU_VERSION=24.04

# ---------- Étape 1 : compilation de llama.cpp ----------
FROM ubuntu:${UBUNTU_VERSION} AS build

# Version épinglée ; upgrader via --build-arg LLAMA_VERSION=<tag>.
ARG LLAMA_VERSION=v0.5.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        cmake \
        git \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --recurse-submodules --branch "${LLAMA_VERSION}" \
        https://github.com/ggml-org/llama.cpp.git /src/llama.cpp

WORKDIR /src/llama.cpp
# Backend CPU : activé par défaut. LLAMA_OPENSSL (défaut ON, exige libssl-dev)
# fournit le HTTPS dont `-hf` a besoin pour télécharger depuis Hugging Face.
RUN cmake -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DLLAMA_OPENSSL=ON \
    && cmake --build build --config Release -j "$(nproc)" \
        --target llama-server llama-cli llama-bench

# ---------- Étape 2 : image minimale d'exécution ----------
FROM ubuntu:${UBUNTU_VERSION}

# UID/GID de l'utilisateur hôte (id -u / id -g) ; 1000 = mmax ici.
# À passer en --build-arg si différents, sinon les modèles téléchargés
# appartiendraient à un UID inconnu de l'hôte.
ARG APP_UID=1000
ARG APP_GID=1000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        less \
        libssl3t64 \
        libgomp1 \
        procps \
        python3 \
        python3-venv \
    && rm -rf /var/lib/apt/lists/*

# CLI Hugging Face (`hf`), dans un venv dédié (Ubuntu 24.04 interdit les pip
# « système », PEP 668). Les transferts passent par hf-xet, installé avec
# huggingface_hub (hf_transfer est déprécié).
RUN python3 -m venv /opt/hf-venv \
    && /opt/hf-venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/hf-venv/bin/pip install --no-cache-dir huggingface_hub \
    && /opt/hf-venv/bin/hf version
ENV PATH="/opt/hf-venv/bin:${PATH}"

# Les binaires de llama.cpp sont des lanceurs fins qui chargent au runtime
# leurs bibliothèques sœurs (libllama-*-impl.so, libggml*.so, libllama*.so) :
# on copie tout le répertoire bin/ et on le déclare au chargeur dynamique.
COPY --from=build /src/llama.cpp/build/bin/ /opt/llama/bin/
ENV PATH="/opt/llama/bin:${PATH}" \
    LD_LIBRARY_PATH="/opt/llama/bin"

# L'image de base ubuntu:24.04 possède déjà un utilisateur « ubuntu » aux
# UID/GID 1000 : on le supprime pour que « app » puisse prendre ceux de l'hôte.
RUN userdel -r -f ubuntu 2>/dev/null || true ; groupdel -f ubuntu 2>/dev/null || true ; \
    groupadd --gid "${APP_GID}" app \
    && useradd --uid "${APP_UID}" --gid "${APP_GID}" --create-home app \
    && mkdir -p /models \
    && chown app:app /models

USER app
ENV HOME=/home/app
WORKDIR /models

# Boîte à outils : shell interactif par défaut ; on lance soi-même
# hf download / llama-cli / llama-server.
CMD ["bash"]

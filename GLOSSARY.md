# LLM local conteneurisé (llama.cpp)

Contexte : exécution de LLM en local sur la machine de mmax (CPU only, pas de GPU NVIDIA) dans un conteneur Docker construit ici, avec les modèles téléchargés depuis Hugging Face.

## Language

**Modèle** :
Poids GGUF téléchargés depuis Hugging Face, rangés à plat sous un dossier dédié ; un dossier = un modèle.
_Avoid_ : artefact, checkpoint

**Espace de modèles** :
Dossier `models/` à la racine du repo, seul endroit où résident les Modèle sur l'hôte, partagé avec le conteneur.
_Avoid_ : cache HF, volume Docker nommé

**Boîte à outils** :
Mode du conteneur dont la commande par défaut est un shell interactif ; l'utilisateur y lance lui-même les outils (`hf`, `llama-server`).
_Avoid_ : conteneur-serveur, service permanent

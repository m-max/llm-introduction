---
name: explain-file
description: Explique un fichier de code de façon structurée — rôle, structure, lignes subtiles, limites. À utiliser quand on demande d'expliquer un fichier : « explique ce fichier », « que fait ce fichier ? », « explique-moi pricing.py », "explain this file".
---

# explain-file

Quand on te demande d'expliquer un fichier de code :

1. Lis le fichier en entier.
2. Réponds dans cet ordre, avec ces titres :
   - **Rôle** — une phrase : à quoi sert ce fichier dans le projet.
   - **Structure** — les fonctions/classes notables, une ligne chacune, avec leur numéro de ligne.
   - **Subtilités** — les 2 à 3 lignes les plus fines du fichier (algorithmes, arrondis, conditions de bord, conventions de données) et pourquoi elles comptent.
   - **Limites** — un défaut, une hypothèse fragile ou une limite à connaître avant de modifier le fichier.
3. Contraintes : moins de 20 lignes au total ; ne recopie pas le fichier ; cite les numéros de ligne ; reste factuel.

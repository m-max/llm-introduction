"""Tests de pricing.py — spec : docstring de pricing.py (rappel ci-dessous).

Rappel des paliers de remise attendus par ces tests :
    >= 200,00 EUR -> 15 %   |   >= 100,00 EUR -> 10 %
    >=  50,00 EUR ->  5 %   |   <   50,00 EUR -> aucune
TVA 20 % appliquee apres la remise. Montants en centimes.

Ces tests passent aussi bien avec :
    python3 -m unittest -v          (aucune dependance)
    uv run --with pytest pytest -v  (sortie pytest)
"""

import unittest

from pricing import appliquer_remise, sous_total, total_ttc


class TestSousTotal(unittest.TestCase):
    def test_somme_des_lignes(self):
        self.assertEqual(sous_total([(10_00, 3), (2_50, 4)]), 40_00)

    def test_panier_vide(self):
        self.assertEqual(sous_total([]), 0)


class TestRemise(unittest.TestCase):
    def test_sous_le_premier_palier(self):
        self.assertEqual(appliquer_remise(49_99), 49_99)

    def test_palier_50(self):
        self.assertEqual(appliquer_remise(60_00), 57_00)

    def test_palier_100_au_seuil_exact(self):
        # 100,00 EUR -> 10 % -> 90,00 EUR
        self.assertEqual(appliquer_remise(100_00), 90_00)

    def test_palier_100_au_dessus(self):
        # 150,00 EUR -> 10 % -> 135,00 EUR
        self.assertEqual(appliquer_remise(150_00), 135_00)

    def test_palier_200(self):
        self.assertEqual(appliquer_remise(200_00), 170_00)


class TestTotalTTC(unittest.TestCase):
    def test_sans_remise(self):
        # 2 x 12,50 = 25,00 -> pas de remise -> +20 % = 30,00
        self.assertEqual(total_ttc([(12_50, 2)]), 30_00)

    def test_avec_remise_100(self):
        # 3 x 40,00 = 120,00 -> remise 10 % -> 108,00 -> +20 % = 129,60
        self.assertEqual(total_ttc([(40_00, 3)]), 129_60)


if __name__ == "__main__":
    unittest.main(verbosity=2)

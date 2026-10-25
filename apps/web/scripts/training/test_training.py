"""Tests use deliberately synthetic numbers; they never create production training labels."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parent

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

ranker = load("ranker", "train-ranker.py")
research = load("research", "research-datasets.py")


class TrainingTests(unittest.TestCase):
    def test_pairwise_fit_learns_preferences(self):
        # Mathematical optimizer regression test, not evidence about puzzle quality.
        rows = [{"chosen": [0.9, 0.1], "rejected": [0.1, 0.9], "group": "synthetic"}] * 20
        weights = ranker.train(rows, 2)
        self.assertGreater(weights[0], 0)
        self.assertLess(weights[1], 0)
        self.assertEqual(ranker.metrics(weights, rows)["accuracy"], 1)
        self.assertLess(ranker.metrics(weights, rows)["logLoss"], 0.2)

    def test_ties_do_not_count_as_wins(self):
        rows = [{"chosen": [1], "rejected": [1], "group": "synthetic"}]
        self.assertEqual(ranker.metrics([0], rows)["accuracy"], 0.5)

    def test_imported_metadata_never_self_approves(self):
        dataset = {"id": "example", "format": "columbus-jsonl", "imageBase": "https://example.com/"}
        rows = list(research.references(dataset, '{"options":{"A":"answer"},"correct":"A","file_name":"image.png"}'))
        self.assertFalse(rows[0]["eligibleForTraining"])
        self.assertFalse(rows[0]["eligibleForEvaluation"])
        self.assertEqual(rows[0]["reviewStatus"], "pending")


if __name__ == "__main__":
    unittest.main()

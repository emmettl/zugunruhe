import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('prepare', Path(__file__).with_name('prepare-migration.py'))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class SamplingTests(unittest.TestCase):
    def test_keeps_actual_half_hour_fixes_and_endpoints(self):
        points = [[t, t / 1000, 47] for t in [20.999, 300, 1700, 1820, 2100, 2500]]
        self.assertEqual(prepare.select_fixes(points), [points[0], points[3], points[-1]])

    def test_preserves_both_sides_of_source_gaps(self):
        points = [[t, 3, 44] for t in [0, 100, 120, 19000, 19100, 19200]]
        self.assertEqual(prepare.select_fixes(points), [points[0], points[2], points[3], points[-1]])

    def test_sparse_tracks_are_not_filled(self):
        points = [[t, 3, 44] for t in [1, 30000, 80000]]
        self.assertEqual(prepare.select_fixes(points), points)
        self.assertEqual(prepare.select_fixes([]), [])


if __name__ == '__main__':
    unittest.main()

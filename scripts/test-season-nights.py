import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('season', Path(__file__).with_name('prepare-season-nights.py'))
season = importlib.util.module_from_spec(spec)
spec.loader.exec_module(season)


def profile(density=2, east=3, north=4):
    return {'dens': [density] * 15, 'ub': [east] * 15, 'vb': [north] * 15}


class SeasonalAggregation(unittest.TestCase):
    def test_minimum_coverage_and_missing_trace(self):
        rejected = season.summarise([profile()] * 38 + [None] * 10)
        accepted = season.summarise([profile()] * 39 + [None] * 9)
        self.assertIsNone(rejected['density'])
        self.assertEqual(accepted['density'], [2] * 15)
        self.assertEqual(accepted['meanDensity'], 2)
        self.assertEqual(accepted['trace'][-9:], [None] * 9)
        self.assertEqual(rejected['completeSamples'], 38)

    def test_incomplete_height_rejects_entire_timestamp(self):
        incomplete = profile(1000)
        incomplete['dens'][14] = None
        result = season.summarise([profile()] * 39 + [incomplete] * 9)
        self.assertEqual(result['density'], [2] * 15)
        self.assertEqual(result['completeSamples'], 39)
        self.assertIsNone(result['trace'][-1])

    def test_zero_is_available_without_inventing_direction(self):
        result = season.summarise([profile(0)] * 48)
        self.assertEqual(result['meanDensity'], 0)
        self.assertEqual(result['density'], [0] * 15)
        self.assertEqual(result['trace'], [0] * 48)
        self.assertIsNone(result['velocity'])

    def test_weighted_velocity_and_opposing_flow(self):
        result = season.summarise([profile(2, 10, 0)] * 24 + [profile(1, -10, 0)] * 24)
        self.assertEqual(result['velocity'], [3.3333, 0])
        opposing = season.summarise([profile(2, 10, 0)] * 24 + [profile(2, -10, 0)] * 24)
        self.assertEqual(opposing['velocity'], [0, 0])

    def test_velocity_missingness_does_not_remove_density(self):
        missing = profile()
        missing['ub'][5] = None
        result = season.summarise([profile()] * 38 + [missing] * 10)
        self.assertEqual(result['meanDensity'], 2)
        self.assertIsNone(result['velocity'])
        self.assertEqual(result['pairedSamples'], 38)

    def test_negative_or_nonfinite_density_is_not_a_zero(self):
        result = season.summarise([profile(-1)] * 24 + [profile(float('nan'))] * 24)
        self.assertEqual(result['completeSamples'], 0)
        self.assertEqual(result['trace'], [None] * 48)


if __name__ == '__main__':
    unittest.main()

"""
StatSaksham AI — Master Backend Regression Runner
Runs all 4 test suites covering 43 tests:
  - 13 Unified Smoke Tests (test_smoke.py)
  - 10 Cross-Module Integration Flow Tests (test_cross_module.py)
  -  8 P1 Competency Intelligence Tests (test_competency.py)
  - 12 P4 Workforce & Analytics Tests (test_workforce.py)
Total: 43 / 43 Backend Tests
"""
import subprocess
import sys
from pathlib import Path

def main():
    test_dir = Path(__file__).resolve().parent
    suites = [
        ("Unified Smoke Tests", test_dir / "test_smoke.py", 13),
        ("Cross-Module Integration Tests", test_dir / "test_cross_module.py", 10),
        ("P1 Competency Intelligence Tests", test_dir / "test_competency.py", 8),
        ("P4 Workforce & Analytics Tests", test_dir / "test_workforce.py", 12),
    ]

    total_passed = 0
    total_expected = 43

    print("=" * 65)
    print("STATSAKSHAM AI — UNIFIED BACKEND MASTER REGRESSION (43 TESTS)")
    print("=" * 65)

    for name, script_path, count in suites:
        print(f"\n>>> Running {name} ({count} tests)...")
        res = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True)
        if res.returncode == 0:
            total_passed += count
            print(f"[PASS] {name}: {count} / {count} PASSED")
        else:
            print(f"[FAIL] {name} FAILED with return code {res.returncode}")
            print(res.stdout)
            print(res.stderr)
            sys.exit(1)

    print("\n" + "=" * 65)
    print(f"CONSOLIDATED VERIFICATION: {total_passed} / {total_expected} TESTS PASSED")
    print("=" * 65)
    print("Backend: 43 / 43 tests PASSED")
    print("Cross-Module: 10 / 10 cross-module integration tests PASSED")
    print("Smoke: 13 / 13 unified smoke tests PASSED")

if __name__ == "__main__":
    main()

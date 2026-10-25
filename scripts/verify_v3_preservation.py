"""Read-only verification of V3 against the saved V2 baseline; writes only its JSON report."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import zipfile

project = Path(__file__).resolve().parent.parent
backup = project / "backups/v2-before-v3-20261025.zip"
protected = [
    "src/config/quiz.ts",
    "src/data/csvLoader.ts",
    "src/data/products.json",
    "src/data/productPhotos.json",
    "src/data/productPhotoResolver.ts",
    "src/engine/quiz.ts",
    "src/engine/state.ts",
    "public/sample-quiz.csv",
]
original = project.parent.parent / "互動式問答/quiz-web/src"
original_hashes = {
    "config/quiz.ts": "E295F380339E55325FF9E244806EF7071D742EFAEE12AA388F91200D91AB351C",
    "services/quizDataService.ts": "5854F6D1C3EEEF65719DAC0ABD6F399A48C74584768B912DC0E65028759872EF",
}
def sha(data):
    return hashlib.sha256(data).hexdigest().upper()

with zipfile.ZipFile(backup) as archive:
    bad_crc = archive.testzip()
    photos = [p for p in archive.namelist() if p.startswith("public/assets/products/local/") and not p.endswith("/")]
    checked = [{"path": p, "unchanged": archive.read(p) == (project / p).read_bytes(),
                "sha256": sha((project / p).read_bytes())} for p in protected + photos]
    members = len(archive.namelist())
source_checks = [{"path": str(original / p), "sha256": sha((original / p).read_bytes()),
                  "unchanged": sha((original / p).read_bytes()) == expected}
                 for p, expected in original_hashes.items()]
report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "backup": str(backup), "backupMembers": members, "backupCrcValid": bad_crc is None,
    "photoCount": len(photos), "preservedFiles": checked, "originalProject": source_checks,
    "allPassed": bad_crc is None and len(photos) == 25 and all(p["unchanged"] for p in checked + source_checks),
}
output = project / "output/v3-preservation-audit.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: v for k, v in report.items() if k not in ("preservedFiles", "originalProject")}, ensure_ascii=False))
if not report["allPassed"]:
    raise SystemExit("Preservation verification failed; inspect output/v3-preservation-audit.json")

import glob
import os

files = glob.glob('frontend/src/**/*.tsx', recursive=True)
data = {os.path.basename(f): open(f, encoding='utf-8', errors='ignore').read() for f in files}
comps = [os.path.basename(f)[:-4] for f in glob.glob('frontend/src/components/*.tsx')]

for c in comps:
    refs = [k for k, v in data.items() if c in v and k != f"{c}.tsx"]
    print(f"{c:30} -> {refs}")

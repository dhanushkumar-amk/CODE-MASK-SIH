import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from tools.code_exec_tool import code_execute

sample_code = """
def is_duck_number(n):
    num_str = str(n)
    return num_str[0] != '0' and '0' in num_str[1:]

test_numbers = [1023, 7070, 123, 80, 502]
for num in test_numbers:
    status = "Duck Number" if is_duck_number(num) else "NOT a Duck Number"
    print(f"{num}: {status}")
"""

print("Executing test script in offline-code-sandbox Docker container...")
result = code_execute(sample_code)
print("STATUS:", result["status"])
print("OUTPUT:\n" + result["output"])

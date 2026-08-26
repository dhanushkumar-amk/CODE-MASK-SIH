"""Stress-test for classify_task across realistic and ambiguous prompts."""

from router import classify_task

TEST_CASES = [
    # Clearly coding-related (4)
    ("Write a Python function to calculate pipe flow rate", "coding"),
    ("Debug this script, it's throwing an error", "coding"),
    ("Compile the C program and run the test suite", "coding"),
    ("Implement a sorting algorithm in Python", "coding"),
    # Clearly document-related (4)
    ("Summarize this inspection report", "document"),
    ("Draft an approval note for the maintenance work", "document"),
    ("What does our SOP say about valve maintenance intervals", "document"),
    ("Generate a weekly status report for the team", "document"),
    # Clearly vision-related (4)
    ("Read this scanned P&ID diagram and extract the equipment list", "vision"),
    ("Extract text from this handwritten note", "vision"),
    ("Identify equipment tags in this photo of the control panel", "vision"),
    ("Process this image of a pipeline drawing", "vision"),
    # Ambiguous / tricky (3)
    (
        "review this python script's logic and summarize the changes needed",
        "coding",
    ),
    ("extract the vendor name from this scanned invoice", "document"),
    ("write code to process scanned images in our pipeline", "coding"),
]

TRUNC = 50


def main():
    header = f"{'INPUT':{TRUNC}}  {'EXPECTED':9} {'ACTUAL':9} RESULT"
    print(header)
    print("-" * len(header))

    passed = 0
    for description, expected in TEST_CASES:
        actual = classify_task(description)
        ok = actual == expected
        passed += int(ok)

        short = (
            description
            if len(description) <= TRUNC
            else description[: TRUNC - 3] + "..."
        )
        print(
            f"{short:{TRUNC}}  {expected:9} {actual:9} {'PASS' if ok else 'FAIL'}"
        )

    print("-" * len(header))
    print(f"{passed}/{len(TEST_CASES)} passed")


if __name__ == "__main__":
    main()

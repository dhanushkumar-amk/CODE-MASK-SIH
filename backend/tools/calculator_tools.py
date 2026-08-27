"""Safe arithmetic calculator for the agent.

Evaluates simple math expressions WITHOUT Python's eval(): the expression
is parsed into an AST, every node is checked against a strict whitelist
(numbers, + - * / **, parentheses, unary +-), and only then evaluated by a
tiny recursive evaluator. Anything else - names, calls, attributes,
imports - is rejected outright, so untrusted input can never execute code.
"""

import ast
import sys
from pathlib import Path

# Make `tools` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/tools on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# The only AST node types and operators the calculator accepts.
_ALLOWED_OPERATORS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)
_ALLOWED_UNARY = (ast.UAdd, ast.USub)
_SAFE_FUNCTIONS = {
    "len": len,
    "int": int,
    "float": float,
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
}


def _validate_node(node: ast.AST, in_call_arg: bool = False) -> str | None:
    """Recursively check an AST node against the whitelist.

    Returns an error message if anything unsafe/unsupported is found,
    else None.
    """
    if isinstance(node, ast.Expression):
        return _validate_node(node.body, in_call_arg)
    if isinstance(node, ast.BinOp):
        if type(node.op) not in _ALLOWED_OPERATORS:
            return f"operator not allowed: {type(node.op).__name__}"
        return _validate_node(node.left, in_call_arg) or _validate_node(node.right, in_call_arg)
    if isinstance(node, ast.UnaryOp):
        if type(node.op) not in _ALLOWED_UNARY:
            return f"unary operator not allowed: {type(node.op).__name__}"
        return _validate_node(node.operand, in_call_arg)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool):
            return f"value not allowed: {node.value!r}"
        if in_call_arg and isinstance(node.value, str):
            return None
        if not isinstance(node.value, (int, float)):
            return f"value not allowed: {node.value!r}"
        return None
    if isinstance(node, ast.List) or isinstance(node, ast.Tuple):
        for elt in node.elts:
            err = _validate_node(elt, in_call_arg)
            if err:
                return err
        return None
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in _SAFE_FUNCTIONS:
            func_name = node.func.id if isinstance(node.func, ast.Name) else type(node.func).__name__
            return f"function call not allowed: {func_name}"
        for arg in node.args:
            err = _validate_node(arg, in_call_arg=True)
            if err:
                return err
        return None
    # Names, Attributes, Subscripts, imports... anything else.
    return f"expression element not allowed: {type(node).__name__}"


def _eval_node(node: ast.AST) -> int | float:
    """Evaluate a whitelist-verified AST node. Assumes _validate_node ran."""
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.List):
        return [_eval_node(elt) for elt in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(_eval_node(elt) for elt in node.elts)
    if isinstance(node, ast.Call):
        func = _SAFE_FUNCTIONS[node.func.id]
        args = [_eval_node(arg) for arg in node.args]
        return func(*args)
    if isinstance(node, ast.UnaryOp):
        value = _eval_node(node.operand)
        return +value if isinstance(node.op, ast.UAdd) else -value
    if isinstance(node, ast.BinOp):
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return left / right
        if isinstance(node.op, ast.Pow):
            return left ** right
    raise ValueError("unreachable: unvalidated node reached evaluator")


def calculate(expression: str) -> dict:
    """Safely evaluate a basic arithmetic expression.

    Only numbers, + - * / **, parentheses, and unary +/- are allowed.
    Function calls, variable names, imports, and every other construct are
    rejected before evaluation, so this cannot execute arbitrary code.

    Args:
        expression: A math expression string, e.g. "150 * 0.02 + 45 / 3".

    Returns:
        {"status": "success", "output": "<expr> = <result>",
         "result": <number>} on success, or
        {"status": "error", "output": "<clear message>"} on invalid/unsafe
        input or a math error (division by zero, overflow). Never raises.
    """
    if not isinstance(expression, str) or not expression.strip():
        return {"status": "error", "output": "Expression must be a non-empty string."}

    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError:
        return {"status": "error", "output": f"Invalid expression: {expression!r}"}

    error = _validate_node(tree)
    if error:
        return {
            "status": "error",
            "output": f"Unsafe or unsupported expression: {error}",
        }

    try:
        result = _eval_node(tree)
    except ZeroDivisionError:
        return {"status": "error", "output": "Math error: division by zero."}
    except OverflowError:
        return {"status": "error", "output": "Math error: result too large."}

    return {
        "status": "success",
        "output": f"{expression} = {result}",
        "result": result,
    }


def calculate_with_steps(description: str, expression: str) -> dict:
    """Calculate and format the result as readable, visible steps.

    Pairs a plain-English description with the expression and result, so
    the demo shows HOW the number was reached, not just the number.

    Args:
        description: Plain-English description of what is being calculated.
        expression: The math expression string.

    Returns:
        calculate()'s dict, with "output" reformatted as:
            Calculating: <description>
            Expression: <expression>
            Result: <result>
    """
    result = calculate(expression)
    if result["status"] != "success":
        return result

    steps = (
        f"Calculating: {description}\n"
        f"Expression: {expression}\n"
        f"Result: {result['result']}"
    )
    return {
        "status": "success",
        "output": steps,
        "result": result["result"],
    }


if __name__ == "__main__":
    print("TEST 1 - safe expression '150 * 0.02 + 45 / 3':")
    r1 = calculate("150 * 0.02 + 45 / 3")
    print(f"  -> {r1}")

    print("\nTEST 2 - unsafe expression \"__import__('os').system('ls')\":")
    r2 = calculate("__import__('os').system('ls')")
    print(f"  -> {r2}")
    assert r2["status"] == "error", "unsafe expression must be rejected"

    print("\nTEST 3 - division by zero '10 / 0':")
    r3 = calculate("10 / 0")
    print(f"  -> {r3}")
    assert r3["status"] == "error", "division by zero must be an error"

    print("\nTEST 4 - variable name 'x + 1':")
    r4 = calculate("x + 1")
    print(f"  -> {r4}")

    print("\nTEST 5 - calculate_with_steps:")
    r5 = calculate_with_steps(
        "total maintenance cost", "3 * 15000 + 5000"
    )
    print(f"  -> {r5}")

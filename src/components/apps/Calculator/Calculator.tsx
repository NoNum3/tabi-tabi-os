"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Delete } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Define button types for styling
type ButtonType = "number" | "operator" | "action" | "equals";

// Helper function for calculations
const calculate = (
    operand1: number,
    operand2: number,
    operator: string,
): number | string => {
    // Return string for potential errors
    switch (operator) {
        case "+":
            return operand1 + operand2;
        case "-":
            return operand1 - operand2;
        case "*":
            return operand1 * operand2;
        case "/":
            if (operand2 === 0) return "Error: Div by 0";
            return operand1 / operand2;
        default:
            return operand2; // Should not happen
    }
};

const Calculator: React.FC = () => {
    const [displayValue, setDisplayValue] = useState<string>("0");
    const [operand, setOperand] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
    const [history, setHistory] = useState<
        { expression: string; result: string }[]
    >([]);
    const [memory, setMemory] = useState<number>(0);
    const [isError, setIsError] = useState<boolean>(false);

    // Reset error state when input changes
    useEffect(() => {
        if (isError && !displayValue.startsWith("Error")) {
            setIsError(false);
        }
        if (!isError && displayValue.startsWith("Error")) {
            setIsError(true);
        }
    }, [displayValue, isError]);

    const getButtonClasses = (
        type: ButtonType,
        className: string = "",
    ): string => {
        let baseClasses =
            "text-lg sm:text-xl h-12 sm:h-14 w-full rounded-md flex items-center justify-center shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
        switch (type) {
            case "number":
                baseClasses +=
                    " bg-muted/70 hover:bg-muted text-foreground font-medium";
                break;
            case "operator":
                baseClasses +=
                    " bg-amber-500 hover:bg-amber-600 text-white font-semibold"; // Amber for operators
                break;
            case "action":
                baseClasses +=
                    " bg-secondary hover:bg-secondary/90 text-secondary-foreground";
                break;
            case "equals":
                baseClasses +=
                    " bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"; // Primary for equals
                break;
            default:
                baseClasses += " bg-muted hover:bg-muted/80 text-foreground";
        }
        return cn(baseClasses, className);
    };

    // --- Logic Functions ---
    const handleNumberClick = useCallback((num: string) => {
        if (isError) return; // Don't input numbers if error
        if (waitingForOperand) {
            setDisplayValue(num);
            setWaitingForOperand(false);
        } else {
            if (displayValue.replace(/[,.]/g, "").length >= 15) return; // Limit digits
            setDisplayValue((prev) => (prev === "0" ? num : prev + num));
        }
    }, [displayValue, waitingForOperand, isError]);

    const handleOperatorClick = useCallback((op: string) => {
        if (isError) return;
        const currentValue = parseFloat(displayValue);
        if (isNaN(currentValue)) return;

        if (operand !== null && operator && !waitingForOperand) {
            // Perform intermediate calculation if an operator and operand exist
            // and we are not waiting for a new operand (i.e., chained operations)
            const intermediateResult = calculate(
                operand,
                currentValue,
                operator,
            );
            if (typeof intermediateResult === "string") {
                setDisplayValue(intermediateResult);
                setOperand(null);
                setOperator(null);
                setWaitingForOperand(false);
                return;
            }
            setDisplayValue(String(intermediateResult));
            setOperand(intermediateResult);
        } else {
            // Otherwise, just store the current value as the operand
            setOperand(currentValue);
        }

        setOperator(op);
        setWaitingForOperand(true);
    }, [displayValue, operand, operator, isError, waitingForOperand]);

    const handleEqualsClick = useCallback(() => {
        if (
            isError || operator === null || operand === null ||
            waitingForOperand
        ) {
            // Don't calculate if error, no operator/operand, or waiting for second operand
            // Exception: allow equals if just operator is pressed after a number (use display as second operand)
            if (!waitingForOperand || operand === null || operator === null) {
                return;
            }
        }

        const currentValue = parseFloat(displayValue);
        if (isNaN(currentValue)) return;

        const result = calculate(
            operand ?? currentValue,
            currentValue,
            operator ?? "+",
        ); // Handle case where operand is null somehow?

        // Use display symbols for history
        const displayOperator = operator === "*"
            ? "×"
            : operator === "/"
            ? "÷"
            : operator;
        const expression = `${operand} ${displayOperator} ${currentValue} =`;

        if (typeof result === "string") {
            setDisplayValue(result);
            setHistory((prev) =>
                [{ expression: expression, result }, ...prev].slice(0, 50)
            );
        } else {
            const resultString = String(result);
            setDisplayValue(resultString);
            setHistory((prev) =>
                [{ expression: expression, result: resultString }, ...prev]
                    .slice(0, 50)
            );
            // Set the result as the new operand for potential chaining
            setOperand(result);
        }

        // Keep operator for potential chaining, but wait for new operand
        // setOperator(null); // Keep operator? Let's reset it.
        setOperator(null);
        setWaitingForOperand(true); // Ready for a new number after equals
    }, [displayValue, operand, operator, isError, waitingForOperand]);

    const handleClearClick = useCallback(() => {
        setDisplayValue("0");
        setOperand(null);
        setOperator(null);
        setWaitingForOperand(false);
        setIsError(false);
        // Optionally clear history: setHistory([]);
    }, []);

    const handleClearEntryClick = useCallback(() => {
        setDisplayValue("0");
        setWaitingForOperand(false); // Allow new input
        setIsError(false);
    }, []);

    const handleDecimalClick = useCallback(() => {
        if (isError) return;
        if (!displayValue.includes(".")) {
            if (displayValue.length >= 14) return;
            if (waitingForOperand) {
                setDisplayValue("0.");
                setWaitingForOperand(false);
            } else {
                setDisplayValue((prev) => prev + ".");
            }
        }
    }, [displayValue, waitingForOperand, isError]);

    const handlePlusMinusClick = useCallback(() => {
        if (isError) return;
        if (displayValue !== "0") {
            setDisplayValue((prev) => String(parseFloat(prev) * -1));
        }
    }, [displayValue, isError]);

    // --- Unary Operation Handler (Moved Before handlePercentClick) ---
    const applyUnaryOperation = useCallback((
        operation: (val: number) => number | string,
        input?: number,
    ) => {
        if (isError) return;
        const currentValue = input ?? parseFloat(displayValue);
        if (isNaN(currentValue)) return;

        const result = operation(currentValue);

        if (typeof result === "string") {
            setDisplayValue(result);
            setOperand(null);
            setOperator(null);
            setWaitingForOperand(true);
        } else {
            setDisplayValue(String(result));
            setOperand(result);
            setOperator(null);
            setWaitingForOperand(true);
        }
    }, [displayValue, isError]);

    // This now correctly references the initialized applyUnaryOperation
    const handlePercentClick = useCallback(() => {
        if (isError) return;
        applyUnaryOperation((val) => val / 100);
    }, [isError, applyUnaryOperation]);

    const handleBackspaceClick = useCallback(() => {
        if (isError) return; // Or maybe clear error?
        setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
        if (displayValue.length === 1) {
            setDisplayValue("0");
            // If we backspace the last digit, we are no longer waiting for operand
            setWaitingForOperand(false);
        }
    }, [displayValue, isError]);

    // --- Memory Functions ---
    const handleMemoryClear = useCallback(() => setMemory(0), []);
    const handleMemoryRecall = useCallback(() => {
        if (isError) return;
        setDisplayValue(String(memory));
        setWaitingForOperand(false);
    }, [memory, isError]);
    const handleMemoryAdd = useCallback(() => {
        if (isError) return;
        const currentValue = parseFloat(displayValue);
        if (!isNaN(currentValue)) setMemory((prev) => prev + currentValue);
    }, [displayValue, isError]);
    const handleMemorySubtract = useCallback(() => {
        if (isError) return;
        const currentValue = parseFloat(displayValue);
        if (!isNaN(currentValue)) setMemory((prev) => prev - currentValue);
    }, [displayValue, isError]);

    // --- Clipboard --- //
    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // console.log('Copied:', text);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    }, []);

    // --- Keyboard Support --- //
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key;

            if (!isNaN(parseInt(key))) {
                handleNumberClick(key);
            } else if (key === ".") {
                handleDecimalClick();
            } else if (
                key === "+" || key === "-" || key === "*" || key === "/"
            ) {
                handleOperatorClick(key);
            } else if (key === "Enter" || key === "=") {
                event.preventDefault(); // Prevent form submission if inside one
                handleEqualsClick();
            } else if (key === "Backspace") {
                handleBackspaceClick();
            } else if (key === "Escape") {
                handleClearClick();
            } else if (key === "%") {
                handlePercentClick();
            }
            // Add more shortcuts if needed (e.g., +/-)
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        handleNumberClick,
        handleDecimalClick,
        handleOperatorClick,
        handleEqualsClick,
        handleBackspaceClick,
        handleClearClick,
        handlePercentClick,
    ]);

    // --- Display Formatting --- //
    const formatDisplayValue = (value: string): string => {
        if (value.startsWith("Error")) return value;
        try {
            // Attempt to format as number, preserving precision
            const num = parseFloat(value);
            if (isNaN(num)) return value; // Should not happen if not Error

            // Format with commas, handle decimals
            const parts = value.split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            let formatted = parts.join(".");

            // Limit display length intelligently (e.g., keep significant digits)
            if (formatted.length > 20) {
                // Use exponential notation for very large/small numbers if needed
                if (
                    Math.abs(num) > 1e15 || (Math.abs(num) < 1e-6 && num !== 0)
                ) {
                    formatted = num.toExponential(9); // Limit precision
                } else {
                    // Truncate if too long but not needing exponential
                    formatted = formatted.slice(0, 20) + "...";
                }
            }
            return formatted;
        } catch { // Remove unused 'e'
            /*(e)*/ return value; // Fallback if formatting fails
        }
    };

    return (
        <TooltipProvider delayDuration={150}>
            <div className="flex flex-col h-full w-full bg-background text-foreground p-2 gap-2">
                {/* History Area */}
                <div className="h-20 mb-1 pr-1">
                    <ScrollArea className="h-full w-full rounded-md border border-border p-2 text-sm">
                        {history.length === 0
                            ? (
                                <p className="text-center text-muted-foreground italic">
                                    History is empty
                                </p>
                            )
                            : (
                                history.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center mb-1 border-b border-border/50 pb-1 last:border-b-0 last:pb-0 last:mb-0"
                                    >
                                        <div className="flex flex-col text-right flex-grow mr-2">
                                            <span className="text-xs text-muted-foreground">
                                                {item.expression}
                                            </span>
                                            <span className="font-medium text-foreground truncate">
                                                {item.result}
                                            </span>
                                        </div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 flex-shrink-0"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            item.result,
                                                        )}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">
                                                <p>Copy Result</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                ))
                            )}
                    </ScrollArea>
                </div>

                {/* Display */}
                <div className="bg-muted rounded-md p-3 text-right mb-2 shadow-inner overflow-hidden min-h-[60px] flex items-center justify-end">
                    <span
                        className={cn(
                            "text-4xl font-mono font-semibold break-all",
                            isError ? "text-destructive" : "text-foreground",
                        )}
                    >
                        {formatDisplayValue(displayValue)}
                    </span>
                </div>

                {/* Button Grid */}
                <div className="grid grid-cols-4 gap-2 flex-1">
                    {/* Row 1: Memory / Advanced */}
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleMemoryClear}
                    >
                        MC
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleMemoryRecall}
                    >
                        MR
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleMemoryAdd}
                    >
                        M+
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleMemorySubtract}
                    >
                        M-
                    </Button>

                    {/* Row 2 */}
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handlePercentClick}
                    >
                        %
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleClearEntryClick}
                    >
                        CE
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleClearClick}
                    >
                        C
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleBackspaceClick}
                    >
                        <Delete className="h-5 w-5" />
                    </Button>

                    {/* Row 3 */}
                    {
                        /* <Button className={getButtonClasses("action")} onClick={handleReciprocal}>1/x</Button>
                    <Button className={getButtonClasses("action")} onClick={handleSquare}>x²</Button>
                    <Button className={getButtonClasses("action")} onClick={handleSquareRoot}>√x</Button> */
                    }
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("7")}
                    >
                        7
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("8")}
                    >
                        8
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("9")}
                    >
                        9
                    </Button>
                    <Button
                        className={getButtonClasses("operator")}
                        onClick={() => handleOperatorClick("/")}
                    >
                        ÷
                    </Button>

                    {/* Row 4 */}
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("4")}
                    >
                        4
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("5")}
                    >
                        5
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("6")}
                    >
                        6
                    </Button>
                    <Button
                        className={getButtonClasses("operator")}
                        onClick={() => handleOperatorClick("*")}
                    >
                        ×
                    </Button>

                    {/* Row 5 */}
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("1")}
                    >
                        1
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("2")}
                    >
                        2
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("3")}
                    >
                        3
                    </Button>
                    <Button
                        className={getButtonClasses("operator")}
                        onClick={() => handleOperatorClick("-")}
                    >
                        -
                    </Button>

                    {/* Row 6 */}
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handlePlusMinusClick}
                    >
                        +/-
                    </Button>
                    <Button
                        className={getButtonClasses("number")}
                        onClick={() => handleNumberClick("0")}
                    >
                        0
                    </Button>
                    <Button
                        className={getButtonClasses("action")}
                        onClick={handleDecimalClick}
                    >
                        .
                    </Button>
                    <Button
                        className={getButtonClasses("equals")}
                        onClick={handleEqualsClick}
                    >
                        =
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default Calculator;

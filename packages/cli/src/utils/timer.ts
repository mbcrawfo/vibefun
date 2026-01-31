/**
 * Timer utility for tracking compilation phase timings
 */

/**
 * Phase timing information
 */
export interface PhaseTiming {
    /** Phase name */
    readonly name: string;
    /** Duration in milliseconds */
    readonly durationMs: number;
    /** Additional metadata (e.g., token count, node count) */
    readonly metadata?: Record<string, number | string>;
}

/**
 * Collection of all phase timings
 */
export interface PhaseTimings {
    /** Total duration in milliseconds */
    readonly totalMs: number;
    /** Individual phase timings */
    readonly phases: readonly PhaseTiming[];
    /** Output size in bytes (if applicable) */
    readonly outputBytes?: number;
}

/**
 * Timer for tracking compilation phases
 */
export class Timer {
    private readonly phases: PhaseTiming[] = [];
    private currentPhase: string | null = null;
    private currentStart: number | null = null;
    private currentMetadata: Record<string, number | string> = {};
    private readonly totalStart: number;
    private totalEnd: number | null = null;
    private _outputBytes: number | undefined;

    constructor() {
        this.totalStart = performance.now();
    }

    /**
     * Start timing a phase
     */
    start(phase: string): void {
        if (this.currentPhase !== null) {
            this.stop();
        }
        this.currentPhase = phase;
        this.currentStart = performance.now();
        this.currentMetadata = {};
    }

    /**
     * Add metadata to the current phase
     */
    addMetadata(key: string, value: number | string): void {
        this.currentMetadata[key] = value;
    }

    /**
     * Stop timing the current phase
     */
    stop(): void {
        if (this.currentPhase === null || this.currentStart === null) {
            return;
        }
        const durationMs = performance.now() - this.currentStart;
        const hasMetadata = Object.keys(this.currentMetadata).length > 0;
        const phase: PhaseTiming = hasMetadata
            ? { name: this.currentPhase, durationMs, metadata: { ...this.currentMetadata } }
            : { name: this.currentPhase, durationMs };
        this.phases.push(phase);
        this.currentPhase = null;
        this.currentStart = null;
        this.currentMetadata = {};
    }

    /**
     * Set the output size in bytes
     */
    setOutputBytes(bytes: number): void {
        this._outputBytes = bytes;
    }

    /**
     * Get all timings
     */
    getTimings(): PhaseTimings {
        // Stop any running phase
        if (this.currentPhase !== null) {
            this.stop();
        }

        if (this.totalEnd === null) {
            this.totalEnd = performance.now();
        }

        const result: PhaseTimings = {
            totalMs: this.totalEnd - this.totalStart,
            phases: this.phases,
        };

        if (this._outputBytes !== undefined) {
            return { ...result, outputBytes: this._outputBytes };
        }

        return result;
    }

    /**
     * Format timings for human-readable verbose output
     */
    formatVerbose(filename: string): string {
        const timings = this.getTimings();
        const lines: string[] = [];

        lines.push(`Compiling ${filename}...`);
        lines.push("");

        for (const phase of timings.phases) {
            let line = `  ${phase.name}: ${formatDuration(phase.durationMs)}`;
            if (phase.metadata) {
                const meta = Object.entries(phase.metadata)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ");
                line += ` (${meta})`;
            }
            lines.push(line);
        }

        lines.push("");
        lines.push(`Total: ${formatDuration(timings.totalMs)}`);

        if (timings.outputBytes !== undefined) {
            lines.push(`Output: ${formatBytes(timings.outputBytes)}`);
        }

        return lines.join("\n");
    }

    /**
     * Convert timings to JSON-serializable object
     */
    toJSON(): {
        totalMs: number;
        phases: Array<{ name: string; durationMs: number; metadata?: Record<string, number | string> }>;
        outputBytes?: number;
    } {
        const timings = this.getTimings();
        return {
            totalMs: timings.totalMs,
            phases: timings.phases.map((p) => ({
                name: p.name,
                durationMs: p.durationMs,
                ...(p.metadata ? { metadata: p.metadata } : {}),
            })),
            ...(timings.outputBytes !== undefined ? { outputBytes: timings.outputBytes } : {}),
        };
    }
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
    if (ms < 1) {
        return `${(ms * 1000).toFixed(0)}µs`;
    }
    if (ms < 1000) {
        return `${ms.toFixed(1)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format bytes in human-readable form
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes}B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/** Minimal typed event emitter. Handlers run synchronously in registration order. */
export type Listener<T> = (event: T) => void;
export declare class Emitter<Events extends Record<string, unknown>> {
    private readonly listeners;
    /** Subscribe. Returns a function that unsubscribes. */
    on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void;
    off<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void;
    emit<K extends keyof Events>(type: K, event: Events[K]): void;
    clear(): void;
}

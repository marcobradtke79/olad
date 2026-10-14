import { describe, expect, it, vi } from 'vitest';
import { Emitter } from './events';

type Events = { ping: { n: number }; done: undefined };

describe('Emitter', () => {
  it('calls listeners in order and unsubscribes', () => {
    const emitter = new Emitter<Events>();
    const calls: number[] = [];
    const off = emitter.on('ping', (e) => calls.push(e.n));
    emitter.on('ping', (e) => calls.push(e.n * 10));
    emitter.emit('ping', { n: 1 });
    off();
    emitter.emit('ping', { n: 2 });
    expect(calls).toEqual([1, 10, 20]);
  });

  it('tolerates listeners removed during emit', () => {
    const emitter = new Emitter<Events>();
    const second = vi.fn();
    emitter.on('done', () => emitter.off('done', second));
    emitter.on('done', second);
    emitter.emit('done', undefined);
    expect(second).toHaveBeenCalledTimes(1);
    emitter.emit('done', undefined);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clear removes everything', () => {
    const emitter = new Emitter<Events>();
    const fn = vi.fn();
    emitter.on('ping', fn);
    emitter.clear();
    emitter.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });
});

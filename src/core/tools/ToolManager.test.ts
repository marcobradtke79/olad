import { describe, expect, it, vi } from 'vitest';
import type { Tool, ToolContext, ToolOptions } from './Tool';
import { ToolManager } from './ToolManager';

function fakeTool(id: string, can = true): Tool & { log: string[] } {
  const log: string[] = [];
  return {
    id,
    log,
    canActivate: (_ctx, options) => can && options?.type !== 'Polygon',
    activate: (_ctx, options) => log.push(`activate${options?.type ? `:${options.type}` : ''}`),
    deactivate: () => log.push('deactivate'),
    cancel: () => log.push('cancel'),
    finish: () => log.push('finish'),
    removeLastPoint: () => log.push('removeLastPoint') > 0,
    handleInput: (coordinate) => {
      log.push(`input:${coordinate.join(',')}`);
      return coordinate[0] === 1;
    },
    handleValue: (value) => {
      log.push(`value:${value}`);
      return value === 5;
    },
    setSuspended: (on) => log.push(`suspend:${on}`),
    referencePoint: () => [1, 2],
  };
}

const ctx = { getLengthUnit: () => 'm' } as unknown as ToolContext;

describe('ToolManager', () => {
  it('keeps exactly one tool active and reports changes', () => {
    const onToolChange = vi.fn();
    const manager = new ToolManager(ctx, { onToolChange });
    const a = fakeTool('a');
    const b = fakeTool('b');
    manager.register(a);
    manager.register(b);
    expect(() => manager.register(fakeTool('a'))).toThrow(/already registered/);
    expect(manager.list()).toEqual(['a', 'b']);
    expect(manager.getActive()).toBeNull();
    expect(manager.activate('a')).toBe(true);
    expect(manager.getActive()).toBe('a');
    expect(manager.activate('b')).toBe(true);
    expect(a.log).toEqual(['activate', 'deactivate']);
    expect(b.log).toEqual(['activate']);
    expect(onToolChange.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
    manager.deactivate();
    manager.deactivate(); // no-op
    expect(onToolChange).toHaveBeenLastCalledWith(null, {});
    expect(onToolChange).toHaveBeenCalledTimes(3);
    expect(() => manager.activate('zzz')).toThrow(/Unknown tool/);
  });

  it('passes options through and reports the ones in effect', () => {
    const onToolChange = vi.fn();
    const manager = new ToolManager(ctx, { onToolChange });
    const plain = fakeTool('plain');
    const resolving = {
      ...fakeTool('resolving'),
      getOptions: (): ToolOptions => ({ type: 'LineString' }),
    };
    manager.register(plain);
    manager.register(resolving);
    expect(manager.getActiveOptions()).toEqual({});
    expect(manager.canActivate('plain', { type: 'Polygon' })).toBe(false);
    expect(manager.activate('plain', { type: 'Polygon' })).toBe(false);
    expect(manager.activate('plain', { type: 'Point' })).toBe(true);
    expect(plain.log).toEqual(['activate:Point']);
    expect(manager.getActiveOptions()).toEqual({ type: 'Point' });
    expect(onToolChange).toHaveBeenLastCalledWith('plain', { type: 'Point' });
    // A tool that resolves its options reports those, not the ones it was given.
    expect(manager.activate('resolving')).toBe(true);
    expect(manager.getActiveOptions()).toEqual({ type: 'LineString' });
    expect(onToolChange).toHaveBeenLastCalledWith('resolving', { type: 'LineString' });
    manager.deactivate();
    expect(manager.getActiveOptions()).toEqual({});
    expect(onToolChange).toHaveBeenLastCalledWith(null, {});
  });

  it('respects canActivate and forwards cancel, finish, input and suspension', () => {
    const manager = new ToolManager(ctx, { onToolChange: vi.fn() });
    const blocked = fakeTool('blocked', false);
    const tool = fakeTool('tool');
    manager.register(blocked);
    manager.register(tool);
    expect(manager.canActivate('blocked')).toBe(false);
    expect(manager.canActivate('nope')).toBe(false);
    expect(manager.activate('blocked')).toBe(false);
    expect(manager.getActive()).toBeNull();
    manager.cancel(); // nothing active: no error
    expect(manager.handleValue(5)).toBe(false);
    manager.suspend(true);
    manager.activate('tool');
    expect(tool.log).toEqual(['activate', 'suspend:true']);
    manager.cancel();
    manager.finish();
    manager.removeLastPoint();
    expect(manager.handleInput([1, 0])).toBe(true);
    expect(manager.handleInput([2, 0])).toBe(false);
    expect(manager.handleValue(5)).toBe(true);
    expect(manager.handleValue(2)).toBe(false);
    expect(manager.referencePoint()).toEqual([1, 2]);
    manager.suspend(false);
    expect(tool.log.slice(2)).toEqual([
      'cancel',
      'finish',
      'removeLastPoint',
      'input:1,0',
      'input:2,0',
      'value:5',
      'value:2',
      'suspend:false',
    ]);
  });
});

describe('ToolManager prompts', () => {
  it('reports the active tool prompt or null', () => {
    const manager = new ToolManager(ctx, { onToolChange: vi.fn() });
    const silent = fakeTool('silent');
    const talking = { ...fakeTool('talking'), getPrompt: () => 'Pick a point' };
    manager.register(silent);
    manager.register(talking);
    expect(manager.getPrompt()).toBeNull();
    manager.activate('silent');
    expect(manager.getPrompt()).toBeNull();
    manager.activate('talking');
    expect(manager.getPrompt()).toBe('Pick a point');
    manager.deactivate();
    expect(manager.getPrompt()).toBeNull();
  });
});

describe('ToolManager input requests', () => {
  it("passes the active tool's request through, null without a tool or getter", () => {
    const manager = new ToolManager(ctx, { onToolChange: vi.fn() });
    let request: 'text' | 'value' | null = 'value';
    manager.register(fakeTool('plain'));
    manager.register({ ...fakeTool('asking'), getInputRequest: () => request });
    expect(manager.getInputRequest()).toBeNull();
    manager.activate('plain');
    expect(manager.getInputRequest()).toBeNull();
    manager.activate('asking');
    expect(manager.getInputRequest()).toBe('value');
    request = 'text';
    expect(manager.getInputRequest()).toBe('text');
    manager.deactivate();
    expect(manager.getInputRequest()).toBeNull();
  });
});

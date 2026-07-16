import { describe, expect, it } from 'vitest';
import type { Clip, Track } from '../../src/types/scene';
import {
  allocateOverlayTrack,
  compactMainTrack,
  isTrackCompatible,
  moveClipToTrack,
  removeClipFromTracks,
  trimClipOnTrack,
} from '../../src/ui/timeline-tracks';

const track = (overrides: Partial<Track>): Track => ({
  id: 'main',
  label: 'Main Track',
  role: 'main',
  content: 'primary',
  hidden: false,
  muted: false,
  order: 0,
  declared: true,
  ...overrides,
});

const clip = (id: string, start: number, duration: number, trackId = 'main'): Clip => ({
  id,
  assetName: id,
  asset: { name: id, path: `/${id}.mp4`, type: 'video' },
  track: trackId,
  start,
  duration,
  trimIn: 0,
  trimOut: 2,
  transitionInDuration: 0,
  transitionOutDuration: 0,
  sourceOrder: 0,
});

describe('role-based timeline editing', () => {
  it('reuses only compatible non-overlapping overlays', () => {
    const text = track({ id: 'text-1', role: 'overlay', content: 'text', order: 1 });
    const video = track({ id: 'video-1', role: 'overlay', content: 'video', order: 2 });
    expect(
      allocateOverlayTrack(
        [text, video],
        [{ trackId: 'video-1', content: 'video', start: 0, end: 2 }],
        'video',
        2,
        4
      )
    ).toMatchObject({ track: { id: 'video-1' }, created: false });
    expect(
      allocateOverlayTrack(
        [text, video],
        [{ trackId: 'video-1', content: 'video', start: 0, end: 3 }],
        'video',

        2,
        4
      )
    ).toMatchObject({ track: { id: 'overlay-video-1' }, created: true });
    expect(isTrackCompatible(text, 'video')).toBe(false);
  });

  it('does not place new text over media occupying a mixed overlay', () => {
    const mixed = track({ id: 'mixed', role: 'overlay', content: 'mixed', order: 1 });
    const allocation = allocateOverlayTrack(
      [mixed],
      [{ trackId: 'mixed', content: 'image', start: 0, end: 4 }],
      'text',
      1,
      3
    );
    expect(allocation).toMatchObject({
      created: true,
      track: { id: 'overlay-text-1', content: 'text' },
    });
  });

  it('packs main clips gap-free and reorders by requested position', () => {
    const clips = [clip('a', 2, 2), clip('b', 8, 3), clip('c', 20, 1)];
    expect(compactMainTrack(clips, 'main').map(({ id, start }) => [id, start])).toEqual([
      ['a', 0],
      ['b', 2],
      ['c', 5],
    ]);
    const moved = moveClipToTrack(clips, 'c', track({}), 0, 20, true)!;
    expect(moved.map(({ id, start }) => [id, start])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 3],
    ]);
  });

  it('closes main gaps after delete and ripples followers after trim', () => {
    const tracks = [track({})];
    const clips = [clip('a', 0, 2), clip('b', 2, 3), clip('c', 5, 1)];
    expect(removeClipFromTracks(clips, 'b', tracks).map(({ id, start }) => [id, start])).toEqual([
      ['a', 0],
      ['c', 2],
    ]);
    const trimmed = trimClipOnTrack(clips, 'a', 'end', 1, tracks, 1 / 60, true);
    expect(trimmed.map(({ id, start, duration }) => [id, start, duration])).toEqual([
      ['a', 0, 1],
      ['b', 1, 3],
      ['c', 4, 1],
    ]);
  });
});

describe('cross-track main ripple', () => {
  it('compacts the source main track after a vertical move to overlay', () => {
    const main = track({});
    const overlay = track({ id: 'video-overlay', role: 'overlay', content: 'video', order: 1 });
    const clips = [clip('a', 0, 2), clip('b', 2, 2), clip('c', 4, 2)];
    const moved = moveClipToTrack(clips, 'b', overlay, 5, 10, true, [main, overlay])!;
    expect(moved.find((item) => item.id === 'a')?.start).toBe(0);
    expect(moved.find((item) => item.id === 'c')?.start).toBe(2);
    expect(moved.find((item) => item.id === 'b')).toMatchObject({
      track: 'video-overlay',
      start: 5,
    });
  });
});

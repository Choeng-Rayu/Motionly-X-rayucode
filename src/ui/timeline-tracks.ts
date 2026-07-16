import type { Clip, Track, TrackContent } from '../types/scene';
import { moveClip, trimClipEnd, trimClipStart, type ClipTiming } from './clip-timing';

export interface TrackAllocationItem {
  trackId: string;
  content: TrackContent;
  start: number;
  end: number;
}

export interface TrackAllocation {
  track: Track;
  created: boolean;
}

export function clipContent(clip: Clip): TrackContent {
  if (clip.asset?.type === 'video') return 'video';
  return 'image';
}

export function isTrackCompatible(track: Track, content: TrackContent): boolean {
  if (track.role === 'audio') return content === 'audio';
  if (track.role === 'main')
    return content === 'video' || content === 'image' || content === 'primary';
  return track.content === content || track.content === 'mixed';
}

/** Reuse a compatible overlay only when the requested interval does not overlap it. */
export function allocateOverlayTrack(
  tracks: Track[],
  items: TrackAllocationItem[],
  content: TrackContent,
  start: number,
  end: number
): TrackAllocation {
  const reusable = tracks
    .filter((track) => track.role === 'overlay' && isTrackCompatible(track, content))
    .sort((left, right) => left.order - right.order)
    .find((track) =>
      items
        .filter((item) => item.trackId === track.id)
        .every((item) => item.end <= start || item.start >= end)
    );
  if (reusable) return { track: reusable, created: false };

  const used = new Set(tracks.map((track) => track.id));
  const base = `overlay-${content}`;
  let suffix = 1;
  let id = `${base}-${suffix}`;
  while (used.has(id)) id = `${base}-${++suffix}`;
  const order = Math.max(0, ...tracks.map((track) => track.order)) + 1;
  return {
    track: {
      id,
      label: overlayLabel(content, suffix),
      role: 'overlay',
      content,
      hidden: false,
      muted: false,
      order,
      declared: true,
    },
    created: true,
  };
}

/** Pack the authored order of a main track into one gap-free sequence. */
export function compactMainTrack(clips: Clip[], trackId: string): Clip[] {
  let cursor = 0;
  const starts = new Map<string, number>();
  [...clips]
    .filter((clip) => String(clip.track) === trackId)
    .sort((left, right) => left.start - right.start || left.sourceOrder - right.sourceOrder)
    .forEach((clip) => {
      starts.set(clip.id, cursor);
      cursor += clip.duration;
    });
  return clips.map((clip) =>
    starts.has(clip.id) ? { ...clip, start: starts.get(clip.id) ?? clip.start } : clip
  );
}

/** Reorder within main, or position freely on a compatible overlay track. */
export function moveClipToTrack(
  clips: Clip[],
  clipId: string,
  targetTrack: Track,
  requestedStart: number,
  timelineDuration: number,
  magnet = true,
  tracks: Track[] = [targetTrack]
): Clip[] | null {
  const moving = clips.find((clip) => clip.id === clipId);
  if (!moving || !isTrackCompatible(targetTrack, clipContent(moving))) return null;
  const remaining = clips.filter((clip) => clip.id !== clipId);
  const moved = { ...moving, track: targetTrack.id };

  if (targetTrack.role === 'main' && magnet) {
    const targetClips = remaining
      .filter((clip) => String(clip.track) === targetTrack.id)
      .sort((left, right) => left.start - right.start || left.sourceOrder - right.sourceOrder);
    const others = remaining.filter((clip) => String(clip.track) !== targetTrack.id);
    let cursor = 0;
    let insertion = targetClips.length;
    for (let index = 0; index < targetClips.length; index += 1) {
      const candidate = targetClips[index];
      if (!candidate) continue;
      if (requestedStart < cursor + candidate.duration / 2) {
        insertion = index;
        break;
      }
      cursor += candidate.duration;
    }
    targetClips.splice(insertion, 0, moved);
    let packedStart = 0;
    const packed = targetClips.map((clip) => {
      const next = { ...clip, start: packedStart };
      packedStart += clip.duration;
      return next;
    });
    return [...others, ...packed];
  }

  const timing = moveClip(moved, requestedStart, timelineDuration);
  const positioned = [...remaining, { ...moved, ...timing }];
  const sourceTrack = tracks.find((track) => track.id === String(moving.track));
  return magnet && sourceTrack?.role === 'main' && sourceTrack.id !== targetTrack.id
    ? compactMainTrack(positioned, sourceTrack.id)
    : positioned;
}

export function removeClipFromTracks(
  clips: Clip[],
  clipId: string,
  tracks: Track[],
  magnet = true
): Clip[] {
  const removed = clips.find((clip) => clip.id === clipId);
  const remaining = clips.filter((clip) => clip.id !== clipId);
  if (!removed || !magnet) return remaining;
  const track = tracks.find((candidate) => candidate.id === String(removed.track));
  return track?.role === 'main' ? compactMainTrack(remaining, track.id) : remaining;
}

export function trimClipOnTrack(
  clips: Clip[],
  clipId: string,
  edge: 'start' | 'end',
  requestedTime: number,
  tracks: Track[],
  minimum: number,
  magnet = true
): Clip[] {
  const updated = clips.map((clip) => {
    if (clip.id !== clipId) return clip;
    const timing =
      edge === 'start'
        ? trimClipStart(clip as ClipTiming, requestedTime, minimum)
        : trimClipEnd(clip as ClipTiming, requestedTime, minimum);
    return { ...clip, ...timing };
  });
  const clip = updated.find((candidate) => candidate.id === clipId);
  const track = clip ? tracks.find((candidate) => candidate.id === String(clip.track)) : undefined;
  return magnet && track?.role === 'main' ? compactMainTrack(updated, track.id) : updated;
}

function overlayLabel(content: TrackContent, suffix: number): string {
  const name =
    content === 'text'
      ? 'Text'
      : content === 'video'
        ? 'Video'
        : content === 'image'
          ? 'Image'
          : content === 'effect'
            ? 'Effects'
            : 'Overlay';
  return `${name} Overlay ${suffix}`;
}

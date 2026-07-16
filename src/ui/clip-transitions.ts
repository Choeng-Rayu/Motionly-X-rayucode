import type { Clip, ClipTransitionType } from '../types/scene';

export interface ClipTransitionBoundary {
  outgoing: Clip;
  incoming: Clip;
  at: number;
  type: ClipTransitionType | null;
  duration: number;
}

export interface PairedClipTransition {
  type: ClipTransitionType;
  duration: number;
  outgoing: {
    transitionOut: ClipTransitionType;
    transitionOutDuration: number;
  };
  incoming: {
    transitionIn: ClipTransitionType;
    transitionInDuration: number;
  };
}

const sameTrack = (left: Clip, right: Clip) => String(left.track) === String(right.track);

/** Return same-track cuts whose clip edges touch within one frame (or a supplied tolerance). */
export function adjacentClipBoundaries(
  clips: Clip[],
  tolerance = 1 / 60
): ClipTransitionBoundary[] {
  const boundaries: ClipTransitionBoundary[] = [];
  const byTrack = new Map<string, Clip[]>();
  for (const clip of clips) {
    const key = String(clip.track);
    byTrack.set(key, [...(byTrack.get(key) ?? []), clip]);
  }

  for (const trackClips of byTrack.values()) {
    const sorted = [...trackClips].sort(
      (left, right) => left.start - right.start || left.sourceOrder - right.sourceOrder
    );
    for (const outgoing of sorted) {
      const at = outgoing.start + outgoing.duration;
      const incoming = sorted.find(
        (candidate) => candidate.id !== outgoing.id && Math.abs(candidate.start - at) <= tolerance
      );
      if (!incoming || !sameTrack(outgoing, incoming)) continue;
      const paired =
        outgoing.transitionOut === 'crossfade' && incoming.transitionIn === 'crossfade';
      boundaries.push({
        outgoing,
        incoming,
        at,
        type: paired ? 'crossfade' : null,
        duration: paired
          ? Math.min(outgoing.transitionOutDuration, incoming.transitionInDuration)
          : 0,
      });
    }
  }

  return boundaries.sort(
    (left, right) =>
      Number(left.outgoing.track) - Number(right.outgoing.track) || left.at - right.at
  );
}

/** Build matching metadata for both sides of an adjacent cut. */
export function applyClipTransition(
  outgoing: Clip,
  incoming: Clip,
  requestedDuration: number,
  tolerance = 1 / 60
): PairedClipTransition | null {
  const cut = outgoing.start + outgoing.duration;
  if (!sameTrack(outgoing, incoming) || Math.abs(incoming.start - cut) > tolerance) {
    return null;
  }
  const finiteDuration = Number.isFinite(requestedDuration) ? requestedDuration : 0.5;
  const maximumDuration = Math.min(outgoing.duration, incoming.duration);
  if (maximumDuration <= 0) return null;
  const duration = Math.min(
    maximumDuration,
    Math.max(Math.min(1 / 120, maximumDuration), finiteDuration)
  );
  return {
    type: 'crossfade',
    duration,
    outgoing: { transitionOut: 'crossfade', transitionOutDuration: duration },
    incoming: { transitionIn: 'crossfade', transitionInDuration: duration },
  };
}

/** Transition properties removed from each side of a paired cut. */
export function removedClipTransitionProperties(): {
  outgoing: readonly ['transitionOut', 'transitionOutDuration'];
  incoming: readonly ['transitionIn', 'transitionInDuration'];
} {
  return {
    outgoing: ['transitionOut', 'transitionOutDuration'],
    incoming: ['transitionIn', 'transitionInDuration'],
  };
}

/** Extra active time needed for the outgoing side of a crossfade. */
export function clipTransitionTail(clip: Clip): number {
  return clip.transitionOut === 'crossfade' ? Math.max(0, clip.transitionOutDuration) : 0;
}

/** Multiplicative opacity envelope contributed by a clip transition. */
export function clipTransitionOpacity(clip: Clip, time: number): number {
  let opacity = 1;
  if (clip.transitionIn === 'crossfade' && clip.transitionInDuration > 0) {
    opacity *= clamp01((time - clip.start) / clip.transitionInDuration);
  }
  const end = clip.start + clip.duration;
  if (clip.transitionOut === 'crossfade' && clip.transitionOutDuration > 0 && time >= end) {
    opacity *= 1 - clamp01((time - end) / clip.transitionOutDuration);
  }
  return opacity;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

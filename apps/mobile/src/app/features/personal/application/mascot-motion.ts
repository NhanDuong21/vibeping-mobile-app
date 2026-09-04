export type MascotState = 'resting' | 'working' | 'waiting' | 'completed' | 'failed' | 'offline';
export function mascotState(kind: string): MascotState {
  if (kind === 'working' || kind === 'preview') return 'working';
  if (kind === 'waiting' || kind === 'completed' || kind === 'failed') return kind;
  if (kind === 'offline' || kind === 'stopped' || kind === 'unconfirmed') return 'offline';
  return 'resting';
}
export function ambientMotion(state: MascotState): { frames: Keyframe[]; duration: number } | null {
  if (state === 'working' || state === 'resting')
    return {
      frames: [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-1.5px) scale(1.02)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      duration: state === 'working' ? 3200 : 6200,
    };
  if (state === 'waiting')
    return {
      frames: [
        { transform: 'rotate(0)' },
        { transform: 'rotate(-3deg)', offset: 0.03 },
        { transform: 'rotate(3deg)', offset: 0.07 },
        { transform: 'rotate(-2deg)', offset: 0.11 },
        { transform: 'rotate(0)', offset: 0.16 },
        { transform: 'rotate(0)' },
      ],
      duration: 8000,
    };
  return null;
}
export function reactionMotion(state: MascotState): Keyframe[] {
  if (state === 'failed')
    return [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ];
  return [
    { transform: 'scale(1) translateY(0)' },
    { transform: 'scale(1.12) translateY(-4px)', offset: 0.32 },
    { transform: 'scale(0.97) translateY(0)', offset: 0.7 },
    { transform: 'scale(1) translateY(0)' },
  ];
}

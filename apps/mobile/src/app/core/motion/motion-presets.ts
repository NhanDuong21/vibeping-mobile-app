export const MOTION_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export type MotionCue = 'arrive' | 'ping' | 'success' | 'failure' | 'draw' | 'mascot';

export const MOTION_FRAMES: Record<MotionCue, Keyframe[]> = {
  arrive: [
    { opacity: 0.4, transform: 'translateY(10px)' },
    { opacity: 1, transform: 'none' },
  ],
  ping: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.16)', offset: 0.3 },
    { transform: 'scale(0.98)', offset: 0.65 },
    { transform: 'scale(1)' },
  ],
  success: [
    { transform: 'translateY(0)', outline: '0px solid transparent' },
    { transform: 'translateY(-3px)', outline: '2px solid #45d395', offset: 0.3 },
    { transform: 'translateY(0)', outline: '10px solid transparent' },
  ],
  failure: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-3px)', offset: 0.2 },
    { transform: 'translateX(3px)', offset: 0.4 },
    { transform: 'translateX(-2px)', offset: 0.6 },
    { transform: 'translateX(0)' },
  ],
  draw: [
    { strokeDasharray: '1', strokeDashoffset: '1' },
    { strokeDasharray: '1', strokeDashoffset: '0' },
  ],
  mascot: [
    { transform: 'scale(0.88) rotate(-8deg)' },
    { transform: 'scale(1.06) rotate(3deg)', offset: 0.55 },
    { transform: 'scale(1) rotate(0)' },
  ],
};

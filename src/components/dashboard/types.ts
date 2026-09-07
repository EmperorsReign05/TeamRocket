import type { RobotState } from '@/core/types';

export type LogEntry = {
  time: string;
  text: string;
  type: 'info' | 'warning' | 'error';
};

export const ROBOT_COLORS: Record<string, string> = {
  'AMR-01': '#3b82f6',
  'AMR-02': '#f59e0b',
  'AMR-03': '#22c55e',
  'AMR-04': '#a855f7',
  'AMR-05': '#ec4899',
  'AMR-06': '#06b6d4',
  'AMR-07': '#eab308',
  'AMR-08': '#6366f1',
};

export function getRobotColor(id: string, index: number): string {
  if (ROBOT_COLORS[id]) return ROBOT_COLORS[id];
  const palette = ['#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#ec4899', '#06b6d4', '#eab308', '#6366f1'];
  return palette[index % palette.length];
}

export function getRobotHeading(robot: RobotState): 'up' | 'down' | 'left' | 'right' | undefined {
  if (!robot.path || robot.path.length < 2) return undefined;
  const next = robot.path[1];
  if (next.x > robot.position.x) return 'right';
  if (next.x < robot.position.x) return 'left';
  if (next.y > robot.position.y) return 'down';
  if (next.y < robot.position.y) return 'up';
  return undefined;
}

import type { RobotState } from '@/core/types';

export type LogEntry = {
  time: string;
  text: string;
  type: 'info' | 'warning' | 'error';
};

export const ROBOT_COLORS: Record<string, string> = {
  'AMR-01': '#38BDF8',
  'AMR-02': '#FB923C',
  'AMR-03': '#C084FC',
};

export function getRobotColor(id: string, index: number): string {
  if (ROBOT_COLORS[id]) return ROBOT_COLORS[id];
  const palette = ['#38BDF8', '#FB923C', '#C084FC', '#F472B6', '#818CF8'];
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

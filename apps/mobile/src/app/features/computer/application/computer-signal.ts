import type { ComputerStatusDto } from '../../../core/api/api-client';

export function computerSignal(status: ComputerStatusDto) {
  const nodes = [
    { label: 'Laptop', ready: status.desktop === 'running', path: 'M5 5h14v11H5zM2 20h20' },
    {
      label: 'Codex',
      ready: status.codex === 'connected',
      path: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
    },
    { label: 'VibePing', ready: status.desktop === 'running', path: 'M3 12h4l3-7 4 14 3-7h4' },
    {
      label: 'Riêng tư',
      ready: status.privateConnection === 'ready',
      path: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z',
    },
    { label: 'iPhone', ready: status.notifications === 'ready', path: 'M7 2h10v20H7zM11 18h2' },
  ];
  const firstBlocked = nodes.findIndex((node) => !node.ready);
  return {
    nodes,
    reached: firstBlocked < 0 ? nodes.length - 1 : Math.max(0, firstBlocked - 1),
    complete: firstBlocked < 0,
    message:
      firstBlocked < 0
        ? 'Sẵn sàng theo lần kiểm tra gần nhất.'
        : `Cần kiểm tra tại ${nodes[firstBlocked].label}.`,
  };
}

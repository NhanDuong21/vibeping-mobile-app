import { SignalPipeline } from './signal-pipeline';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { ComputerStore } from '../application/computer.store';

@Component({
  selector: 'app-computer-page',
  imports: [SignalPipeline, RouterLink, PullToRefresh],
  templateUrl: './computer-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComputerPage implements OnInit {
  protected readonly computer = inject(ComputerStore);

  ngOnInit(): void {
    void this.computer.load();
  }

  protected ready(value: string): boolean {
    return ['running', 'connected', 'available', 'noWindows', 'ready'].includes(value);
  }

  protected detail(key: string, value: string): string {
    const labels: Record<string, Record<string, string>> = {
      desktop: { running: 'Đang chạy trên laptop' },
      codex: {
        connected: 'Đã nhận tín hiệu từ Codex',
        needsReview: 'Cần duyệt kết nối một lần trên laptop',
        reconnecting: 'Đang kết nối lại',
        notInstalled: 'Chưa cài tích hợp',
      },
      allowance: {
        available: 'Đã cập nhật được hạn mức',
        noWindows: 'Đã kết nối, chưa có chu kỳ',
        stale: 'Đang giữ dữ liệu gần nhất',
        unavailable: 'Chưa đọc được hạn mức',
      },
      notifications: {
        ready: 'iPhone đã đăng ký nhận',
        needsAttention: 'Điện thoại cần bật lại thông báo',
      },
      private: {
        ready: 'Đang dùng kết nối Tailscale riêng tư',
        unavailable: 'Chưa xác nhận được kết nối riêng tư',
      },
    };
    return labels[key]?.[value] ?? 'Cần kiểm tra lại';
  }
}

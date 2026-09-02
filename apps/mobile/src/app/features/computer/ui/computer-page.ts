import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomNavigation } from '../../../core/navigation/ui/bottom-navigation';
import { ComputerStore } from '../application/computer.store';

@Component({
  selector: 'app-computer-page',
  imports: [RouterLink, BottomNavigation],
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
        connected: 'Tích hợp đang nhận tín hiệu',
        needsReview: 'Đang chờ tín hiệu từ lượt Codex tiếp theo',
        reconnecting: 'Đang kết nối lại',
        notInstalled: 'Chưa cài tích hợp',
      },
      allowance: {
        available: 'Đang đọc được các chu kỳ',
        noWindows: 'Đã kết nối, chưa có chu kỳ',
        stale: 'Đang giữ dữ liệu gần nhất',
        unavailable: 'Chưa đọc được hạn mức',
      },
      notifications: {
        ready: 'iPhone đã đăng ký nhận',
        needsAttention: 'Cần đăng ký lại trên iPhone',
      },
      private: {
        ready: 'Đang dùng kết nối Tailscale riêng tư',
        unavailable: 'Chưa xác nhận được kết nối riêng tư',
      },
    };
    return labels[key]?.[value] ?? 'Cần kiểm tra lại';
  }
}

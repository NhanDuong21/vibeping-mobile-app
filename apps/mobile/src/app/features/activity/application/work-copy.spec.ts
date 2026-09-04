import { workName, workPreview } from './work-copy';

describe('Work names and previews', () => {
  it('keeps useful titles and distinguishes missing or internal titles by time', () => {
    const at = '2026-09-04T12:45:00Z';
    expect(workName('Hiển thị Rust nổi bật trên GitHub', at)).toBe(
      'Hiển thị Rust nổi bật trên GitHub',
    );
    for (const title of [null, 'Phiên làm việc VibePing', 'Lượt làm việc 2', 'disposition: ship'])
      expect(workName(title, at)).toMatch(/^Công việc VibePing · \d{2}:\d{2}$/);
    expect(workName(null, at)).not.toBe(workName(null, '2026-09-04T12:12:00Z'));
  });

  it('skips review headings, code and internal paths before selecting one readable sentence', () => {
    expect(
      workPreview(
        '# Kết quả\ndisposition: ship\nNo separate quality-bar card was supplied.\n.impeccable/review/mobile.png\nHoạt động → Chi tiết phiên → Chi tiết lượt.\n```ts\nconst title = "Technical output";\n```\n- Đã gom các hoạt động cùng công việc thành một mục. Câu tiếp theo không dùng.',
      ),
    ).toBe('Đã gom các hoạt động cùng công việc thành một mục.');
    expect(workPreview('verdict: recapture\nmaterial_fixes: []\nĐã commit và push bản mới.')).toBe(
      'Đã có kết quả từ Codex',
    );
  });

  it('bounds long previews and leaves the full source untouched', () => {
    const source = '**Đã hoàn thiện** ' + 'nội dung '.repeat(30);
    expect(workPreview(source).length).toBeLessThanOrEqual(180);
    expect(workPreview(source)).toMatch(/^Đã hoàn thiện .*…$/);
    expect(source).toContain('**Đã hoàn thiện**');
  });

  it('skips internal validation phrases without rejecting useful JSON or metadata outcomes', () => {
    const internal = 'Validated JSON and narrative mapping for the interface.';
    expect(workPreview(internal)).toBe('Đã có kết quả từ Codex');
    expect(workPreview(`${internal}\nĐã thêm nút tải xuống cho kết quả.`)).toBe(
      'Đã thêm nút tải xuống cho kết quả.',
    );
    expect(workPreview('Bạn đã có thể tải dữ liệu JSON.')).toBe('Bạn đã có thể tải dữ liệu JSON.');
    expect(workPreview('Ảnh tải xuống giữ nguyên metadata.')).toBe(
      'Ảnh tải xuống giữ nguyên metadata.',
    );
  });
});

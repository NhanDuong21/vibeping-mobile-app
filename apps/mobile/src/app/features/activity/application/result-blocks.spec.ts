import { TestBed } from '@angular/core/testing';
import { ResultBody } from '../ui/result-body';
import { resultBlocks } from './result-blocks';

describe('Codex answer reader', () => {
  it('renders paragraphs, headings, lists, and code while retaining code whitespace', () => {
    expect(
      resultBlocks(
        '**Đã sửa xong.**\n\n## Kiểm chứng\n- Đã qua\n- Đã phát hành\n```ts\n  const done = true;\n```',
      ),
    ).toEqual([
      { kind: 'paragraph', lines: ['Đã sửa xong.'] },
      { kind: 'heading', lines: ['Kiểm chứng'] },
      { kind: 'list', lines: ['Đã qua', 'Đã phát hành'] },
      { kind: 'code', lines: ['  const done = true;'] },
    ]);
    expect(resultBlocks('```\ncode cut off')[0].lines).toEqual(['code cut off']);
  });

  it('keeps untrusted HTML as text and never loads images or executes links', () => {
    const fixture = TestBed.createComponent(ResultBody);
    fixture.componentRef.setInput(
      'text',
      '<img src=x onerror=alert(1)>\n[Nhấn](javascript:alert)\n![Ảnh](https://example.test/tracker)',
    );
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('img, a, script, iframe')).toBeNull();
    expect(host.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(host.textContent).toContain('Nhấn');
    expect(host.textContent).not.toContain('javascript:');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PAGE_RELOAD, PullToRefresh } from './pull-to-refresh';

@Component({
  imports: [PullToRefresh],
  template: '<app-pull-to-refresh><div data-target></div></app-pull-to-refresh>',
})
class TestHost {}

describe('PullToRefresh', () => {
  let reload: ReturnType<typeof vi.fn>;
  let surface: HTMLElement;
  let target: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<TestHost>>;

  beforeEach(() => {
    vi.useFakeTimers();
    reload = vi.fn();
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [{ provide: PAGE_RELOAD, useValue: reload }],
    });
    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    surface = fixture.nativeElement.querySelector('app-pull-to-refresh') as HTMLElement;
    target = fixture.nativeElement.querySelector('[data-target]') as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('reloads only after a deliberate pull from the top', () => {
    dispatchTouch(target, 'touchstart', 40, 100);
    const move = dispatchTouch(target, 'touchmove', 42, 220);
    fixture.detectChanges();

    expect(move.defaultPrevented).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Thả để làm mới');

    dispatchTouch(target, 'touchend');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đang làm mới');

    vi.advanceTimersByTime(160);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('cancels a short pull and ignores content that is already scrolled', () => {
    dispatchTouch(target, 'touchstart', 40, 100);
    dispatchTouch(target, 'touchmove', 40, 155);
    dispatchTouch(target, 'touchend');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Kéo xuống để làm mới');
    expect(reload).not.toHaveBeenCalled();

    surface.scrollTop = 8;
    dispatchTouch(target, 'touchstart', 40, 100);
    const move = dispatchTouch(target, 'touchmove', 40, 240);

    expect(move.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

function dispatchTouch(
  target: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientX = 0,
  clientY = 0,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touch = { clientX, clientY };
  Object.defineProperty(event, 'touches', {
    value:
      type === 'touchend'
        ? { length: 0, item: () => null }
        : { 0: touch, length: 1, item: () => touch },
  });
  target.dispatchEvent(event);
  return event;
}

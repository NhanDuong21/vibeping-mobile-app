import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { SwUpdate } from '@angular/service-worker';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/provide';
import { App } from './app';

describe('App', () => {
  it('creates the Ionic application host', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
    }));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        { provide: SwUpdate, useValue: { isEnabled: false } },
      ],
    }).compileComponents();

    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});

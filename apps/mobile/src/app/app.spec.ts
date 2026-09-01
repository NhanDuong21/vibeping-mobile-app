import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/provide';
import { App } from './app';

describe('App', () => {
  it('creates the Ionic application host', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideIonicAngular(), provideRouter([])],
    }).compileComponents();

    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});

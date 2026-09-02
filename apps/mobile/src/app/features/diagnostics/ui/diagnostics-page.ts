import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiagnosticsStore } from '../application/diagnostics.store';

@Component({
  selector: 'app-diagnostics-page',
  imports: [RouterLink],
  templateUrl: './diagnostics-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticsPage implements OnInit {
  protected readonly diagnostics = inject(DiagnosticsStore);

  ngOnInit(): void {
    void this.diagnostics.load();
  }
}

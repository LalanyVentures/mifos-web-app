/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbComponent } from './breadcrumb.component';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';

describe('BreadcrumbComponent', () => {
  let navigation: Subject<NavigationEnd>;

  beforeEach(async () => {
    navigation = new Subject<NavigationEnd>();
    await TestBed.configureTestingModule({
      imports: [
        BreadcrumbComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: ActivatedRoute, useValue: { root: { children: [] } } },
        { provide: Router, useValue: { events: navigation } },
        { provide: ConfigurationWizardService, useValue: { showBreadcrumbs: false } },
        { provide: PopoverService, useValue: {} }
      ]
    }).compileComponents();
  });

  it('renders before navigation and when a route generates no breadcrumbs', () => {
    const fixture = TestBed.createComponent(BreadcrumbComponent);
    expect(() => fixture.detectChanges()).not.toThrow();

    navigation.next(new NavigationEnd(1, '/checker-inbox/707/view', '/checker-inbox/707/view'));
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.breadcrumb-title').textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('.breadcrumb-trail')).toBeNull();
  });

  it('renders the current task title when breadcrumbs become available', () => {
    const fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.componentInstance.breadcrumbs = [
      { label: 'Checker Inbox & Tasks', url: '' },
      { label: '707', url: '' }
    ];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.breadcrumb-title').textContent.trim()).toBe('707');
    expect(fixture.nativeElement.querySelectorAll('.breadcrumb-item')).toHaveLength(2);
  });
});

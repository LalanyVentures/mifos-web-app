/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { ReportPermissionService } from './report-permission.service';
import { reportRunPermissionGuard } from './report-run-permission.guard';

describe('reportRunPermissionGuard', () => {
  let canAccessReport: jest.Mock;
  let redirect: UrlTree;
  let router: { createUrlTree: jest.Mock };

  beforeEach(() => {
    canAccessReport = jest.fn();
    redirect = {} as UrlTree;
    router = { createUrlTree: jest.fn(() => redirect) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ReportPermissionService, useValue: { canAccessReport } },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('allows a direct run route when the user can access that report', () => {
    canAccessReport.mockReturnValue(true);
    const route = { paramMap: { get: () => 'Active Loans - Details' } } as unknown as ActivatedRouteSnapshot;

    expect(TestBed.runInInjectionContext(() => reportRunPermissionGuard(route, {} as never))).toBe(true);
    expect(canAccessReport).toHaveBeenCalledWith('Active Loans - Details');
  });

  it('redirects a direct run route when the user lacks its report permission', () => {
    canAccessReport.mockReturnValue(false);
    const route = { paramMap: { get: () => 'Active Loans - Details' } } as unknown as ActivatedRouteSnapshot;

    expect(TestBed.runInInjectionContext(() => reportRunPermissionGuard(route, {} as never))).toBe(redirect);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/reports']);
  });
});

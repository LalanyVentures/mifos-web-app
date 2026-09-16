/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AuthenticationService } from '../core/authentication/authentication.service';
import { Credentials } from '../core/authentication/credentials.model';
import { TestBed } from '@angular/core/testing';
import { ReportPermissionService } from './report-permission.service';

describe('ReportPermissionService', () => {
  let permissions: string[];
  let service: ReportPermissionService;

  beforeEach(() => {
    permissions = [];
    const authenticationService = {
      getCredentials: jest.fn(() => ({ permissions }))
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthenticationService, useValue: authenticationService }]
    });
    service = TestBed.inject(ReportPermissionService);
  });

  it('allows a report with its exact Fineract READ permission', () => {
    permissions = ['READ_Active Loans - Details'];

    expect(service.canAccessReport('Active Loans - Details')).toBe(true);
  });

  it('does not treat the generic report listing permission as permission for every report', () => {
    permissions = ['READ_REPORT'];

    expect(service.canAccessReport('Active Loans - Details')).toBe(false);
  });

  it.each([
    'ALL_FUNCTIONS',
    'ALL_FUNCTIONS_READ'
  ])('allows all reports for %s', (permission) => {
    permissions = [permission];

    expect(service.canAccessReport('Active Loans - Details')).toBe(true);
  });

  it('filters all categories to only explicitly permitted reports', () => {
    permissions = [
      'READ_Active Loans - Details',
      'READ_Clients - Details'
    ];
    const reports = [
      { reportName: 'Active Loans - Details', reportCategory: 'Loan' },
      { reportName: 'Clients - Details', reportCategory: 'Client' },
      { reportName: 'Savings - Details', reportCategory: 'Savings' }
    ];

    expect(service.filterReports(reports).map((report) => report.reportName)).toEqual([
      'Active Loans - Details',
      'Clients - Details'
    ]);
  });

  it('reads current session permissions on each check', () => {
    expect(service.canAccessReport('Active Loans - Details')).toBe(false);

    permissions = ['READ_Active Loans - Details'];
    expect(service.canAccessReport('Active Loans - Details')).toBe(true);
  });

  it('fails closed for an empty report name or unavailable credentials', () => {
    expect(service.canAccessReport('')).toBe(false);
    expect(service.canAccessReport(undefined)).toBe(false);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthenticationService,
          useValue: { getCredentials: (): Credentials | null => null }
        }
      ]
    });
    const noCredentialsService = TestBed.inject(ReportPermissionService);
    expect(noCredentialsService.canAccessReport('Active Loans - Details')).toBe(false);
  });
});

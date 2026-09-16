/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from '../core/authentication/authentication.service';

export interface ReportPermissionTarget {
  reportName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportPermissionService {
  private authenticationService = inject(AuthenticationService);

  canAccessReport(report: string | ReportPermissionTarget | null | undefined): boolean {
    const reportName = typeof report === 'string' ? report : report?.reportName;
    if (!reportName) {
      return false;
    }

    const permissions = this.authenticationService.getCredentials()?.permissions;
    if (!Array.isArray(permissions)) {
      return false;
    }

    return (
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('ALL_FUNCTIONS_READ') ||
      permissions.includes(`READ_${reportName}`)
    );
  }

  filterReports<T extends ReportPermissionTarget>(reports: T[] | null | undefined): T[] {
    return Array.isArray(reports) ? reports.filter((report) => this.canAccessReport(report)) : [];
  }
}

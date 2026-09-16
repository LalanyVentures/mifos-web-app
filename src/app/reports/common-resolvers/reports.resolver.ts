/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';

/** rxjs Imports */
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Custom Services */
import { ReportsService } from '../reports.service';
import { ReportPermissionService } from '../report-permission.service';

/**
 * Reports data resolver.
 */
@Injectable()
export class ReportsResolver {
  private reportsService = inject(ReportsService);
  private reportPermissionService = inject(ReportPermissionService);

  /**
   * Returns the reports data.
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.reportsService.getReports().pipe(map((reports) => this.reportPermissionService.filterReports(reports)));
  }
}

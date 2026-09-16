/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ReportPermissionService } from './report-permission.service';

export const reportRunPermissionGuard: CanActivateFn = (route) => {
  const reportPermissionService = inject(ReportPermissionService);
  const router = inject(Router);
  const reportName = route.paramMap.get('name');

  return reportPermissionService.canAccessReport(reportName) ? true : router.createUrlTree(['/reports']);
};

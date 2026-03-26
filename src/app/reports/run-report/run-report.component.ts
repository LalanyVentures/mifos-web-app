/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AbstractControl,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

/** Custom Services */
import { ReportsService } from '../reports.service';
import { SettingsService } from 'app/settings/settings.service';

/** Custom Models */
import { ReportParameter } from '../common-models/report-parameter.model';
import { SelectOption } from '../common-models/select-option.model';
import { Dates } from 'app/core/utils/dates';
import { GlobalConfiguration } from 'app/system/configurations/global-configurations-tab/configuration.model';

import * as ExcelJS from 'exceljs';
import { AlertService } from 'app/core/alert/alert.service';
import { NgIf, NgFor, NgSwitch, NgSwitchCase } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TableAndSmsComponent } from './table-and-sms/table-and-sms.component';
import { ChartComponent } from './chart/chart.component';
import { PentahoComponent } from './pentaho/pentaho.component';
import { BirtComponent } from './birt/birt.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Run report component.
 */
@Component({
  selector: 'mifosx-run-report',
  templateUrl: './run-report.component.html',
  styleUrls: ['./run-report.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    NgSwitch,
    NgSwitchCase,
    MatCheckbox,
    FaIconComponent,
    TableAndSmsComponent,
    ChartComponent,
    PentahoComponent,
    BirtComponent
  ]
})
export class RunReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private reportsService = inject(ReportsService);
  private settingsService = inject(SettingsService);
  private alertService = inject(AlertService);
  private dateUtils = inject(Dates);

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();

  /** Contains report specifications i.e: name, type and id */
  report: any = {};
  /** Formatted data post labeling of report parameters fetched from API */
  paramData: ReportParameter[] = [];
  /** Array of all parent parameters */
  parentParameters: any[] = [];
  /** Parameter data to configure pentaho output */
  pentahoReportParameters: any[] = [];
  /** Data to be passed on to component selectors */
  dataObject: any;

  /** Initializes new form group eportForm */
  reportForm = new UntypedFormGroup({});
  /** Static Form control for decimal places in output */
  decimalChoice = new UntypedFormControl();

  /** Toggles Report form */
  isCollapsed = false;
  /** Toggles  Table output. */
  hideTable = true;
  /** Toggles Chart output */
  hideChart = true;
  /** Toggles Pentaho output */
  hidePentaho = true;
  /** Toggles BIRT output */
  hideBirt = true;
  /** Report uses dates */
  reportUsesDates = false;
  exportToS3Allowed = false;
  reportToBeExportedInRepository: any;
  exportToS3Repository: string;
  outputTypeOptions: any[] = [];

  isProcessing = false;

  /**
   * Fetches report specifications from route params and retrieves report parameters data from `resolve`.
   * @param {ActivatedRoute} route ActivatedRoute.
   * @param {ReportsService} reportsService ReportsService
   * @param {SettingsService} settingsService Settings Service
   * @param {Dates} dateUtils Date Utils
   */
  constructor() {
    this.report.name = this.route.snapshot.params['name'];
    this.route.queryParams.subscribe((queryParams: { type: any; id: any }) => {
      this.report.type = queryParams.type;
      this.report.id = queryParams.id;
    });
    this.route.data.subscribe((data: { reportParameters: ReportParameter[]; configurations: any }) => {
      this.paramData = data.reportParameters;
      if (this.isTableReport()) {
        const amazonS3Config = data.configurations.globalConfiguration.find(
          (config: GlobalConfiguration) => config.name === 'amazon-s3'
        );
        const reportExportS3Config = data.configurations.globalConfiguration.find(
          (config: GlobalConfiguration) => config.name === 'report-export-s3-folder-name'
        );

        if (
          amazonS3Config &&
          amazonS3Config.enabled &&
          reportExportS3Config &&
          reportExportS3Config.enabled &&
          reportExportS3Config.stringValue
        ) {
          this.exportToS3Allowed = true;
          this.exportToS3Repository = reportExportS3Config.stringValue;
        }
      }
    });
  }

  isTableReport(): boolean {
    return this.report.type === 'Table';
  }

  isTabularReport(): boolean {
    return this.report.type === 'Table' || this.report.type === 'SMS';
  }

  isPentahoReport(): boolean {
    return this.report.type === 'Pentaho';
  }

  isBirtReport(): boolean {
    return this.report.type === 'BIRT';
  }

  /**
   * Creates and sets the run report form.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.maxAllowedDate;
    this.createRunReportForm();
  }

  /**
   * Establishes form controls for Report Parameter's name attribute,
   * Fetches dropdown options and builds child dependencies.
   */
  createRunReportForm() {
    this.paramData.forEach((param: ReportParameter) => {
      if (!param.parentParameterName) {
        // Non Child Parameter
        this.reportForm.addControl(param.name, new UntypedFormControl('', Validators.required));
        if (param.displayType === 'select') {
          this.fetchSelectOptions(param, param.name);
        }
      } else {
        // Child Parameter
        const parent: ReportParameter = this.paramData.find((entry: any) => entry.name === param.parentParameterName);
        if (parent != null) {
          parent.childParameters.push(param);
          this.updateParentParameters(parent);
        }
      }
    });
    if (this.isPentahoReport()) {
      this.reportForm.addControl('outputType', new UntypedFormControl('', Validators.required));
      this.outputTypeOptions = [
        { name: 'PDF format', value: 'PDF' },
        { name: 'Normal format', value: 'HTML' },
        { name: 'Excel format', value: 'XLS' },
        { name: 'Excel 2007 format', value: 'XLSX' },
        { name: 'CSV format', value: 'CSV' }
      ];
      this.mapPentahoParams();
    }
    if (this.isBirtReport()) {
      this.reportForm.addControl('outputType', new UntypedFormControl('', Validators.required));
      this.outputTypeOptions = [
        { name: 'PDF format', value: 'PDF' },
        { name: 'Normal format', value: 'HTML' },
        { name: 'Excel format', value: 'XLS' },
        { name: 'Excel 2007 format', value: 'XLSX' },
        { name: 'CSV format', value: 'CSV' }
      ];
      this.mapBirtParams();
    }
    if (this.exportToS3Allowed) {
      this.reportForm.addControl('exportOutputToS3', new UntypedFormControl(false));
    }
    this.decimalChoice.patchValue('2');
    this.setChildControls();
    this.addDateRangeValidator();
  }

  /**
   * Updates the array of parent parameters.
   * @param {ReportParameter} parent Parent report parameter
   */
  updateParentParameters(parent: ReportParameter) {
    const parentNames = this.parentParameters.map((parameter) => parameter.name);
    if (!parentNames.includes(parent.name)) {
      // Parent's first child.
      this.parentParameters.push(parent);
    } else {
      // Parent already has a child
      const index = parentNames.indexOf(parent.name);
      this.parentParameters[index] = parent;
    }
  }

  /**
   * Maps pentaho specific names to form-control names.
   */
  mapPentahoParams() {
    this.reportsService.getPentahoParams(this.report.id).subscribe((data: any) => {
      data.forEach((entry: any) => {
        const param: ReportParameter = this.paramData.find((_entry: any) => _entry.name === entry.parameterName);
        if (param && entry.reportParameterName) {
          param.pentahoName = `R_${entry.reportParameterName}`;
        } else if (!param) {
          console.warn('Pentaho parameter not found in paramData:', entry.parameterName);
        }
      });
    });
  }

  /**
   * Maps BIRT specific names to form-control names.
   */
  mapBirtParams() {
    this.reportsService.getBirtParams(this.report.id).subscribe((data: any) => {
      data.forEach((entry: any) => {
        const param: ReportParameter = this.paramData.find((_entry: any) => _entry.name === entry.parameterName);
        if (param && entry.reportParameterName) {
          param.pentahoName = `R_${entry.reportParameterName}`;
        } else if (!param) {
          console.warn('BIRT parameter not found in paramData:', entry.parameterName);
        }
      });
    });
  }

  addDateRangeValidator(): void {
    const dateParams = this.paramData.filter((param: ReportParameter) => param.displayType === 'date');
    const startParam = dateParams.find((param: ReportParameter) => this.isStartDateParam(param));
    const endParam = dateParams.find((param: ReportParameter) => this.isEndDateParam(param));

    if (!startParam || !endParam) {
      return;
    }

    const startControl = this.reportForm.get(startParam.name);
    const endControl = this.reportForm.get(endParam.name);

    if (!startControl || !endControl) {
      return;
    }

    endControl.addValidators(this.endDateAfterStartValidator(startParam.name));
    endControl.updateValueAndValidity({ emitEvent: false });
    startControl.valueChanges.subscribe(() => endControl.updateValueAndValidity({ emitEvent: false }));
  }

  endDateAfterStartValidator(startControlName: string): ValidatorFn {
    return (control: AbstractControl) => {
      const startControl = control.parent?.get(startControlName);
      const startValue = startControl?.value;
      const endValue = control.value;

      if (!startValue || !endValue) {
        return null;
      }

      const startDate = new Date(startValue);
      const endDate = new Date(endValue);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return null;
      }

      if (endDate < startDate) {
        return { endBeforeStart: true };
      }

      return null;
    };
  }

  isStartDateParam(param: ReportParameter): boolean {
    const identifier = `${param.name}${param.variable}${param.label}`.toLowerCase();
    return identifier.includes('start') || identifier.includes('from');
  }

  isEndDateParam(param: ReportParameter): boolean {
    const identifier = `${param.name}${param.variable}${param.label}`.toLowerCase();
    return identifier.includes('end') || identifier.includes('to');
  }

  /**
   * Subscribes to changes in parent parameters value, builds child parameter vis-a-vis parent's value.
   */
  setChildControls() {
    this.parentParameters.forEach((param: ReportParameter) => {
      this.reportForm.get(param.name).valueChanges.subscribe((option: any) => {
        param.childParameters.forEach((child: ReportParameter) => {
          if (child.displayType === 'none') {
            this.reportForm.addControl(child.name, new UntypedFormControl(child.defaultVal));
          } else {
            this.reportForm.addControl(child.name, new UntypedFormControl('', Validators.required));
          }
          if (child.displayType === 'select') {
            const inputstring = `${child.name}?${param.inputName}=${option.id}`;
            this.fetchSelectOptions(child, inputstring);
          }
        });
      });
    });
  }

  /**
   * Fetches Select Dropdown options for param type "Select".
   * @param {ReportParameter} param Parameter for which dropdown options are required.
   * @param {string} inputstring url substring for API call.
   */
  fetchSelectOptions(param: ReportParameter, inputstring: string) {
    this.reportsService.getSelectOptions(inputstring).subscribe((options: SelectOption[]) => {
      param.selectOptions = options;
      if (param.selectAll === 'Y') {
        param.selectOptions.push({ id: '-1', name: 'All' });
      }
    });
  }

  /**
   * Formats user response and readies it for utilization by run report function.
   * @param {any} response Object containing formcontrol values.
   */
  formatUserResponse(response: any) {
    const formattedResponse: any = {};
    let newKey: string;
    this.reportToBeExportedInRepository = false;
    for (const [
      key,
      value
    ] of Object.entries(response)) {
      if (key === 'outputType') {
        formattedResponse['output-type'] = value;
        continue;
      } else if (key === 'exportOutputToS3') {
        this.reportToBeExportedInRepository = value;
        continue;
      }

      const param: ReportParameter = this.paramData.find((_entry: any) => _entry.name === key);
      if (!param) {
        console.warn('Parameter not found in paramData:', key);
        continue;
      }
      newKey =
        (this.isPentahoReport() || this.isBirtReport()) && param.pentahoName ? param.pentahoName : param.inputName;
      switch (param.displayType) {
        case 'text':
          formattedResponse[newKey] = value;
          break;
        case 'select':
          formattedResponse[newKey] = (value as { id: string | number })['id'];
          break;
        case 'date':
          if (this.isTableReport()) {
            formattedResponse[newKey] = this.dateUtils.formatDate(value, Dates.DEFAULT_DATEFORMAT);
          } else {
            formattedResponse[newKey] = this.dateUtils.formatDate(value, this.settingsService.dateFormat);
          }
          this.reportUsesDates = true;
          break;
        case 'none':
          formattedResponse[newKey] = value;
          break;
      }
    }
    return formattedResponse;
  }

  /**
   * Core run report functionality.
   */
  run() {
    this.isCollapsed = true;
    const userResponseValues = this.formatUserResponse(this.reportForm.value);
    const activeFilters = this.buildActiveFilters();
    let formData = {
      ...userResponseValues
    };
    if (this.reportUsesDates) {
      let dateFormat = this.settingsService.dateFormat;
      if (this.isTableReport()) {
        dateFormat = Dates.DEFAULT_DATEFORMAT;
      }
      formData = {
        ...userResponseValues,
        locale: this.settingsService.language.code,
        dateFormat: dateFormat
      };
    }
    if (this.reportToBeExportedInRepository) {
      formData['exportS3'] = true;
    }
    this.dataObject = {
      formData: formData,
      report: this.report,
      decimalChoice: this.decimalChoice.value,
      activeFilters
    };
    switch (this.report.type) {
      case 'SMS':
      case 'Table':
        this.hideTable = false;
        break;
      case 'Chart':
        this.hideChart = false;
        break;
      case 'Pentaho':
        this.hidePentaho = false;
        break;
      case 'BIRT':
        this.hideBirt = false;
        break;
    }
  }

  runReportAndExport($event: Event): void {
    $event.stopPropagation();
    this.isProcessing = true;
    const userResponseValues = this.formatUserResponse(this.reportForm.value);

    const reportName = this.report.name;
    const payload = {
      ...userResponseValues,
      decimalChoice: this.decimalChoice.value
      // exportCSV: true
    };
    this.reportsService.getRunReportData(reportName, payload).subscribe({
      next: async (res: any) => {
        if (res.data.length > 0) {
          this.alertService.alert({ type: 'Report generation', message: `Report: ${reportName} data generated` });

          const displayedColumns: string[] = [];
          res.columnHeaders.forEach((header: any) => {
            displayedColumns.push(header.columnName);
          });

          const activeFilters = this.buildActiveFilters();
          await this.exportToXLS(reportName, res.data, displayedColumns, activeFilters);
        } else {
          this.alertService.alert({
            type: 'Report generation',
            message: `Report: ${reportName} without data generated`
          });
        }
        this.isProcessing = false;
      },
      error: () => {
        this.alertService.alert({ type: 'Report generation', message: `Failed to generate report: ${reportName}` });
        this.isProcessing = false;
      }
    });
  }

  private buildActiveFilters(): Array<{ label: string; value: string }> {
    const filters: Array<{ label: string; value: string }> = [];
    const formValue = this.reportForm.value;

    for (const [
      key,
      rawValue
    ] of Object.entries(formValue)) {
      if (key === 'outputType' || key === 'exportOutputToS3') {
        continue;
      }

      const param = this.paramData.find((entry: ReportParameter) => entry.name === key);
      if (!param || rawValue === null || rawValue === undefined || rawValue === '') {
        continue;
      }

      let value = '';
      switch (param.displayType) {
        case 'select':
          if (typeof rawValue === 'object' && rawValue !== null) {
            const option = rawValue as { name?: string; id?: string | number };
            value = String(option.name ?? option.id ?? '');
          } else {
            value = String(rawValue);
          }
          break;
        case 'date':
          value = this.dateUtils.formatDate(rawValue, this.settingsService.dateFormat);
          break;
        default:
          value = String(rawValue);
          break;
      }

      if (value) {
        filters.push({
          label: param.label || param.name,
          value
        });
      }
    }

    return filters;
  }

  async exportToXLS(
    reportName: string,
    reportRows: any,
    displayedColumns: string[],
    activeFilters: Array<{ label: string; value: string }>
  ): Promise<void> {
    const fileName = `${reportName}.xlsx`;

    // Format data for ExcelJS
    const data = reportRows.map((object: any) => {
      const row: Record<string, any> = {};
      for (let i = 0; i < displayedColumns.length; i++) {
        row[displayedColumns[i]] = object.row[i];
      }
      return row;
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    const totalColumns = Math.max(displayedColumns.length, 2, 1);

    worksheet.mergeCells(1, 1, 1, totalColumns);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = reportName;
    titleCell.font = { bold: true, size: 16 };

    const metadataRowValues: string[] = [
      'Generated At',
      new Date().toLocaleString()
    ];
    activeFilters.forEach((filter) => {
      metadataRowValues.push(filter.label, filter.value);
    });
    const metadataRow = worksheet.addRow(metadataRowValues);
    metadataRow.eachCell((cell, columnNumber) => {
      if (columnNumber % 2 === 1) {
        cell.font = { bold: true };
      }
    });

    worksheet.addRow([]);

    const headerRow = worksheet.addRow(displayedColumns);
    headerRow.font = { bold: true };

    data.forEach((rowObj: any) => {
      worksheet.addRow(displayedColumns.map((col) => rowObj[col]));
    });

    worksheet.views = [
      {
        state: 'frozen',
        ySplit: 4
      }
    ];

    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : '';
        maxLength = Math.max(maxLength, cellValue.length + 2);
      });
      column.width = Math.min(maxLength, 40);
    });

    // Write to buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Native download logic (no FileSaver)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
}

/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

/** Custom Services */
import { UsersService } from '../users.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { UntypedFormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';

/**
 * Edit User Component.
 */
@Component({
  selector: 'mifosx-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditUserComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private usersService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);

  /** User Data */
  userData: any;
  /** Offices Data */
  officesData: any;
  /** Staff Data */
  staffData: any;
  /** Roles Data */
  rolesData: any;
  /** Client options available for linking to this user. */
  clientsData: any[] = [];
  /** Client search control. */
  clientsSearch = new UntypedFormControl('');
  /** Edit User form. */
  editUserForm: UntypedFormGroup;

  /**
   * Retrieves the offices data from `resolve`.
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {UsersService} UsersService Users Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   */
  constructor() {
    this.route.data.subscribe((data: { user: any; usersTemplate: any }) => {
      this.userData = data.user;
      this.officesData = data.usersTemplate.allowedOffices;
      this.rolesData = data.usersTemplate.availableRoles;
    });
  }

  ngOnInit() {
    this.createEditUserForm();
    this.officeChanged(this.userData.officeId);
    this.clientsData = [...(this.userData.clients || [])];
    this.clientsSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((value: string) => (value || '').trim().length >= 2)
      )
      .subscribe((value: string) => this.searchClients(value.trim()));
    this.editUserForm.controls.isSelfServiceUser.valueChanges.subscribe((enabled: boolean) => {
      this.updateSelfServiceControls(enabled);
    });
    this.updateSelfServiceControls(!!this.userData.isSelfServiceUser);
  }

  /**
   * Creates the edit user form.
   */
  createEditUserForm() {
    const staffId = this.userData.staff ? this.userData.staff.id : null;
    const linkedClients = (this.userData.clients || []).map((client: any) => client.id);
    this.editUserForm = this.formBuilder.group({
      username: [
        this.userData.username,
        Validators.required
      ],
      email: [
        this.userData.email,
        [
          Validators.required,
          Validators.email
        ]
      ],
      firstname: [
        this.userData.firstname,
        [
          Validators.required,
          Validators.pattern('(^[A-z]).*')
        ]
      ],
      lastname: [
        this.userData.lastname,
        [
          Validators.required,
          Validators.pattern('(^[A-z]).*')
        ]
      ],
      passwordNeverExpires: [this.userData.passwordNeverExpires],
      officeId: [
        this.userData.officeId,
        Validators.required
      ],
      staffId: [staffId],
      isSelfServiceUser: [!!this.userData.isSelfServiceUser],
      clients: [linkedClients],
      roles: [
        this.userData.selectedRoles.map((role: any) => role.id),
        Validators.required
      ]
    });
  }

  private updateSelfServiceControls(enabled: boolean) {
    const staffControl = this.editUserForm.controls.staffId;
    const clientsControl = this.editUserForm.controls.clients;
    if (enabled) {
      staffControl.setValue(null);
      staffControl.disable({ emitEvent: false });
      clientsControl.setValidators(Validators.required);
    } else {
      staffControl.enable({ emitEvent: false });
      clientsControl.clearValidators();
      clientsControl.setValue([]);
    }
    clientsControl.updateValueAndValidity({ emitEvent: false });
  }

  private searchClients(searchText: string) {
    this.usersService.searchClients(searchText).subscribe((response: any) => {
      const matches = response.pageItems || response || [];
      const selectedIds = this.editUserForm.controls.clients.value || [];
      const selected = this.clientsData.filter((client) => selectedIds.includes(client.id));
      this.clientsData = [
        ...selected,
        ...matches.filter((client: any) => !selectedIds.includes(client.id))
      ];
      this.changeDetector.markForCheck();
    });
  }

  /**
   * Fetches the staff for the selected office
   * @param officeId the selected office id
   */
  officeChanged(officeId: number) {
    this.staffData = [];
    this.usersService.getStaff(officeId).subscribe((staff: any) => {
      this.staffData = staff;
    });
  }

  /**
   * Submits the user form and edits the user,
   * if successful redirects to the updated user.
   */
  submit() {
    const editedUser = this.editUserForm.getRawValue();
    if (!editedUser.isSelfServiceUser) editedUser.clients = [];
    this.usersService.editUser(this.userData.id, editedUser).subscribe((response: any) => {
      this.router.navigate(
        [
          '../../',
          response.resourceId
        ],
        { relativeTo: this.route }
      );
    });
  }
}

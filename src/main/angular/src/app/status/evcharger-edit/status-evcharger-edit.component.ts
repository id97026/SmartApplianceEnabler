import {AfterViewChecked, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AbstractControl, FormControl, FormControlName, FormGroup, Validators} from '@angular/forms';
import {ErrorMessages} from '../../shared/error-messages';
import {StatusService} from '../status.service';
import {ControlService} from '../../control/control-service';
import {TimeUtil} from '../../shared/time-util';
import {FormHandler} from '../../shared/form-handler';
import {InputValidatorPatterns} from '../../shared/input-validator-patterns';
import {ErrorMessageHandler} from '../../shared/error-message-handler';
import {ElectricVehicle} from '../../control/evcharger/electric-vehicle/electric-vehicle';
import {Status} from '../status';
import {DayOfWeek} from '../../shared/days-of-week';
import {Logger} from '../../log/logger';
import {ErrorMessage, ValidatorType} from '../../shared/error-message';
import {TranslateService} from '@ngx-translate/core';

const socValidator = (control: AbstractControl): { [key: string]: boolean } => {
  const stateOfChargeCurrent = control.get('stateOfChargeCurrent');
  const stateOfChargeRequested = control.get('stateOfChargeRequested');
  if (!stateOfChargeCurrent || !stateOfChargeRequested
    || !stateOfChargeCurrent.value || !stateOfChargeRequested.value) {
    return null;
  }
  return Number.parseInt(stateOfChargeCurrent.value, 10)
  < Number.parseInt(stateOfChargeRequested.value, 10) ? null : {nomatch: true};
};

declare const $: any;

/**
 * The time set by clock picker is displayed in input field but not set in the form model.
 * Since there is no direct access to the native element from the form control we have to add a hook to
 * propagate time changes on the native element to the form control.
 * Inspired by https://stackoverflow.com/questions/39642547/is-it-possible-to-get-native-element-for-formcontrol
 */
const originFormControlNameNgOnChanges = FormControlName.prototype.ngOnChanges;
FormControlName.prototype.ngOnChanges = function () {
  const result = originFormControlNameNgOnChanges.apply(this, arguments);
  this.control.nativeElement = this.valueAccessor._elementRef;

  const elementRef = this.valueAccessor._elementRef;
  if (elementRef) {
    const classAttribute: string = elementRef.nativeElement.attributes.getNamedItem('class');
    if (classAttribute != null) {
      const classAttributeValues = classAttribute['nodeValue'];
      if (classAttributeValues.indexOf('clockpicker') > -1) {
        $(this.valueAccessor._elementRef.nativeElement).on('change', (event) => {
          this.control.setValue(event.target.value);
          this.control.markAsDirty();
        });
      }
    }
  }
  return result;
};

@Component({
  selector: 'app-status-evcharger-edit',
  templateUrl: './status-evcharger-edit.component.html',
  styleUrls: ['./status-evcharger-edit.component.scss', '../status.component.scss']
})
export class StatusEvchargerEditComponent implements OnInit, AfterViewChecked {
  @Input()
  status: Status;
  @Input()
  dows: DayOfWeek[] = [];
  @Input()
  electricVehicles: ElectricVehicle[];
  @Output()
  beforeFormSubmit = new EventEmitter<any>();
  @Output()
  formSubmitted = new EventEmitter<any>();
  @Output()
  formCancelled = new EventEmitter<any>();
  form: FormGroup;
  formHandler: FormHandler;
  errors: { [key: string]: string } = {};
  errorMessages: ErrorMessages;
  errorMessageHandler: ErrorMessageHandler;
  initializeOnceAfterViewChecked = false;
  electricVehicleSelected: ElectricVehicle;

  constructor(private logger: Logger,
              private controlService: ControlService,
              private statusService: StatusService,
              private translate: TranslateService) {
    this.errorMessageHandler = new ErrorMessageHandler(logger);
    this.formHandler = new FormHandler();
  }

  ngOnInit() {
    this.errorMessages = new ErrorMessages('StatusEvchargerEditComponent.error.', [
      new ErrorMessage('stateOfChargeCurrent', ValidatorType.pattern),
      new ErrorMessage('stateOfChargeRequested', ValidatorType.pattern),
      new ErrorMessage('chargeEndTime', ValidatorType.pattern),
    ], this.translate);
    this.buildForm();
    this.initializeOnceAfterViewChecked = true;
  }

  ngAfterViewChecked() {
    if (this.initializeOnceAfterViewChecked) {
      this.initializeOnceAfterViewChecked = false;
      this.initializeClockPicker();
    }
  }

  initializeClockPicker() {
    $('.clockpicker').clockpicker({autoclose: true});
  }

  buildForm() {
    if (this.electricVehicles.length > 0) {
      this.electricVehicleSelected = this.electricVehicles[0];
      this.retrieveSoc();
    }
    this.form = new FormGroup({
      electricVehicle: new FormControl(this.electricVehicleSelected && this.electricVehicleSelected.id),
      stateOfChargeCurrent: new FormControl(undefined, Validators.pattern(InputValidatorPatterns.PERCENTAGE)),
      stateOfChargeRequested: new FormControl(this.electricVehicleSelected && this.electricVehicleSelected.defaultSocManual,
        Validators.pattern(InputValidatorPatterns.PERCENTAGE)),
      chargeEndDow: new FormControl(),
      chargeEndTime: new FormControl(undefined, Validators.pattern(InputValidatorPatterns.TIME_OF_DAY_24H)),
    }, socValidator);
    this.form.get('electricVehicle').valueChanges.subscribe(evIdSelected => {
      this.electricVehicleSelected = this.getElectricVehicle(evIdSelected);
      this.form.get('stateOfChargeRequested').setValue(this.electricVehicleSelected.defaultSocManual);
      this.retrieveSoc();
    });
    this.form.statusChanges.subscribe(() => {
      this.errors = this.errorMessageHandler.applyErrorMessages(this.form, this.errorMessages);
    });
    this.initializeOnceAfterViewChecked = true;
  }

  getElectricVehicle(id: number): ElectricVehicle {
    return id && this.electricVehicles.find(ev => ev.id === id);
  }

  retrieveSoc() {
    this.statusService.getSoc(this.status.id, this.electricVehicleSelected.id).subscribe(soc => {
      if (! Number.isNaN(Number.parseInt(soc, 10))) {
        this.form.get('stateOfChargeCurrent').setValue(Number.parseFloat(soc).toFixed());
      }
    });
  }

  get hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  get error(): string {
    const errors = Object.values(this.errors);
    return errors.length > 0 ? errors[0] : undefined;
  }

  cancelForm() {
    this.formCancelled.emit();
  }

  submitForm() {
    this.beforeFormSubmit.emit();
    const evid = this.form.value.electricVehicle;
    const socCurrent = this.form.value.stateOfChargeCurrent;
    const socRequested = this.form.value.stateOfChargeRequested;
    const chargeEnd = TimeUtil.timestringOfNextMatchingDow(
      this.form.value.chargeEndDow,
      this.form.value.chargeEndTime);
    this.statusService.requestEvCharge(this.status.id, evid, socCurrent, socRequested, chargeEnd)
      .subscribe(() => this.formSubmitted.emit());
  }
}
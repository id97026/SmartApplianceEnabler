import {AfterViewChecked, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormControl, FormControlName, FormGroup, Validators} from '@angular/forms';
import {StatusService} from '../status.service';
import {TimeUtil} from '../../shared/time-util';
import {InputValidatorPatterns} from '../../shared/input-validator-patterns';
import {FormHandler} from '../../shared/form-handler';
import {ErrorMessages} from '../../shared/error-messages';
import {ErrorMessageHandler} from '../../shared/error-message-handler';

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
  selector: 'app-status-edit',
  templateUrl: './status-edit.component.html',
  styleUrls: ['./status-edit.component.scss', '../status.component.scss']
})
export class StatusEditComponent implements OnInit, AfterViewChecked {
  @Input()
  applianceId: string;
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

  constructor(private statusService: StatusService) {
    this.formHandler = new FormHandler();
  }

  ngOnInit() {
    this.buildForm();
    this.statusService.suggestRuntime(this.applianceId).subscribe(suggestedRuntime => {
      const hourMinute = TimeUtil.toHourMinute(Number.parseInt(suggestedRuntime, 10));
      this.form.controls.runTime.setValue(hourMinute);
    });
    this.initializeOnceAfterViewChecked = true;
  }

  ngAfterViewChecked() {
    if (this.initializeOnceAfterViewChecked) {
      this.initializeOnceAfterViewChecked = false;
      this.initializeClockPicker();
    }
  }

  initializeClockPicker() {
    $('.clockpicker').clockpicker({ autoclose: true });
  }

  buildForm() {
    this.form = new FormGroup( {
      runTime: new FormControl(null, [
        Validators.required,
        Validators.pattern(InputValidatorPatterns.TIME_OF_DAY_24H)])
    });
  }

  cancelForm() {
    this.formCancelled.emit();
  }

  submitForm() {
    this.beforeFormSubmit.emit();
    const seconds = TimeUtil.toSeconds(this.form.value.runTime);
    this.statusService.setRuntime(this.applianceId, seconds).subscribe(() => {
      this.statusService.toggleAppliance(this.applianceId, true).subscribe(
        () => this.formSubmitted.emit());
    });
  }
}
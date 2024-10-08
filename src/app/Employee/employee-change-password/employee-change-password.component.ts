import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, FormBuilder } 
from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-employee-change-password',
  templateUrl: './employee-change-password.component.html',
  styleUrls: ['./employee-change-password.component.css']
})
export class EmployeeChangePasswordComponent {
  showSpinner: boolean = false;

  email!: string;
  token: any;

  router: any;
  alertType!: string;
  alertMessage!: string;
  showAlert: boolean = false;
  constructor(private fb: FormBuilder, private http: HttpClient,private actiavatedRoute:ActivatedRoute) {}

  passwordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(12)]],
    confirm_password: ['', [Validators.required]],
  }, 
  
  { validators: this.MustMatch('password', 'confirm_password') });

    //comfirm password
    MustMatch( password:any, confirm_password:any)
    {
     return(formGroup: FormGroup)=>{
       const passwordcontrol = formGroup.controls[password];
       const confirm_passwordcontrol = formGroup.controls[confirm_password];
  
       if(confirm_passwordcontrol.errors && !confirm_passwordcontrol.errors['MustMatch']){
         return;
       }
       if(passwordcontrol.value !== confirm_passwordcontrol.value)
       {
         confirm_passwordcontrol.setErrors({'MustMatch': true});
       }
       else{
         confirm_passwordcontrol.setErrors(null);
       }
  
     }
    }

    get password (){return this.passwordForm.controls;}

    resetPassword() {
      this.showSpinner = true;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'skip': 'true'
      });

      this.actiavatedRoute.queryParams.subscribe(params=>{
        const emailParam= Object.keys(params)[0];
        this.email=emailParam;
      });

      
    
    if (!this.email) {
      // Handle invalid or missing token
      this.showAlertMessage('danger', 'Invalid password reset link.');
      return; // Exit function if token is invalid
    };
      const email = this.passwordForm.get('email')?.value;
      const password = this.passwordForm.get('password')?.value;
      const data = {
        email: this.email,
        password: password,
        token: this.token // Include token in the data sent to the backend
      };
  
      this.http.post<any>('http://localhost:8080/api/auth/resetPassword', data,{ headers }).subscribe(
        (response) => {
          console.log('Password reset successfully!', response);
          this.showAlertMessage('success', 'Reset password request sent successfully!');
          setTimeout(() => {
            // Redirect to login page after 1 seconds
            this.router.navigate(['/company-login']);
          }, 2000); // 2000 milliseconds =2  seconds
        },
        (error) => {
          console.error('Error resetting password:', error);
          this.showAlertMessage('error', 'Error resetting password! User not found. Please enter the email address correctly.');
        }
      ).add(() => {
     
        this.showSpinner = false;
    
    });
    }


    showAlertMessage(type: string, message: string) {
      this.alertType = type;
      this.alertMessage = message;
      this.showAlert = true;
  
      setTimeout(() => {
        this.showAlert = false;
      }, 7000); // Adjusted the timeout to 7 seconds
    }
}


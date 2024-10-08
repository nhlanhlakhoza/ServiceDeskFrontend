import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import jwtDecode from 'jwt-decode';
import { HttpClient } from '@angular/common/http';
import { StorageService } from 'src/app/utility/services/Storage/storage.service';
import { Client, IStompSocket, Message } from '@stomp/stompjs';
import { RespondMessage } from 'src/app/utility/models/models';
import { Observable, map, of } from 'rxjs';
import * as SockJS from 'sockjs-client';

@Component({
  selector: 'app-agent-ticket-details',
  templateUrl: './agent-ticket-details.component.html',
  styleUrls: ['./agent-ticket-details.component.css']
})
export class AgentTicketDetailsComponent implements OnInit {
  constructor(private router: Router, private http: HttpClient, private storage: StorageService, private route: ActivatedRoute, private token: StorageService) { }
  emailSuggestions: string[] = [];
  allEmails: string[] = []; 

  
  //Escalate form
  escalateForm: FormGroup = new FormGroup({
    escalatedTo: new FormControl('', [Validators.required]),
    escalateReason: new FormControl('', [Validators.required]),
  })

  //closeForm
  closeForm: FormGroup = new FormGroup({
    closeReason: new FormControl('',[Validators.required])
  })

  //Button to select
  onFileSelected(event: any) {
    const selectedFile = event.target.files[0];
    //console.log(selectedFile); Do something with the selected file
  }

  dataArray: any;
  ticketId: any;
  message: string = '';
  stompClient: Client = new Client();
  messageList?: Observable<Array<RespondMessage>>;
  messages: RespondMessage[] = [];
  newMessage: string = '';
  accountId!:any;
  reason = "";

  ngOnInit():void
  {

    
      this.route.paramMap.subscribe(param => {
        this.ticketId = param.get('ticketId');
  
        let url = "http://localhost:8080/api/ticket/get-ticket/" + this.ticketId;
  
        this.http.get<any>(url).subscribe(response => {
          this.dataArray = response;
        }, error => {
          console.log("Something went wrong");
        });
      });
  
      this.connect();
      this.getAllAgents();
  }

  private connect(): void {
    this.stompClient.webSocketFactory = (): IStompSocket => {
      return new SockJS('http://localhost:8081/chat') as IStompSocket;
    };

    this.loadChat();

    this.stompClient.onConnect = (frame) => {
      this.stompClient.subscribe("/topic/messages/" + this.ticketId, (message: Message) => {
        const receivedMsg = JSON.parse(message.body) as RespondMessage;
        this.messageList = this.messageList?.pipe(map((d: RespondMessage[]) => [...d, receivedMsg]));
        this.messages.push(receivedMsg);
      });
    }

    this.stompClient.activate();
  }

  private loadChat(): void {
    this.messageList = this.http.get<Array<RespondMessage>>("http://localhost:8081/get-messages/" + this.ticketId);

    this.messageList.subscribe(d => {
      let mesg: Array<RespondMessage> = d;

      mesg.sort((a, b) => (a.timestamp > b.timestamp) ? 1 : -1);
      this.messageList = of(mesg);
      this.messages = mesg; 

      
    });
  }

  

  public sendMessage(): void {
    let getUserToken = this.token.getUser();
    let getUserId: any = jwtDecode(getUserToken);
    this.accountId = getUserId.accountId;

    let message = {
      'sender': this.accountId,
      'content': this.newMessage
    };

    this.stompClient.publish({
      destination: '/app/chat/' + this.ticketId,
      body: JSON.stringify(message)
    });

    this.newMessage = "";
  }

    // Email suggestion handling
    onEmailInput(): void {
      const emailControl = this.escalateForm.get('escalatedTo');
      if (emailControl) {
        const query = emailControl.value;
        if (query.length > 0) {
          this.emailSuggestions = this.allEmails.filter(escalatedTo =>
            escalatedTo.toLowerCase().startsWith(query.toLowerCase())
          );
        } else {
          this.emailSuggestions = [];
        }
      }
    }
  
    onSelectSuggestion(escalatedTo: string): void {
      this.escalateForm.get('escalatedTo')?.setValue(escalatedTo);
      this.emailSuggestions = [];
    }

  isCloseTicketFormVisible = false;

  showDropdown: boolean = false;

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }
  escalateSpinner: boolean = false;
  closeSpinner: boolean = false;
  successMessage: string = '';
  formSubmitted: boolean = false; 

 
  escalateTicket() {
    this.escalateSpinner = true;
    setTimeout(() => {
      this.escalateSpinner = false;
      this.formSubmitted = true; 
      this.successMessage = 'Ticket escalated successfully!';
  
      // Disappear message after 2 seconds
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/agent-tickets']);

      }, 2000);
  
    }, 3000);

    let url = "http://localhost:8080/api/company/get-agent-id";
    let urlUpdate ="http://localhost:8080/api/ticket/update-ticket"

    let agentEmail=this.escalateForm.get('escalatedTo')?.value

    this.http.post(url,agentEmail).subscribe(response=>
      {
        if(response!=null)
          {

            console.log(response);
            
            const ticketUpdate=
            {
              "ticketId":this.ticketId,
              "status":"Escalate",
              "updateMessage":this.escalateForm.get('escalateReason')?.value,
              "escalatedToAgentId":response
            }

            this.http.put(urlUpdate,ticketUpdate).subscribe(response=>
              {
                console.log(response);
                location.reload();
              },
              error=>
                {
                  console.log(error);
                }
            )

          }
      }
    )
  }

  getAllAgents()
  {
    let getUserToken = this.token.getUser();
    let getUserId: any = jwtDecode(getUserToken);
    let companyId=getUserId.companyId

    let url ="http://localhost:8080/api/company/get-agent-email"

    const searchAgent=
    {
      "search":"",
      "companyID":companyId
    }
      this.http.post<[]>(url,searchAgent).subscribe(response=>{
        
        this.allEmails=response;
        
      },error=>
      {
        console.log(error);
        
      })
  }
  
  closeTicket() {
    this.closeSpinner = true;

    setTimeout(() => {
      this.closeSpinner = false;
      this.formSubmitted = true;
      this.successMessage = 'Ticket closed successfully!';

      // Disappear message after 2 seconds
      setTimeout(() => {
        this.successMessage = '';
        // Navigate to agent-tickets after the message disappears
        this.router.navigate(['/agent-tickets']);
      }, 2000);

    }, 3000);

    let url = "http://localhost:8080/api/ticket/update-ticket";
    const ticketUpdate = {
      ticketId: this.ticketId,
      status: "Closed",
      updateMessage: this.closeForm.value.closeReason,
      escalatedToAgentId: ""
    };

    this.http.put(url, ticketUpdate).subscribe(response => {
      console.log(response);
    }, error => {
      console.log(error);
    });
  }

  

  get close (){return this.closeForm.controls;}
  get escalate (){return this.escalateForm.controls;}

  }
  
 
 



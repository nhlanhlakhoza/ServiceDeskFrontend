import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import jwtDecode from 'jwt-decode';
import * as SockJS from 'sockjs-client';
import { Client, IStompSocket, Message } from '@stomp/stompjs';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from 'src/app/utility/services/Storage/storage.service';
import { RespondMessage } from 'src/app/utility/models/models';

@Component({
  selector: 'app-company-ticket-details',
  templateUrl: './company-ticket-details.component.html',
  styleUrls: ['./company-ticket-details.component.css']
})
export class CompanyTicketDetailsComponent implements OnInit {

  dataArray: any;
  ticketId: any;
  message: string = '';
  stompClient: Client = new Client();
  messageList?: Observable<Array<RespondMessage>>;
  messages: RespondMessage[] = [];
  newMessage: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute,
    private token: StorageService
  ) { }

  ngOnInit(): void {
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
      this.messages = mesg; // Add sorted messages to the messages array

      console.log("Here", mesg);
    });
  }

  public sendMessage(): void {
    let getUserToken = this.token.getUser();
    let getUserId: any = jwtDecode(getUserToken);
    let accountId = getUserId.accountId;

    let message = {
      'sender': accountId,
      'content': this.newMessage
    };

    this.stompClient.publish({
      destination: '/app/chat/' + this.ticketId,
      body: JSON.stringify(message)
    });

    this.newMessage = "";
  }

  navigateToDestination(): void {
    this.router.navigate(['/employee-tickets']);
  }

  onFileSelected(event: any): void {
    const selectedFile = event.target.files[0];
    // Handle the selected file
  }
}

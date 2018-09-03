var RFIDHeaders = (function () {
    function RFIDHeaders() {
    }
    return RFIDHeaders;
}());
RFIDHeaders.INCOMING_INVOICE_START = 1;
RFIDHeaders.INCOMING_INVOICE_FOLLOWUP = 2;
RFIDHeaders.SIGNED_PACKET_REQUEST = 3;
RFIDHeaders.ACCOUNT_REQUEST = 4;
RFIDHeaders.FINAL_RESULT_HEADER = 6;
RFIDHeaders.SEND_AGAIN = 17;
RFIDHeaders.SIGNED_PACKET_RECEIVED_OK = 19;
RFIDHeaders["__class"] = "RFIDHeaders";

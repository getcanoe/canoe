var SAMPLE_LOYALTY_CARD_AID = 'F2A731D87C';
var SELECT_APDU_HEADER = '00A40400';
var SELECT_OK_SW = '9000';
var UNKNOWN_CMD_SW = '0000';
var SELECT_APDU = buildSelectApdu(SAMPLE_LOYALTY_CARD_AID);
var precomputedWork = null; // This currently possible but not necessary. The pos uses a backend for POW now anyway.
var invoiceLength = 0;
var invoiceArray = null;
var invoiceArrayCurrentIndex = 0;
var invoiceStartIndex = 3;
var invoice = null;

function arraysEqual(_arr1, _arr2) {

    if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
      return false;

    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();

    for (var i = 0; i < arr1.length; i++) {

        if (arr1[i] !== arr2[i])
            return false;

    }
    return true;
}

function isMessage(inByte) {
    if (inByte[1] === (202 | 0))
        return true;
    else
        return false;
}

function getMessageBytes(inByte) {
	try
	{
        return inByte.slice(5, inByte.length);
    }
    catch(err)
	{
		return null;
	}
}

function intToByteArray(value) {
        return [((value >> 8) | 0), (value | 0)];
    }
    

function toPaddedHexString(i) {
    return ("00" + i.toString(16)).substr(-2);
}

function buildSelectApdu(aid) {
    // Format: [CLASS | INSTRUCTION | PARAMETER 1 | PARAMETER 2 | LENGTH | DATA]
    var aidByteLength = toPaddedHexString(aid.length / 2);
    var data = SELECT_APDU_HEADER + aidByteLength + aid;
    return data.toLowerCase();
}

    /*
     * Stores the current invoice data in the variable invoice, also passes on a message to the MainActivity to display the invoice
     */
function createInvoice()
{
    invoice = new RFIDInvoiceData(invoiceArray);
    var localCurrAmountFormatted = parseFloat(invoice.getLocalCurrencyAmount()).toFixed(2);
    console.log("RFID: Created RFID Invoice");
   	if(window.rfid_invoice_created==true)
   	{
   		if(window.global_state === undefined || window.global_state == null)
   		{
   			// Should never happen
   			console.log("RFID: Critical bug, window.global_state was undefined in createInvoice.");
   		}
	    // See comment on showRFIDStatusView
	    if(window.rfid_invoice_controller_scope==null)
   			window.global_state.go('rfid-invoice');	
	    else	
	    	window.rfid_invoice_controller_scope.updateView();
   	}
}

function showRFIDStatusView(headline, message)
{
    console.log("RFID: Show "+headline+" / " + message);
    window.rfid_status_headline = headline;
    window.rfid_status_message = message;

   	if(window.global_state === undefined || window.global_state == null)
   	{
   		// Should never happen
   		console.log("RFID: Critical bug, window.global_state was undefined in showRFIDStatusView.");
   	}

    // Sooo... the view is cached and the 2nd update wouldn't work normally. So instead I call updateView where the values are set again (redundantly perhaps) and then $scope.apply() happens necessarily.
    if(window.rfid_status_controller_scope==null)
    	window.global_state.go('rfid-status');
	else
    	window.rfid_status_controller_scope.updateView();

}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
        // register to receive APDU commands
	    hce.registerCommandCallback(app.onCommand);

        // register to for deactivated callback
        hce.registerDeactivatedCallback(app.onDeactivated);

        //console.log("onDeviceReady");
        app.okCommand = hce.util.hexStringToByteArray(SELECT_OK_SW);
        app.unknownCommand = hce.util.hexStringToByteArray(UNKNOWN_CMD_SW);
    },
    // onCommand is called when an APDU command is received from the HCE reader
    // if the select apdu command is received, the loyalty card data is returned to the reader
    // otherwise unknown command is returned
    onCommand: function(command)
    {
        //console.log(command);
        var commandAsBytes = new Uint8Array(command);
        var commandAsString = hce.util.byteArrayToHexString(commandAsBytes);

        //alert(commandAsString);
        //console.log('received command ' + commandAsString);
        //console.log('expecting        ' + SELECT_APDU);
	
        var returnBytes = null;
	
        if(window.rfid_wallet_locked)
        {
        	console.log("RFID: It's locked! Return.");
		    hce.sendResponse(app.okCommand);
		    return;        
        }

        if (SELECT_APDU === commandAsString)
        {
        	console.log("RFID: It's the SELECT_APDU, okCommand length = " + app.okCommand.length);
		    hce.sendResponse(app.okCommand);
		    return;        
		}		     
	    else
	    {
        	console.log("RFID: It's NOT the SELECT_APDU");
            if(isMessage(commandAsBytes))
	        {
	            var messageBytes = getMessageBytes(commandAsBytes);
	            //console.log("isMessage!! commandAsBytes.length="+commandAsBytes.length+", messageBytes.length="+messageBytes.length);
	        }
           // console.log("messageBytes[0] = " + messageBytes[0]);
	        
	        if (messageBytes == null || messageBytes.length == 0 || arraysEqual(commandAsBytes, SELECT_APDU))
	        {
	        	console.log("RFID: No message, just return ok");
				hce.sendResponse(app.okCommand);
				return;
			}           
            else
            {            

	            if (messageBytes[0] === RFIDHeaders.INCOMING_INVOICE_START)
	            {
	        		console.log("RFID: INCOMING_INVOICE_START");
			        returnBytes = incomingInvoiceStart(messageBytes);
			    }
			    else if (messageBytes[0] === RFIDHeaders.INCOMING_INVOICE_FOLLOWUP)
			    {
	        		console.log("RFID: INCOMING_INVOICE_FOLLOWUP");
			        returnBytes = incomingInvoiceFollowup(messageBytes);
			    }
			    else if (messageBytes[0] === RFIDHeaders.SIGNED_PACKET_RECEIVED_OK)
			    {
	        		console.log("RFID: SIGNED_PACKET_RECEIVED_OK");
			        showRFIDStatusView("Success", "You have authorized the payment");
			    }
			    else if (messageBytes[0] === RFIDHeaders.FINAL_RESULT_HEADER)
			    {
	        		console.log("RFID: FINAL_RESULT_HEADER");
			        processFinalResult(messageBytes);
			    }
			    else if (messageBytes[0] === RFIDHeaders.SIGNED_PACKET_REQUEST)
			    {
	        		console.log("RFID: SIGNED_PACKET_REQUEST");
			        returnBytes = processSignedPacketRequest();
			    }
			    else if (messageBytes[0] === RFIDHeaders.ACCOUNT_REQUEST)
			    {
	        		console.log("RFID: ACCOUNT_REQUEST");
	                if(window.global_current_sk == null || window.global_current_account == null || window.global_current_balance == null)
	                {
	                	returnBytes = app.okCommand;
	                	// No account data should afaik only happen if no wallet is initialised. This happens on the welcome screen if no seed is set. 
	                	// I think it's best just to return ok and do nothing.
		            }
			        else
			        {
					    returnBytes = processAccountRequest();
					}
		        }
				else 
				{					
				    console.log('RFID: UNKNOWN CMD SW');
				    hce.sendResponse(app.okCommand);
				    return;
				}
		    }
		}

		if(returnBytes==null)
			returnBytes = app.okCommand;
		else
		{
	       // console.log("before sendResponse "+returnBytes);
	        returnBytes = transformForPlugin(returnBytes);
	       // console.log("final form "+returnBytes);	        
		   // console.log("+#+#+ returnBytes.length = " + returnBytes.length);
		}
        hce.sendResponse(returnBytes);
	},
    onDeactivated: function(reason) {
        console.log('Deactivated ' + reason);
    }
};

// The hce plugin insists on a format that goes {"0":144,"1":0}, while the arrays I make look like [144,0,3,7] ... so here we go  
function transformForPlugin(input)
{	
	//console.log("input = " + input);
	if(input[0]!="{")
	{
		var returnString = "{";
		for(var i=0; i<input.length; i++)
		{

			if(i>0)
				returnString+=",";
			returnString+="\""+i+"\":"+input[i];
		}
		returnString+="}";
		return returnString;
	}
	else
	{
		return input;
	}
}

function resetRFIDVars()
{
	console.log("RFID: resetRFIDVars");

    // But I reset the current signature and the invoice data, that will do
    window.rfid_block_sign = null;

    window.rfid_invoice_storename_value = null;
    window.rfid_invoice_amount_nano = null;
    window.rfid_invoice_local_curr = null;
    window.rfid_invoice_local_curr_amount = null;
    window.rfid_invoice_exchange_rate = null;

    window.rfid_status_controller_scope = null;
    window.rfid_invoice_controller_scope = null;
}

function processAccountRequest()
{
	//console.log("processAccountRequest");
    var replyBytes = null;
    invoice = null;
    resetRFIDVars();
    //console.log("Respond with account "+window.global_current_account);
    var pubKey = hce.util.hexStringToByteArray(keyFromAccount(window.global_current_account));
    var preCompWorkBytes = null;
    var arrayLength = 1 + pubKey.length;
    
    if (this.precomputedWork != null && this.precomputedWork.length === 16) {
        arrayLength += 8;
        preCompWorkBytes = hce.util.hexStringToByteArray(precomputedWork);
    }
    
    replyBytes = new Array();
    replyBytes[0] = RFIDHeaders.ACCOUNT_REQUEST;
    replyBytes = arraycopy(pubKey, 0, replyBytes, 1, pubKey.length);
    
    if (preCompWorkBytes != null) 
    {
        replyBytes = arraycopy(pubKey, 0, replyBytes, 1, pubKey.length);
    }
    return replyBytes;
}

/*
 * Return signature for payment or null if not signed 
 */
function processSignedPacketRequest() 
{
    if (window.rfid_block_sign != null) 
    {
    	console.log("RFID: Return signature for pos");
        return window.rfid_block_sign;
    }
    else
    {
    	console.log("RFID: No signature, return null");
	    return null;
	}
}

/*
 * Final result that the app gets from the pos, so a last status update
 */
function processFinalResult(messageBytes) 
{
	var statusHeadline = "";
	var statusText = "";
	try
	{
		//console.log("processFinalResult");
	    var messageLength = parseInt(messageBytes[1]);
	    //console.log("messageLength = "+messageLength);
	    //console.log("messageBytes.length - 2 = " + (messageBytes.length - 2));
	    if (messageLength === messageBytes.length - 2) 
	    {
	    	//console.log("length ok");
	        var finalResultBytes = new Array();
	        finalResultBytes = arraycopy(messageBytes, 2, finalResultBytes, 0, messageLength);
	        var finalResult = bin2String(finalResultBytes);
	        console.log("RFID: finalResult = " + finalResult);
	        var resultArr = finalResult.split(":");
	        console.log("RFID: resultArr[0] = " + resultArr[0]);
	        if(resultArr[0]=="b")
	        {
	        	//console.log("+++ in 312");
	            statusHeadline = "New Balance";
	            //console.log("+++ 314");
				statusText = turnRAWAmountIntoNANO(resultArr[1])+" Nano";
			} 
			else if(resultArr[0]=="e")
			{
	        	//console.log("+++ in 316");
	            statusHeadline = "Error";
				statusText = resultArr[1];
			} else
			{
	        	//console.log("+++ in 322");
				statusHeadline = "Malformed reply";
				statusText = "Your payment was likely accepted anyway.";
	        }
	    } 
	    else 
	    {
	       	//console.log("+++ in 327");
			statusHeadline = "No reply";
			statusText = "Your payment was likely accepted anyway.";
	    }
	}
	catch(err)
	{
		statusHeadline = "Malformed reply";
		statusText = "Your payment was likely accepted anyway.";
	}
    showRFIDStatusView(statusHeadline, statusText);
}

function turnRAWAmountIntoNANO(amount) 
{
    if (amount.length < 30) 
    {
        while ((amount.length < 30)) 
        {
            amount = "0" + amount;
        };
        amount = "0." + amount;
        return amount;
    }
    else 
    {
        if (amount.length === 30) 
        {
            amount = "0." + amount;
            return amount;
        }
        else if (amount.length > 30) 
        {
            var startIndex = amount.length - 30;
            amount = amount.substring(0, startIndex) + "." + amount.substring(startIndex);
            return amount;
        }
    }
    return "Error converting";
}

function incomingInvoiceStart(messageBytes) {
		//console.log("++ incomingInvoiceStart ++");
        invoiceLength = ((messageBytes[1] & 255) << 8) | (messageBytes[2] & 255);
        //console.log("invoiceLength = " + invoiceLength);
        invoiceArray = new Array();	
        invoiceArrayCurrentIndex = 0;
        //invoiceStartIndex = 0;
        var bytesToCopyFromThisArray = 255 - invoiceStartIndex;
        if (invoiceLength < bytesToCopyFromThisArray)
            bytesToCopyFromThisArray = invoiceLength;
        invoiceArray = arraycopy(messageBytes, invoiceStartIndex, invoiceArray, 0, bytesToCopyFromThisArray);
        invoiceArrayCurrentIndex += bytesToCopyFromThisArray;
        if (invoiceArray.length === invoiceLength) 
        {
	        createInvoice();
        }
        //console.log("return "+messageBytes.length);
        return intToByteArray(messageBytes.length);
    };

app.initialize();